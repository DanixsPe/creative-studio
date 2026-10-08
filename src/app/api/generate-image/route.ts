import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type RequestBody = {
  brandId: string;
  brandName: string;
  brandDescription?: string | null;
  designType: "social" | "carousel" | "branding";
  prompt: string;
  title: string;
  hook: string;
  body: string;
  cta: string;
  visualDirection: string;
  imagePrompt: string;
  resourcePaths?: string[];
  inspirationPaths?: string[];
};

function extractImageUrl(text: string): string | null {
  const markdown = text.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/i);
  if (markdown?.[1]) return markdown[1];
  const url = text.match(/https?:\/\/[^\s)]+/i);
  return url?.[0] ? url[0].replace(/[)\],.]+$/g, "") : null;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;
  const pollinationsKey = process.env.POLLINATIONS_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Supabase no está configurado en este deployment." },
      { status: 500 }
    );
  }

  if (!pollinationsKey) {
    return NextResponse.json(
      {
        error:
          "Falta POLLINATIONS_API_KEY en Vercel. La generación de imágenes necesita una clave de Pollinations."
      },
      { status: 503 }
    );
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {}
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

  if (!body.brandId || !body.brandName || !body.imagePrompt) {
    return NextResponse.json(
      { error: "Faltan datos para generar la pieza visual." },
      { status: 400 }
    );
  }

  const referencePaths = [
    ...(body.resourcePaths ?? []),
    ...(body.inspirationPaths ?? [])
  ].filter(Boolean).slice(0, 10);

  const referenceParts: Array<{
    type: "text" | "image_url";
    text?: string;
    image_url?: { url: string };
  }> = [];

  referenceParts.push({
    type: "text",
    text: `Genera una pieza publicitaria terminada para la marca "${body.brandName}".
Descripción de marca: ${body.brandDescription || "sin descripción"}.

Concepto de la pieza:
${body.title}

Hook:
${body.hook}

Copy:
${body.body}

CTA:
${body.cta}

Dirección visual:
${body.visualDirection}

Prompt visual:
${body.imagePrompt}

Tipo:
${body.designType}

REQUISITOS DE DISEÑO:
- Crea una imagen publicitaria lista para publicar, no un moodboard ni un boceto.
- Formato vertical 4:5 para social media.
- Composición profesional de agencia publicitaria.
- Usa las imágenes de referencia como guía de producto, marca, estilo o composición cuando estén disponibles.
- Mantén la identidad visual de la marca y evita mezclarla con otras marcas.
- Cuando el recurso incluya un producto, respeta su forma, colores y detalles.
- Integra de manera limpia el headline y CTA del concepto cuando sea adecuado para un anuncio.
- No inventes precios, descuentos, teléfonos, URLs, características ni promociones.
- Evita texto ilegible, deformado o excesivo.
- El resultado debe parecer un anuncio final de alta gama, no una imagen genérica de IA.
- No coloques marcas de agua adicionales.`
  });

  for (const path of referencePaths) {
    const { data } = await supabase.storage
      .from("brand-assets")
      .createSignedUrl(path, 1800);

    if (data?.signedUrl) {
      referenceParts.push({
        type: "image_url",
        image_url: { url: data.signedUrl }
      });
    }
  }

  const model =
    process.env.POLLINATIONS_IMAGE_MODEL?.trim() ||
    "google/gemini-3.1-flash-image";

  try {
    const response = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pollinationsKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: referenceParts
          }
        ],
        stream: false
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json(
        {
          error: `Pollinations devolvió ${response.status}: ${details.slice(
            0,
            800
          )}`
        },
        { status: 502 }
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const content = payload.choices?.[0]?.message?.content || "";
    const externalImageUrl = extractImageUrl(content);

    if (!externalImageUrl) {
      return NextResponse.json(
        {
          error:
            "El proveedor terminó la generación pero no devolvió una URL de imagen.",
          providerResponse: content.slice(0, 800)
        },
        { status: 502 }
      );
    }

    const imageResponse = await fetch(externalImageUrl, { cache: "no-store" });
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: "No se pudo descargar la imagen generada." },
        { status: 502 }
      );
    }

    const imageBytes = await imageResponse.arrayBuffer();
    const contentType =
      imageResponse.headers.get("content-type") || "image/png";
    const extension = contentType.includes("jpeg") || contentType.includes("jpg")
      ? "jpg"
      : contentType.includes("webp")
        ? "webp"
        : "png";

    const path = `${auth.user.id}/${body.brandId}/generated/${crypto.randomUUID()}.${extension}`;

    const upload = await supabase.storage
      .from("brand-assets")
      .upload(path, imageBytes, {
        contentType,
        upsert: false
      });

    if (upload.error) {
      return NextResponse.json(
        { error: `No se pudo guardar la imagen en Supabase: ${upload.error.message}` },
        { status: 502 }
      );
    }

    const signed = await supabase.storage
      .from("brand-assets")
      .createSignedUrl(path, 3600);

    if (!signed.data?.signedUrl) {
      return NextResponse.json(
        { error: "La imagen se guardó, pero no se pudo generar su URL de vista previa." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      imageUrl: signed.data.signedUrl,
      imagePath: path,
      model
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
