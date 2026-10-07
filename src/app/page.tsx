"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type DesignType = "social" | "carousel" | "branding";
type View = "home" | "library" | "history" | "brands" | "inspiration" | "plugins";
type Brand = { id: string; name: string; description: string | null; logo_url: string | null };
type Asset = { id: string; name: string; type: string; url: string; created_at: string; signedUrl?: string | null };
type Inspiration = { id: string; title: string | null; url: string; created_at: string; signedUrl?: string | null };
type Generation = {
  id: string; brand_id: string; project_id: string | null; prompt: string | null;
  design_type: DesignType; quantity: number; status: string; created_at: string;
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

const NAV: Array<[View, string, string]> = [
  ["home", "Inicio", "⌂"], ["library", "Biblioteca", "▦"], ["history", "Historial", "◷"],
  ["brands", "Mis marcas", "◉"], ["inspiration", "Inspiración", "✦"], ["plugins", "Plugins IA", "⌘"]
];
const TYPES: Array<[DesignType, string]> = [["social", "Social Media"], ["carousel", "Carrusel"], ["branding", "Branding"]];
const COUNTS = [4, 6, 9, 12, 24];

const labelFor = (type: DesignType) => TYPES.find(([id]) => id === type)?.[1] ?? "Social Media";
const cleanName = (name: string) => name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-");

export default function HomePage() {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_CREATIVE_STUDIO_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_CREATIVE_STUDIO_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createSupabaseBrowserClient() : null;
  }, []);

  const [user, setUser] = useState<{ id: string; email?: string; name?: string } | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeId, setActiveId] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);
  const [history, setHistory] = useState<Generation[]>([]);
  const [view, setView] = useState<View>("home");
  const [prompt, setPrompt] = useState("");
  const [designType, setDesignType] = useState<DesignType>("social");
  const [count, setCount] = useState(6);
  const [menu, setMenu] = useState<"resources" | "type" | "count" | null>(null);
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [brandDescription, setBrandDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [generated, setGenerated] = useState<GeneratedItem[]>([]);
  const [uploadMode, setUploadMode] = useState<"resource" | "inspiration" | null>(null);
  const [booting, setBooting] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const active = brands.find((brand) => brand.id === activeId) ?? null;

  async function loadBrands(userId?: string) {
    if (!supabase) return;
    const { data, error } = await supabase.from("brands").select("id,name,description,logo_url").order("created_at");
    if (error) return setNotice(error.message);
    let rows = (data ?? []) as Brand[];
    const ownerId = userId ?? user?.id;
    if (!rows.length && ownerId) {
      const { data: seeded, error: seedError } = await supabase.from("brands").insert([
        { user_id: ownerId, name: "Noir Chronos", description: "Relojería premium" },
        { user_id: ownerId, name: "CrioRoss", description: "Alimentos frescos" }
      ]).select("id,name,description,logo_url");
      if (seedError) {
        setNotice(`No se pudieron crear las marcas iniciales: ${seedError.message}`);
        return;
      }
      rows = (seeded ?? []) as Brand[];
    }
    setBrands(rows);
    if (!activeId && rows[0]) setActiveId(rows[0].id);
    else if (activeId && !rows.some((brand) => brand.id === activeId)) setActiveId(rows[0]?.id ?? "");
  }

  async function signedUrl(path: string) {
    if (!supabase) return null;
    const { data } = await supabase.storage.from("brand-assets").createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  }

  async function loadBrandData(brandId: string) {
    if (!supabase || !brandId) return;
    const [a, i] = await Promise.all([
      supabase.from("brand_assets").select("id,name,type,url,created_at").eq("brand_id", brandId).order("created_at", { ascending: false }),
      supabase.from("inspirations").select("id,title,url,created_at").eq("brand_id", brandId).order("created_at", { ascending: false })
    ]);
    const nextAssets = await Promise.all(((a.data ?? []) as Asset[]).map(async (x) => ({ ...x, signedUrl: await signedUrl(x.url) })));
    const nextInspirations = await Promise.all(((i.data ?? []) as Inspiration[]).map(async (x) => ({ ...x, signedUrl: await signedUrl(x.url) })));
    setAssets(nextAssets);
    setInspirations(nextInspirations);
    if (a.error) setNotice(a.error.message);
    if (i.error) setNotice(i.error.message);
  }

  async function loadHistory() {
    if (!supabase) return;
    const { data, error } = await supabase.from("generations")
      .select("id,brand_id,project_id,prompt,design_type,quantity,status,created_at")
      .order("created_at", { ascending: false }).limit(60);
    if (error) setNotice(error.message);
    else setHistory((data ?? []) as Generation[]);
  }

  useEffect(() => {
    if (!supabase) { setBooting(false); return; }
    const bootstrap = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { setBooting(false); return; }
      setUser({ id: data.user.id, email: data.user.email, name: (data.user.user_metadata?.full_name as string | undefined) ?? (data.user.user_metadata?.name as string | undefined) });
      await loadBrands(data.user.id);
      await loadHistory();
      setBooting(false);
    };
    void bootstrap();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      if (!u) { setUser(null); setBrands([]); setActiveId(""); return; }
      setUser({ id: u.id, email: u.email, name: (u.user_metadata?.full_name as string | undefined) ?? (u.user_metadata?.name as string | undefined) });
      void loadBrands(u.id);
      void loadHistory();
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => { if (activeId) void loadBrandData(activeId); }, [activeId, supabase]);

  async function signIn() {
    if (!supabase) return setNotice("Faltan las variables de Supabase en Vercel.");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
    if (error) setNotice(error.message);
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null); setBrands([]); setActiveId(""); setAssets([]); setInspirations([]); setHistory([]);
  }

  async function createBrand() {
    if (!supabase) return setNotice("Creative Studio no tiene las variables de Supabase configuradas en este deployment.");
    if (!user) return setNotice("No hay una sesión de Google activa. Cierra sesión e inicia sesión nuevamente.");
    if (!brandName.trim()) return setNotice("Escribe el nombre de la marca.");
    setBusy(true);
    const { data, error } = await supabase.from("brands").insert({
      user_id: user.id, name: brandName.trim(), description: brandDescription.trim() || null
    }).select("id,name,description,logo_url").single();
    setBusy(false);
    if (error) {
      setNotice(`No se pudo crear la marca: ${error.message}`);
      setBusy(false);
      return;
    }
    setBrands((current) => [...current, data as Brand]);
    setActiveId(data.id); setBrandName(""); setBrandDescription(""); setBrandOpen(false); setView("home");
  }

  async function generate() {
    if (!supabase || !user || !active) return setNotice("Selecciona una marca para generar.");
    if (!prompt.trim()) return setNotice("Escribe primero qué quieres crear.");

    setBusy(true);
    setNotice("");
    setGenerated([]);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: active.name,
          brandDescription: active.description,
          prompt: prompt.trim(),
          designType,
          quantity: count,
          resources: assets.map((item) => item.name),
          inspirations: inspirations.map((item) => item.title || "Referencia")
        })
      });

      const payload = (await response.json()) as {
        items?: GeneratedItem[];
        model?: string;
        error?: string;
      };

      if (!response.ok || !payload.items) {
        throw new Error(payload.error || "La IA no pudo generar los conceptos.");
      }

      const name =
        prompt.trim().slice(0, 80) ||
        `${labelFor(designType)} · ${new Date().toLocaleDateString("es-CO")}`;

      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          brand_id: active.id,
          user_id: user.id,
          name,
          design_type: designType,
          quantity: count,
          prompt: prompt.trim()
        })
        .select("id")
        .single();

      if (projectError || !project) {
        throw new Error(projectError?.message || "No se pudo crear el proyecto.");
      }

      const { data: generation, error: generationError } = await supabase
        .from("generations")
        .insert({
          project_id: project.id,
          brand_id: active.id,
          user_id: user.id,
          prompt: prompt.trim(),
          design_type: designType,
          quantity: count,
          status: "completed"
        })
        .select("id")
        .single();

      if (generationError || !generation) {
        throw new Error(generationError?.message || "No se pudo guardar la generación.");
      }

      const rows = payload.items.map((item) => ({
        generation_id: generation.id,
        brand_id: active.id,
        user_id: user.id,
        position: item.position,
        title: item.title,
        hook: item.hook,
        body: item.body,
        cta: item.cta,
        visual_direction: item.visual_direction,
        image_prompt: item.image_prompt,
        status: "draft"
      }));

      const { error: itemError } = await supabase.from("generation_items").insert(rows);

      if (itemError) {
        throw new Error(itemError.message);
      }

      setGenerated(payload.items);
      await loadHistory();
      setNotice(
        `IA conectada · ${payload.items.length} conceptos generados${payload.model ? ` · ${payload.model}` : ""}`
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo generar.");
    } finally {
      setBusy(false);
    }
  }

  function chooseUpload(mode: "resource" | "inspiration") {
    setUploadMode(mode);
    setMenu(null);
    setTimeout(() => fileRef.current?.click(), 0);
  }

  async function uploadFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!supabase || !user || !active || !uploadMode) return;
    setBusy(true);
    for (const file of files) {
      const folder = uploadMode === "resource" ? "resources" : "inspirations";
      const path = `${user.id}/${active.id}/${folder}/${crypto.randomUUID()}-${cleanName(file.name)}`;
      const upload = await supabase.storage.from("brand-assets").upload(path, file, { upsert: false });
      if (upload.error) { setNotice(upload.error.message); continue; }
      if (uploadMode === "resource") {
        const result = await supabase.from("brand_assets").insert({
          brand_id: active.id, user_id: user.id, name: file.name, type: file.type.startsWith("image/") ? "image" : "file", url: path
        });
        if (result.error) setNotice(result.error.message);
      } else {
        const result = await supabase.from("inspirations").insert({
          brand_id: active.id, user_id: user.id, title: file.name, url: path
        });
        if (result.error) setNotice(result.error.message);
      }
    }
    setBusy(false); setUploadMode(null);
    await loadBrandData(active.id);
  }

  async function removeAsset(item: Asset) {
    if (!supabase || !user || !active) return;
    await supabase.storage.from("brand-assets").remove([item.url]);
    await supabase.from("brand_assets").delete().eq("id", item.id).eq("user_id", user.id);
    await loadBrandData(active.id);
  }

  async function removeInspiration(item: Inspiration) {
    if (!supabase || !user || !active) return;
    await supabase.storage.from("brand-assets").remove([item.url]);
    await supabase.from("inspirations").delete().eq("id", item.id).eq("user_id", user.id);
    await loadBrandData(active.id);
  }

  if (booting) return <main className="grid min-h-screen place-items-center bg-[#08090b] text-white"><div className="text-sm text-white/45">Cargando Creative Studio…</div></main>;

  if (!user) return (
    <main className="grid min-h-screen place-items-center bg-[#08090b] p-6 text-white">
      <div className="w-full max-w-md rounded-[28px] border border-white/[0.09] bg-[#0d0f13] p-8">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white font-black text-black">C</div>
        <div className="mt-6 text-center"><div className="text-xs uppercase tracking-[0.2em] text-violet-300/70">Creative Studio</div><h1 className="mt-3 text-3xl font-semibold">Tu espacio creativo para marcas</h1><p className="mt-3 text-sm leading-6 text-white/40">Guarda marcas, recursos, inspiraciones y generaciones en tu propia cuenta.</p></div>
        <button onClick={signIn} className="mt-8 w-full rounded-2xl bg-white px-4 py-3.5 text-sm font-semibold text-black">Continuar con Google</button>
        {notice && <div className="mt-4 rounded-xl bg-red-400/10 p-3 text-xs text-red-200">{notice}</div>}
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#08090b] text-white">
      <div className="flex min-h-screen">
        <aside className="flex w-[270px] shrink-0 flex-col border-r border-white/[0.07] bg-[#0a0c0f] px-4 py-5">
          <div className="flex items-center gap-3 px-2 pb-6"><div className="grid h-9 w-9 place-items-center rounded-xl bg-white font-black text-black">C</div><div><div className="text-sm font-semibold">Creative Studio</div><div className="text-[11px] text-white/40">AI Brand Workspace</div></div></div>
          <button onClick={() => setBrandOpen(true)} className="mb-5 rounded-xl bg-white px-3 py-3 text-sm font-semibold text-black">+ Nueva marca</button>
          <nav className="space-y-1">{NAV.map(([id, label, icon]) => <button key={id} onClick={() => setView(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${view === id ? "bg-white/[0.08] text-white" : "text-white/55 hover:bg-white/[0.045] hover:text-white"}`}><span className="w-5 text-center">{icon}</span>{label}</button>)}</nav>
          <div className="mt-7 border-t border-white/[0.07] pt-5"><div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Mis marcas</div><div className="space-y-1.5">{brands.map((brand) => <button key={brand.id} onClick={() => { setActiveId(brand.id); setView("home"); }} className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left ${activeId === brand.id ? "bg-white/[0.06]" : "hover:bg-white/[0.035]"}`}><span className="grid h-9 w-9 place-items-center rounded-lg bg-white/[0.08] text-[10px] font-bold">{brand.name.slice(0,2).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{brand.name}</span><span className="block truncate text-[10px] text-white/35">{brand.description || "Sin descripción"}</span></span></button>)}</div></div>
          <div className="mt-auto pt-7"><div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-2.5"><div className="truncate text-xs font-medium">{user.name || "Usuario"}</div><div className="truncate text-[10px] text-white/35">{user.email || "Cuenta Google"}</div><button onClick={signOut} className="mt-3 w-full rounded-lg border border-white/[0.07] px-3 py-2 text-[10px] text-white/45 hover:text-white">Cerrar sesión</button></div></div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-white/[0.07] px-8">
            <div>
              <div className="text-sm font-semibold">{NAV.find(([id]) => id === view)?.[1] || "Crear"}</div>
              <div className="text-[11px] text-white/35">
                {active ? `Marca activa · ${active.name}` : "Sin marca activa"} · {user.email || "Cuenta Google"}
              </div>
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.05] px-3 py-1 text-[10px] text-emerald-300">
              Supabase · {process.env.NEXT_PUBLIC_CREATIVE_STUDIO_SUPABASE_URL?.replace("https://","") || "sin configuración"}
            </span>
          </header>
          <input ref={fileRef} type="file" multiple className="hidden" accept="image/*,.pdf,.svg,.webp,.ai,.psd,.zip" onChange={uploadFiles} />

          {view === "home" && <div className="subtle-grid flex flex-1 overflow-y-auto px-8 py-10"><div className="mx-auto flex w-full max-w-5xl flex-col justify-center">{active ? <>
            <div className="mb-8 text-center"><div className="mb-3 text-xs uppercase tracking-[0.22em] text-violet-300/70">{active.name}</div><h1 className="text-4xl font-semibold tracking-[-0.04em] md:text-5xl">¿Qué quieres crear?</h1><p className="mx-auto mt-3 max-w-xl text-sm text-white/40">Combina prompt, recursos, inspiración, formato y cantidad.</p></div>
            <div className="mx-auto w-full max-w-3xl"><div className="rounded-[28px] border border-white/[0.11] bg-[#0d0f13] p-2 shadow-2xl"><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder={`Ej.: crea ${count} posts para ${active.name} con estética premium…`} className="w-full resize-none bg-transparent px-4 py-3 text-sm leading-6 outline-none placeholder:text-white/25" /><div className="flex flex-wrap items-center gap-2 px-1 pt-2">
              <div className="relative"><button onClick={() => setMenu(menu === "resources" ? null : "resources")} className="rounded-full border border-white/[0.08] bg-white/[0.035] px-4 py-2 text-xs text-white/70">+ Recursos e inspiración</button>{menu === "resources" && <div className="glass absolute left-0 top-full z-20 mt-2 w-72 rounded-2xl p-2"><button onClick={() => chooseUpload("resource")} className="w-full rounded-xl p-3 text-left hover:bg-white/[0.05]"><div className="text-xs font-medium">Recursos de marca</div><div className="mt-1 text-[11px] text-white/35">Logos, productos, fotos y archivos.</div></button><button onClick={() => chooseUpload("inspiration")} className="w-full rounded-xl p-3 text-left hover:bg-white/[0.05]"><div className="text-xs font-medium">Inspiración</div><div className="mt-1 text-[11px] text-white/35">Capturas, anuncios y referencias.</div></button></div>}</div>
              <div className="relative"><button onClick={() => setMenu(menu === "type" ? null : "type")} className="rounded-full border border-white/[0.08] bg-white/[0.035] px-4 py-2 text-xs text-white/70">Tipo · {labelFor(designType)} ▾</button>{menu === "type" && <div className="glass absolute left-0 top-full z-20 mt-2 w-48 rounded-2xl p-2">{TYPES.map(([id,label]) => <button key={id} onClick={() => { setDesignType(id); setMenu(null); }} className="block w-full rounded-xl px-3 py-2.5 text-left text-xs hover:bg-white/[0.05]">{label}</button>)}</div>}</div>
              <div className="relative"><button onClick={() => setMenu(menu === "count" ? null : "count")} className="rounded-full border border-white/[0.08] bg-white/[0.035] px-4 py-2 text-xs text-white/70">Cantidad · {count} ▾</button>{menu === "count" && <div className="glass absolute left-0 top-full z-20 mt-2 w-36 rounded-2xl p-2">{COUNTS.map((n) => <button key={n} onClick={() => { setCount(n); setMenu(null); }} className="block w-full rounded-xl px-3 py-2.5 text-left text-xs hover:bg-white/[0.05]">{n} piezas</button>)}</div>}</div>
              <button onClick={generate} disabled={busy} className="ml-auto rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-black disabled:opacity-60">{busy ? "Guardando…" : "✦ Generar"}</button>
            </div></div></div>
            <div className="mt-4 text-center text-[10px] text-white/30">{assets.length} recursos · {inspirations.length} inspiraciones · almacenamiento separado por marca</div>
            {notice && <div className="mx-auto mt-5 max-w-3xl rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-xs text-white/55">{notice}</div>}
            {generated.length > 0 && <div className="mt-10">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">Resultado IA</div>
                  <div className="mt-1 text-lg font-semibold">{generated.length} conceptos generados</div>
                </div>
                <span className="text-[10px] text-white/35">Textos + dirección creativa</span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {generated.map((item) => (
                  <div key={item.position} className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0d0f13]">
                    <div className="border-b border-white/[0.07] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-[0.16em] text-white/30">#{item.position}</span>
                        <span className="text-[10px] text-violet-300/60">{labelFor(designType)}</span>
                      </div>
                      <div className="mt-3 text-sm font-semibold">{item.title}</div>
                    </div>
                    <div className="space-y-3 p-4">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.14em] text-white/25">Hook</div>
                        <div className="mt-1 text-xs text-white/75">{item.hook}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.14em] text-white/25">Copy</div>
                        <div className="mt-1 text-xs leading-5 text-white/55">{item.body}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.14em] text-white/25">CTA</div>
                        <div className="mt-1 text-xs text-white/70">{item.cta}</div>
                      </div>
                      <div className="rounded-xl bg-white/[0.025] p-3">
                        <div className="text-[10px] uppercase tracking-[0.14em] text-white/25">Dirección visual</div>
                        <div className="mt-1 text-[11px] leading-5 text-white/40">{item.visual_direction}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>}
          </> : <div className="mx-auto text-center"><h1 className="text-3xl font-semibold">Crea tu primera marca</h1><button onClick={() => setBrandOpen(true)} className="mt-6 rounded-full bg-white px-5 py-3 text-xs font-semibold text-black">+ Nueva marca</button></div>}</div></div>}

          {view === "brands" && <Module title="Mis marcas" subtitle="Cada marca mantiene sus recursos e historial separados."><button onClick={() => setBrandOpen(true)} className="mb-6 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black">+ Nueva marca</button><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{brands.map((brand)=><button key={brand.id} onClick={()=>{setActiveId(brand.id);setView("home");}} className="rounded-2xl border border-white/[0.07] bg-[#0d0f13] p-5 text-left"><div className="text-sm font-semibold">{brand.name}</div><div className="mt-1 text-xs text-white/35">{brand.description || "Sin descripción"}</div><div className="mt-5 text-[10px] text-white/30">{brand.id===activeId ? "Marca activa" : "Seleccionar"}</div></button>)}</div></Module>}

          {view === "library" && <Module title="Biblioteca" subtitle={active ? `Recursos guardados para ${active.name}.` : "Selecciona una marca."}>{active && <button onClick={()=>chooseUpload("resource")} className="mb-6 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black">Subir recursos</button>}<div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{assets.map((x)=><div key={x.id} className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0d0f13]"><div className="aspect-square bg-black/30">{x.signedUrl && x.type==="image" ? <img src={x.signedUrl} alt={x.name} className="h-full w-full object-cover"/> : <div className="grid h-full place-items-center text-xs text-white/30">{x.type.toUpperCase()}</div>}</div><div className="p-3"><div className="truncate text-xs">{x.name}</div><button onClick={()=>void removeAsset(x)} className="mt-2 text-[10px] text-red-300/70">Eliminar</button></div></div>)}</div>{!assets.length&&<Empty text="Todavía no hay recursos para esta marca."/>}</Module>}

          {view === "inspiration" && <Module title="Inspiración" subtitle="Referencias visuales separadas por marca.">{active && <button onClick={()=>chooseUpload("inspiration")} className="mb-6 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black">Añadir inspiración</button>}<div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{inspirations.map((x)=><div key={x.id} className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0d0f13]"><div className="aspect-square bg-black/30">{x.signedUrl ? <img src={x.signedUrl} alt={x.title||"Inspiración"} className="h-full w-full object-cover"/> : <div className="grid h-full place-items-center text-xs text-white/30">Sin vista previa</div>}</div><div className="p-3"><div className="truncate text-xs">{x.title||"Referencia"}</div><button onClick={()=>void removeInspiration(x)} className="mt-2 text-[10px] text-red-300/70">Eliminar</button></div></div>)}</div>{!inspirations.length&&<Empty text="Todavía no hay referencias."/>}</Module>}

          {view === "history" && <Module title="Historial" subtitle="Tus generaciones guardadas."><div className="space-y-2">{history.map((x)=><div key={x.id} className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-[#0d0f13] p-4"><div className="grid h-11 w-11 place-items-center rounded-xl bg-white/[0.06] text-xs font-semibold">{x.quantity}</div><div className="min-w-0 flex-1"><div className="truncate text-sm">{x.prompt || labelFor(x.design_type)}</div><div className="mt-1 text-[11px] text-white/35">{brands.find((b)=>b.id===x.brand_id)?.name || "Marca"} · {labelFor(x.design_type)} · {new Date(x.created_at).toLocaleString("es-CO")}</div></div><span className="text-[10px] text-white/35">{x.status}</span></div>)}</div>{!history.length&&<Empty text="Aún no tienes generaciones."/>}</Module>}

          {view === "plugins" && <Module title="Plugins IA" subtitle="Arquitectura lista para proveedores intercambiables y open-source."><div className="grid gap-3 md:grid-cols-2">{[["Texto","Copies, ideas, hooks y CTA."],["Visión","Analiza recursos e inspiraciones."],["Imagen","Generación visual desacoplada."],["Upscale / Fondo","Procesamiento final de piezas."]].map(([a,b])=><div key={a} className="rounded-2xl border border-white/[0.07] bg-[#0d0f13] p-5"><div className="text-sm font-semibold">{a}</div><div className="mt-2 text-xs text-white/40">{b}</div><div className="mt-4 text-[10px] text-white/30">Preparado para integración</div></div>)}</div></Module>}
        </section>
      </div>

      {brandOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"><div className="glass w-full max-w-md rounded-3xl p-5"><div className="text-lg font-semibold">Crear nueva marca</div><input autoFocus value={brandName} onChange={(e)=>setBrandName(e.target.value)} placeholder="Nombre de la marca" className="mt-5 w-full rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none"/><textarea value={brandDescription} onChange={(e)=>setBrandDescription(e.target.value)} rows={3} placeholder="Descripción (opcional)" className="mt-3 w-full resize-none rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none"/><div className="mt-5 flex justify-end gap-2"><button onClick={()=>setBrandOpen(false)} className="rounded-xl px-4 py-2.5 text-xs text-white/55">Cancelar</button><button onClick={()=>void createBrand()} disabled={busy} className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black">{busy?"Creando…":"Crear marca"}</button></div></div></div>}
    </main>
  );
}

function Module({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <div className="flex-1 overflow-y-auto p-8"><div className="mx-auto max-w-6xl"><h2 className="text-2xl font-semibold">{title}</h2><p className="mt-1 text-sm text-white/35">{subtitle}</p><div className="mt-6">{children}</div></div></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="mt-8 rounded-2xl border border-dashed border-white/[0.08] p-10 text-center text-sm text-white/30">{text}</div>;
}
