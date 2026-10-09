import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import sharp from "sharp";

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

const MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
export const maxDuration = 60;

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Supabase no está configurado en este deployment." },
      { status: 500 }
    );
  }

  if (!accountId || !apiToken) {
    return NextResponse.json(
      {
        error:
          "Falta configurar Cloudflare Workers AI. Añade CLOUDFLARE_ACCOUNT_ID y CLOUDFLARE_API_TOKEN en Vercel."
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

  // Each image only uses files belonging to the active brand and authenticated user.
  const referencePaths = [
    ...(body.resourcePaths ?? []),
    ...(body.inspirationPaths ?? [])
  ]
    .filter((path) => typeof path === "string" && path.length > 0)
    .slice(0, 8);

  const form = new FormData();
  const promptText = `Create a finished, professional advertising poster for the brand "${body.brandName}".
Brand description: ${body.brandDescription || "not specified"}.
Concept: ${body.title}
Headline / hook: ${body.hook}
Copy: ${body.body}
Call to action: ${body.cta}
Art direction: ${body.visualDirection}
Visual prompt: ${body.imagePrompt}
Format: vertical 4:5 social media advertisement.

ART DIRECTION REQUIREMENTS:
- Output a finished advertisement ready to publish, not a moodboard, wireframe, or draft.
- High-end advertising-agency composition, professional lighting, hierarchy, typography, spacing, and material detail.
- Use supplied reference images as product/brand/style guidance. The first references are brand resources; later references are inspiration examples.
- Preserve the physical appearance, color, product details, logo, and identity shown in the references. Do not combine different brands.
- Include the headline and CTA legibly when appropriate. Keep text concise and correctly spelled.
- Do not invent prices, discounts, phone numbers, URLs, features, or promotions.
- No watermark, extra logos, fake interface elements, or generic template look.
- Make this look like a designed advertising poster rather than an unformatted AI illustration.`;

  form.append("prompt", promptText.slice(0, 8000));
  form.append("width", "1024");
  form.append("height", "1280");
  form.append("seed", String(Math.floor(Math.random() * 2_000_000_000)));

  let referenceCount = 0;
  for (const path of referencePaths) {
    if (referenceCount >= 4) break;

    try {
      const { data: signed } = await supabase.storage
        .from("brand-assets")
        .createSignedUrl(path, 300);

      if (!signed?.signedUrl) continue;

      const sourceResponse = await fetch(signed.signedUrl, { cache: "no-store" });
      if (!sourceResponse.ok) continue;

      const sourceType = sourceResponse.headers.get("content-type") || "";
      if (!sourceType.startsWith("image/")) continue;

      const sourceBytes = Buffer.from(await sourceResponse.arrayBuffer());
      if (sourceBytes.length === 0 || sourceBytes.length > 15 * 1024 * 1024) continue;

      // FLUX.2 Klein accepts reference images smaller than 512x512.
      const resized = await sharp(sourceBytes)
        .rotate()
        .resize(480, 480, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer();

      form.append(
        `input_image_${referenceCount}`,
        new Blob([new Uint8Array(resized)], { type: "image/jpeg" }),
        `reference-${referenceCount + 1}.jpg`
      );
      referenceCount += 1;
    } catch {
      // Ignore a single broken reference and keep generating from the remaining ones.
    }
  }

  const endpoint =
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${MODEL}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`
      },
      body: form,
      cache: "no-store"
    });

    const raw = await response.text();
    let payload: {
      success?: boolean;
      result?: { image?: string };
      errors?: Array<{ message?: string; code?: number }>;
      messages?: Array<{ message?: string }>;
    };
    try {
      payload = JSON.parse(raw) as typeof payload;
    } catch {
      return NextResponse.json(
        { error: `Cloudflare devolvió una respuesta inválida: ${raw.slice(0, 400)}` },
        { status: 502 }
      );
    }

    if (!response.ok || payload.success === false) {
      const providerMessage =
        payload.errors?.map((error) => error.message).filter(Boolean).join("; ") ||
        payload.messages?.map((message) => message.message).filter(Boolean).join("; ") ||
        raw.slice(0, 500);

      const hint =
        response.status === 401 || response.status === 403
          ? " Revisa que el token tenga permisos Workers AI Read y Workers AI Edit."
          : response.status === 429
            ? " Has llegado a un límite temporal o a la asignación diaria gratuita de Workers AI."
            : "";

      return NextResponse.json(
        { error: `Cloudflare Workers AI devolvió ${response.status}: ${providerMessage}.${hint}` },
        { status: response.status === 401 ? 401 : 502 }
      );
    }

    const base64Image = payload.result?.image;
    if (!base64Image) {
      return NextResponse.json(
        { error: "Cloudflare respondió, pero no devolvió la imagen generada." },
        { status: 502 }
      );
    }

    const imageBytes = await sharp(Buffer.from(base64Image, "base64"))
      .jpeg({ quality: 92 })
      .toBuffer();
    const path = `${auth.user.id}/${body.brandId}/generated/${crypto.randomUUID()}.jpg`;

    const upload = await supabase.storage
      .from("brand-assets")
      .upload(path, imageBytes, {
        contentType: "image/jpeg",
        upsert: false
      });

    if (upload.error) {
      return NextResponse.json(
        { error: `No se pudo guardar la imagen en Supabase: ${upload.error.message}` },
        { status: 502 }
      );
    }

    const { data: preview, error: previewError } = await supabase.storage
      .from("brand-assets")
      .createSignedUrl(path, 3600);

    if (previewError || !preview?.signedUrl) {
      return NextResponse.json(
        { error: "La imagen se guardó, pero no se pudo crear la vista previa." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      imageUrl: preview.signedUrl,
      imagePath: path,
      model: MODEL,
      referencesUsed: referenceCount
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: `No se pudo generar la imagen: ${message}` },
      { status: 500 }
    );
  }
}
