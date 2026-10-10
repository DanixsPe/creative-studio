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
export const runtime = "nodejs";
export const maxDuration = 60;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(value: string, maxChars: number, maxLines: number): string[] {
  const words = value.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) break;
    } else {
      line = next;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (words.length && lines.length === maxLines && lines.join(" ").length < words.join(" ").length) {
    lines[lines.length - 1] = lines[lines.length - 1].replace(/[.,;:]?$/, "…");
  }
  return lines;
}

function posterOverlay(brandName: string, title: string, hook: string, body: string, cta: string): Buffer {
  const brand = escapeXml(brandName.toLocaleUpperCase().slice(0, 36));
  const titleLines = wrapText(title || brandName, 32, 1);
  const hookLines = wrapText(hook || title, 32, 3);
  const bodyLines = wrapText(body, 57, 2);
  const ctaLines = wrapText(cta || "Descubre más", 36, 1);
  const titleText = titleLines.map((line, index) => `<tspan x="64" dy="${index === 0 ? 0 : 38}">${escapeXml(line)}</tspan>`).join("");
  const hookText = hookLines.map((line, index) => `<tspan x="64" dy="${index === 0 ? 0 : 52}">${escapeXml(line)}</tspan>`).join("");
  const bodyText = bodyLines.map((line, index) => `<tspan x="64" dy="${index === 0 ? 0 : 30}">${escapeXml(line)}</tspan>`).join("");
  const ctaText = ctaLines.map((line, index) => `<tspan x="512" dy="${index === 0 ? 0 : 26}">${escapeXml(line)}</tspan>`).join("");

  const svg = `<svg width="1024" height="1280" viewBox="0 0 1024 1280" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="topShade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#050608" stop-opacity="0.92"/>
        <stop offset="72%" stop-color="#050608" stop-opacity="0.60"/>
        <stop offset="100%" stop-color="#050608" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="bottomShade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#050608" stop-opacity="0"/>
        <stop offset="24%" stop-color="#050608" stop-opacity="0.70"/>
        <stop offset="100%" stop-color="#050608" stop-opacity="0.96"/>
      </linearGradient>
    </defs>
    <rect width="1024" height="490" fill="url(#topShade)"/>
    <rect y="835" width="1024" height="445" fill="url(#bottomShade)"/>
    <text x="64" y="83" fill="#d8c7ff" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" letter-spacing="4">${brand}</text>
    <text x="64" y="132" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="600">${titleText}</text>
    <text x="64" y="199" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="43" font-weight="700">${hookText}</text>
    <text x="64" y="1050" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="400">${bodyText}</text>
    <rect x="64" y="1120" width="896" height="88" rx="18" fill="#e5d9ff"/>
    <text x="512" y="1172" fill="#101015" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="700">${ctaText}</text>
  </svg>`;
  return Buffer.from(svg);
}

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
  const { data: styleRow } = await supabase
    .from("brand_style_profiles")
    .select("style_profile")
    .eq("brand_id", body.brandId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  const savedStyleProfile = styleRow?.style_profile || "No hay un manual visual guardado; sigue fielmente las imágenes de inspiración adjuntas.";

  // Keep brand inspirations first (style), then attach at most one product image
  // for this individual post. FLUX.2 Klein supports up to four reference images.
  const inspirationPaths = (body.inspirationPaths ?? [])
    .filter((path) => typeof path === "string" && path.length > 0)
    .slice(0, 3);
  const resourcePaths = (body.resourcePaths ?? [])
    .filter((path) => typeof path === "string" && path.length > 0)
    .slice(0, 1);
  const referencePaths = [...inspirationPaths, ...resourcePaths];

  const form = new FormData();
  const promptText = `Create ONLY the photographic/artwork background for a finished social-media advertisement for "${body.brandName}". Do NOT draw any text, letters, numbers, logos, watermarks, UI elements, or fake typography. Correct typography will be added afterwards by the app, so leave deliberate clean negative space at the top and bottom.
Brand description: ${body.brandDescription || "not specified"}.
Concept: ${body.title}
Planned headline: ${body.hook}
Planned copy: ${body.body}
Planned CTA: ${body.cta}
Art direction: ${body.visualDirection}
Visual prompt: ${body.imagePrompt}
Saved brand-specific visual style profile:
${savedStyleProfile}
Format: vertical 4:5 social media advertising artwork, 1024x1280.

REFERENCE ORDER:
- Reference images are supplied with this brand's inspiration images first, then the product photo assigned to this specific post (if available).
- Use inspiration images to keep palette, lighting, textures, framing, and art direction consistent with the saved visual style profile, without copying an exact ad layout.
- If the last reference is a product photo, use that exact product as the main subject. Preserve its visible shape, proportions, color, dial/details, materials, and silhouette. Do not replace it with another product.

ARTWORK REQUIREMENTS:
- Premium advertising-agency photography and materials, deliberate composition and controlled light.
- Keep the product fully visible, sharp, plausible and undistorted; avoid cropped watches, extra hands, duplicated parts, melted details, blurred dial, distorted crown or straps.
- Keep the top 30% and bottom 28% visually quiet/dark enough for later typography overlays.
- Never add typography; never invent prices, discounts, phone numbers, URLs, features, or promotions.
- No watermark, extra logos, malformed objects, or generic template look.
- Generate an art-directed background image, not the final typography layer.`;

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

    const rawImageBytes = Buffer.from(base64Image, "base64");
    const overlay = posterOverlay(body.brandName, body.title, body.hook, body.body, body.cta);
    const imageBytes = await sharp(rawImageBytes)
      .resize(1024, 1280, { fit: "cover" })
      .composite([{ input: overlay, top: 0, left: 0 }])
      .jpeg({ quality: 92, mozjpeg: true })
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
