import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/?auth=error", requestUrl.origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(new URL("/?auth=missing-config", requestUrl.origin));
  }

  const cookieStore = await cookies();
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

  const legalConsentCookie = cookieStore.get("creative_studio_legal_consent")?.value;
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (!error && legalConsentCookie === "2026-10-10-v1") {
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const { error: acceptanceError } = await supabase.from("legal_acceptances").insert({
        user_id: auth.user.id,
        terms_version: "2026-10-10-v1",
        privacy_version: "2026-10-10-v1",
        data_processing_consent: true
      });

      // If this insert fails, the app asks the authenticated user to accept again
      // and records the acceptance through the client-side gate.
      if (!acceptanceError) {
        try {
          cookieStore.set("creative_studio_legal_consent", "", {
            path: "/",
            maxAge: 0,
            sameSite: "lax",
            secure: true
          });
        } catch {}
      }
    }
  }

  return NextResponse.redirect(
    new URL(error ? "/?auth=error" : "/", requestUrl.origin)
  );
}
