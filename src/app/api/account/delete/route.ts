import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

async function collectFiles(
  admin: ReturnType<typeof createClient>,
  prefix: string,
  depth = 0
): Promise<string[]> {
  if (depth > 6) return [];
  const output: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await admin.storage
      .from("brand-assets")
      .list(prefix, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });

    if (error) throw new Error(`No se pudieron revisar los archivos de la cuenta: ${error.message}`);
    const entries = data ?? [];
    for (const entry of entries) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id === null) {
        output.push(...await collectFiles(admin, path, depth + 1));
      } else {
        output.push(path);
      }
    }
    if (entries.length < 100) break;
    offset += entries.length;
  }
  return output;
}

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !publishableKey) {
    return NextResponse.json({ error: "Supabase no está configurado." }, { status: 500 });
  }
  if (!serviceRoleKey) {
    return NextResponse.json({
      error: "La eliminación de cuenta no está habilitada todavía: falta la clave administrativa del servidor en Vercel."
    }, { status: 503 });
  }

  const cookieStore = await cookies();
  const sessionClient = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {}
      }
    }
  });
  const { data: auth, error: authError } = await sessionClient.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: "Tu sesión ha expirado. Inicia sesión de nuevo." }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // Remove the authenticated user's stored assets before deleting the account.
    const files = await collectFiles(admin, auth.user.id);
    for (let i = 0; i < files.length; i += 100) {
      const { error } = await admin.storage.from("brand-assets").remove(files.slice(i, i + 100));
      if (error) {
        return NextResponse.json({ error: `No se pudieron eliminar todos los archivos: ${error.message}. La cuenta no se ha eliminado.` }, { status: 502 });
      }
    }

    // Foreign-key cascades remove profile, brands, projects, history, feedback, preferences and legal acceptance rows.
    const { error: deleteError } = await admin.auth.admin.deleteUser(auth.user.id);
    if (deleteError) {
      return NextResponse.json({ error: `No se pudo eliminar la cuenta: ${deleteError.message}` }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
