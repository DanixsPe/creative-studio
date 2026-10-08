import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type RequestBody = {
  brandName: string;
  brandDescription?: string | null;
  prompt: string;
  designType: "social" | "carousel" | "branding";
  quantity: number;
  resources?: string[];
  inspirations?: string[];
};

type GeneratedItem = {
  position: number;
  title: string;
  hook: string;
  body: string;
  cta: string;
  visual_direction: string;
  image_prompt: string;
};

const allowedQuantities = new Set([4, 6, 9, 12, 24]);

function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^\```json\s*/i, "").replace(/^\```\s*/i, "").replace(/\s*\```$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    const objectStart = cleaned.indexOf("{");
    const objectEnd = cleaned.lastIndexOf("}");
    if (objectStart >= 0 && objectEnd > objectStart) {
      return JSON.parse(cleaned.slice(objectStart, objectEnd + 1));
    }
    throw new Error("La IA devolvió una respuesta que no se pudo interpretar como JSON.");
  }
}

function normalizeItems(value: unknown, quantity: number): GeneratedItem[] {
  const source = Array.isArray(value)
    ? value
    : typeof value === "object" && value !== null && "items" in value && Array.isArray((value as { items?: unknown }).items)
      ? (value as { items: unknown[] }).items
      : [];

  return source.slice(0, quantity).map((item, index) => {
    const row = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
    return {
      position: index + 1,
      title: String(row.title ?? `Concepto ${index + 1}`),
      hook: String(row.hook ?? ""),
      body: String(row.body ?? ""),
      cta: String(row.cta ?? ""),
      visual_direction: String(row.visual_direction ?? ""),
      image_prompt: String(row.image_prompt ?? "")
    };
  });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;
  const hfToken = process.env.HF_TOKEN;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase no está configurado en este deployment." }, { status: 500 });
  }

  if (!hfToken) {
    return NextResponse.json(
      { error: "Falta HF_TOKEN en Vercel. Conecta un token de Hugging Face con permiso de Inference Providers." },
      { status: 503 }
    );
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookieStore.set(name, value, options);
          } catch {}
        });
      }
    }
  });

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const quantity = Number(body.quantity);
  if (!body.brandName || !body.prompt || !allowedQuantities.has(quantity)) {
    return NextResponse.json({ error: "Faltan datos de generación válidos." }, { status: 400 });
  }

  const configuredModel = process.env.HF_MODEL?.trim() || "";
  const preferredModels = [
    "Qwen/Qwen2.5-7B-Instruct",
    "Qwen/Qwen2.5-7B-Instruct-1M",
    "google/gemma-2-2b-it",
    "Qwen/Qwen3-4B-Thinking-2507"
  ];

  const system = `Eres el director creativo y estratega de contenido de Creative Studio.
Generas conceptos publicitarios en español para una sola marca a la vez.
Debes respetar la identidad de la marca y nunca mezclarla con otra.

Devuelve SOLO JSON válido, sin markdown ni comentarios.
El JSON debe ser un array con exactamente la cantidad solicitada de objetos.
Cada objeto debe tener exactamente estas claves:
position, title, hook, body, cta, visual_direction, image_prompt.

Reglas:
- title: nombre corto de la pieza.
- hook: gancho principal.
- body: copy breve y usable en una publicación.
- cta: llamada a la acción.
- visual_direction: dirección artística concreta para un diseñador.
- image_prompt: prompt visual detallado para generar la imagen, sin texto incrustado.
- Para Carrusel, cada concepto debe asumir coherencia narrativa y visual entre slides.
- Para Branding, enfócate en identidad visual, concepto, sistema y aplicaciones.
- No inventes promociones, precios, datos o características que la marca no haya proporcionado.`;

  const userPrompt = `Marca: ${body.brandName}
Descripción: ${body.brandDescription || "Sin descripción"}

Tipo: ${body.designType}
Cantidad: ${quantity}

Solicitud del usuario:
${body.prompt}

Recursos de marca disponibles:
${(body.resources ?? []).join(", ") || "Ninguno indicado"}

Inspiraciones disponibles:
${(body.inspirations ?? []).join(", ") || "Ninguna indicada"}

Genera exactamente ${quantity} conceptos distintos pero coherentes.`;

  try {
    let model = "";

    // Discover what this Hugging Face token can actually use.
    const modelsResponse = await fetch("https://router.huggingface.co/v1/models", {
      headers: { Authorization: `Bearer ${hfToken}` },
      cache: "no-store"
    });

    let available: Array<{
      id?: string;
      providers?: Array<{
        status?: string;
        is_free?: boolean;
        pricing?: { input?: number; output?: number };
      }>;
    }> = [];

    if (modelsResponse.ok) {
      const modelsPayload = (await modelsResponse.json()) as {
        data?: Array<{
          id?: string;
          providers?: Array<{
            status?: string;
            is_free?: boolean;
            pricing?: { input?: number; output?: number };
          }>;
        }>;
      };
      available = modelsPayload.data ?? [];
    }

    const configuredBase = configuredModel.replace(/:.*$/, "");
    const configured = configuredBase
      ? available.find((item) => item.id === configuredBase)
      : undefined;

    if (
      configured?.id &&
      (configured.providers ?? []).some((provider) => provider.status === "live")
    ) {
      model = `${configured.id}:fastest`;
    } else {
      const ranked = preferredModels
        .map((id) => available.find((item) => item.id === id))
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      const freeModel = ranked.find((item) =>
        (item.providers ?? []).some(
          (provider) => provider.status === "live" && provider.is_free === true
        )
      );

      if (freeModel?.id) {
        model = `${freeModel.id}:fastest`;
      } else if (ranked[0]?.id) {
        model = `${ranked[0].id}:fastest`;
      }
    }

    if (!model) {
      model = "Qwen/Qwen2.5-7B-Instruct:fastest";
    }

    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: Math.min(7000, Math.max(1200, quantity * 420))
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json(
        { error: `Hugging Face devolvió ${response.status}: ${details.slice(0, 500)}` },
        { status: 502 }
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "La IA no devolvió contenido." }, { status: 502 });
    }

    const items = normalizeItems(extractJson(content), quantity);
    if (items.length !== quantity) {
      return NextResponse.json(
        { error: `La IA devolvió ${items.length} piezas y se solicitaron ${quantity}.` },
        { status: 502 }
      );
    }

    return NextResponse.json({ items, model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
