import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestBody = { brandId?: string };

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase no está configurado." }, { status: 500 });
  }
  if (!geminiKey) {
    return NextResponse.json({ error: "Falta GEMINI_API_KEY en Vercel." }, { status: 503 });
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {}
      }
    }
  });

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  if (!body.brandId) return NextResponse.json({ error: "Falta seleccionar una marca." }, { status: 400 });

  const [{ data: brand, error: brandError }, { data: inspirationRows, error: inspirationError }] = await Promise.all([
    supabase.from("brands").select("id,name,description").eq("id", body.brandId).eq("user_id", auth.user.id).single(),
    supabase.from("inspirations").select("id,title,url").eq("brand_id", body.brandId).eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(6)
  ]);

  if (brandError || !brand) return NextResponse.json({ error: "No se encontró esa marca en tu cuenta." }, { status: 404 });
  if (inspirationError) return NextResponse.json({ error: inspirationError.message }, { status: 500 });
  if (!inspirationRows?.length) return NextResponse.json({ error: "Sube primero imágenes en Inspiración para esta marca." }, { status: 400 });

  const parts: Array<Record<string, unknown>> = [{
    text: `Analiza las imágenes de inspiración de la marca "${brand.name}" (${brand.description || "sin descripción"}).
No estás entrenando los pesos de un modelo. Debes crear un manual visual de marca persistente para que un generador de imágenes lo siga en futuras campañas.
Extrae únicamente rasgos que se puedan observar en las referencias; no inventes datos comerciales.

Devuelve un manual compacto en español con estas secciones:
1. ADN visual de la marca (máximo 3 frases).
2. Paleta: colores dominantes y acentos descritos con nombres y, solo si son estimables, hex aproximados.
3. Fotografía e iluminación.
4. Composición, jerarquía, espacio negativo y encuadres.
5. Materiales, texturas y tratamiento del fondo.
6. Tipografía y tratamiento gráfico (sin transcribir textos promocionales de referencia).
7. Reglas de consistencia que SIEMPRE seguir.
8. Errores que EVITAR.

Máximo 1800 caracteres. Prioriza un estilo consistente que se pueda aplicar a nuevos productos sin copiar literalmente un anuncio concreto.`
  }];

  let analyzed = 0;
  for (const inspiration of inspirationRows) {
    try {
      const { data: signed } = await supabase.storage.from("brand-assets").createSignedUrl(inspiration.url, 300);
      if (!signed?.signedUrl) continue;
      const response = await fetch(signed.signedUrl, { cache: "no-store" });
      if (!response.ok) continue;
      const type = response.headers.get("content-type") || "";
      if (!type.startsWith("image/")) continue;
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length || bytes.length > 15 * 1024 * 1024) continue;
      const compact = await sharp(bytes).rotate().resize(768, 768, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 78 }).toBuffer();
      parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: compact.toString("base64")
        }
      });
      analyzed += 1;
    } catch {
      // Ignore one unreadable reference and try the remaining brand inspirations.
    }
  }

  if (!analyzed) {
    return NextResponse.json({ error: "No pude leer las imágenes. Verifica que las referencias sean imágenes válidas." }, { status: 400 });
  }

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { maxOutputTokens: 1800 }
      }),
      cache: "no-store"
    });

    const raw = await response.text();
    let payload: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } };
    try {
      payload = JSON.parse(raw) as typeof payload;
    } catch {
      return NextResponse.json({ error: `Gemini devolvió una respuesta no válida: ${raw.slice(0, 300)}` }, { status: 502 });
    }
    if (!response.ok) {
      return NextResponse.json({ error: `Gemini devolvió ${response.status}: ${payload.error?.message || raw.slice(0, 400)}` }, { status: 502 });
    }

    const styleProfile = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim();
    if (!styleProfile) return NextResponse.json({ error: "Gemini no produjo un manual visual." }, { status: 502 });

    const { error: saveError } = await supabase.from("brand_style_profiles").upsert({
      brand_id: brand.id,
      user_id: auth.user.id,
      style_profile: styleProfile.slice(0, 6000),
      source_count: analyzed,
      updated_at: new Date().toISOString()
    }, { onConflict: "brand_id" });

    if (saveError) return NextResponse.json({ error: `No se pudo guardar el estilo de marca: ${saveError.message}` }, { status: 500 });

    return NextResponse.json({ styleProfile, sourceCount: analyzed, brandName: brand.name, model: "gemini-3.5-flash-lite" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: `No se pudo analizar la inspiración: ${message}` }, { status: 500 });
  }
}
