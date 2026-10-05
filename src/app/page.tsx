"use client";

import { useMemo, useState } from "react";

type DesignType = "social" | "carousel" | "branding";

type Brand = {
  id: string;
  name: string;
  description: string;
  accent: string;
  initials: string;
};

const NAV = [
  ["home", "Inicio", "⌂"],
  ["library", "Biblioteca", "▦"],
  ["history", "Historial", "◷"],
  ["brands", "Mis marcas", "◉"],
  ["inspiration", "Inspiración", "✦"],
  ["plugins", "Plugins IA", "⌘"]
] as const;

const DEFAULT_BRANDS: Brand[] = [
  { id: "noir", name: "Noir Chronos", description: "Relojería premium", accent: "#c59b54", initials: "NC" },
  { id: "crioross", name: "CrioRoss", description: "Alimentos frescos", accent: "#75d06d", initials: "CR" }
];

export default function HomePage() {
  const [brands, setBrands] = useState<Brand[]>(DEFAULT_BRANDS);
  const [activeId, setActiveId] = useState("noir");
  const [view, setView] = useState("home");
  const [prompt, setPrompt] = useState("");
  const [resourceOpen, setResourceOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [countOpen, setCountOpen] = useState(false);
  const [designType, setDesignType] = useState<DesignType>("social");
  const [count, setCount] = useState(6);
  const [generated, setGenerated] = useState<string[]>([]);
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandName, setBrandName] = useState("");

  const active = useMemo(
    () => brands.find((brand) => brand.id === activeId) || brands[0],
    [brands, activeId]
  );

  const typeLabel =
    designType === "social"
      ? "Social Media"
      : designType === "carousel"
        ? "Carrusel"
        : "Branding";

  function generate() {
    const items = Array.from({ length: count }, (_, index) => typeLabel + " " + (index + 1));
    setGenerated(items);
  }

  function createBrand() {
    const name = brandName.trim();
    if (!name) return;
    const initials = name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const next = {
      id: String(Date.now()),
      name,
      description: "Nueva identidad",
      accent: "#8b5cf6",
      initials
    };

    setBrands((current) => current.concat(next));
    setActiveId(next.id);
    setBrandName("");
    setBrandOpen(false);
  }

  return (
    <main className="min-h-screen bg-[#08090b] text-white">
      <div className="flex min-h-screen">
        <aside className="flex w-[270px] shrink-0 flex-col border-r border-white/[0.07] bg-[#0a0c0f] px-4 py-5">
          <div className="flex items-center gap-3 px-2 pb-6">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white font-black text-black">C</div>
            <div>
              <div className="text-sm font-semibold">Creative Studio</div>
              <div className="text-[11px] text-white/40">AI Brand Workspace</div>
            </div>
          </div>

          <button
            onClick={() => setBrandOpen(true)}
            className="mb-5 flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-3 text-sm font-semibold text-black"
          >
            <span className="text-lg">+</span> Nueva marca
          </button>

          <nav className="space-y-1">
            {NAV.map(function ([id, label, icon]) {
              return (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition " +
                    (view === id
                      ? "bg-white/[0.08] text-white"
                      : "text-white/55 hover:bg-white/[0.045] hover:text-white")
                  }
                >
                  <span className="w-5 text-center">{icon}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-7 border-t border-white/[0.07] pt-5">
            <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              Mis marcas
            </div>

            <div className="space-y-1.5">
              {brands.map(function (brand) {
                return (
                  <button
                    key={brand.id}
                    onClick={() => setActiveId(brand.id)}
                    className={
                      "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left " +
                      (activeId === brand.id ? "bg-white/[0.06]" : "hover:bg-white/[0.035]")
                    }
                  >
                    <span
                      className="grid h-9 w-9 place-items-center rounded-lg text-[10px] font-bold text-black"
                      style={{ background: brand.accent }}
                    >
                      {brand.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-white/85">{brand.name}</span>
                      <span className="block truncate text-[10px] text-white/35">{brand.description}</span>
                    </span>
                    {activeId === brand.id && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-auto pt-7">
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-white text-[10px] font-bold text-black">CD</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">Cristian Daniel</div>
                <div className="truncate text-[10px] text-white/35">Cuenta Google</div>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-white/[0.07] px-8">
            <div>
              <div className="text-sm font-semibold">
                {view === "home" ? "Crear" : NAV.find(function (item) { return item[0] === view; })?.[1] || "Crear"}
              </div>
              <div className="text-[11px] text-white/35">Marca activa · {active.name}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.05] px-3 py-1 text-[10px] text-emerald-300">
                Sistema online
              </span>
              <button className="rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-white/60">
                Vista previa
              </button>
            </div>
          </header>

          {view === "home" ? (
            <div className="subtle-grid flex flex-1 overflow-y-auto px-8 py-10">
              <div className="mx-auto flex w-full max-w-5xl flex-col justify-center">
                <div className="mb-8 text-center">
                  <div className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-violet-300/70">{active.name}</div>
                  <h1 className="text-4xl font-semibold tracking-[-0.04em] md:text-5xl">¿Qué quieres crear?</h1>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/40">
                    Escribe una idea y combina recursos, inspiración, formato y cantidad.
                  </p>
                </div>

                <div className="mx-auto w-full max-w-3xl">
                  <div className="rounded-[28px] border border-white/[0.11] bg-[#0d0f13] p-2 shadow-2xl">
                    <textarea
                      value={prompt}
                      onChange={function (event) { setPrompt(event.target.value); }}
                      placeholder={"Ej.: crea " + count + " posts para " + active.name + " con una estética premium y cinematográfica..."}
                      rows={3}
                      className="w-full resize-none bg-transparent px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/25"
                    />

                    <div className="flex flex-wrap items-center gap-2 px-1 pt-2">
                      <div className="relative">
                        <button
                          onClick={function () { setResourceOpen(!resourceOpen); }}
                          className="rounded-full border border-white/[0.08] bg-white/[0.035] px-4 py-2 text-xs text-white/70"
                        >
                          + Recursos e inspiración
                        </button>

                        {resourceOpen && (
                          <div className="glass absolute left-0 top-full z-20 mt-2 w-72 rounded-2xl p-2 shadow-2xl">
                            <button onClick={function () { setResourceOpen(false); }} className="w-full rounded-xl p-3 text-left hover:bg-white/[0.05]">
                              <div className="text-xs font-medium">Recursos de marca</div>
                              <div className="mt-1 text-[11px] text-white/35">Logos, productos, colores, tipografías y fotografías.</div>
                            </button>
                            <button onClick={function () { setResourceOpen(false); }} className="w-full rounded-xl p-3 text-left hover:bg-white/[0.05]">
                              <div className="text-xs font-medium">Inspiración</div>
                              <div className="mt-1 text-[11px] text-white/35">Referencias visuales, anuncios, layouts y estilos.</div>
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <button
                          onClick={function () { setTypeOpen(!typeOpen); }}
                          className="rounded-full border border-white/[0.08] bg-white/[0.035] px-4 py-2 text-xs text-white/70"
                        >
                          Tipo · {typeLabel} ▾
                        </button>

                        {typeOpen && (
                          <div className="glass absolute left-0 top-full z-20 mt-2 w-48 rounded-2xl p-2">
                            {[
                              ["social", "Social Media"],
                              ["carousel", "Carrusel"],
                              ["branding", "Branding"]
                            ].map(function ([id, label]) {
                              return (
                                <button
                                  key={id}
                                  onClick={function () {
                                    setDesignType(id as DesignType);
                                    setTypeOpen(false);
                                  }}
                                  className={
                                    "w-full rounded-xl px-3 py-2.5 text-left text-xs hover:bg-white/[0.05] " +
                                    (designType === id ? "text-white" : "text-white/55")
                                  }
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <button
                          onClick={function () { setCountOpen(!countOpen); }}
                          className="rounded-full border border-white/[0.08] bg-white/[0.035] px-4 py-2 text-xs text-white/70"
                        >
                          Cantidad · {count} ▾
                        </button>

                        {countOpen && (
                          <div className="glass absolute left-0 top-full z-20 mt-2 w-36 rounded-2xl p-2">
                            {[4, 6, 9, 12, 24].map(function (value) {
                              return (
                                <button
                                  key={value}
                                  onClick={function () {
                                    setCount(value);
                                    setCountOpen(false);
                                  }}
                                  className={
                                    "w-full rounded-xl px-3 py-2.5 text-left text-xs hover:bg-white/[0.05] " +
                                    (count === value ? "text-white" : "text-white/55")
                                  }
                                >
                                  {value} publicaciones
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={generate}
                        className="ml-auto rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-black"
                      >
                        ✦ Generar
                      </button>
                    </div>
                  </div>
                </div>

                {generated.length > 0 && (
                  <div className="mt-10">
                    <div className="mb-4 flex items-end justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-white/35">Última generación</div>
                        <div className="mt-1 text-lg font-semibold">{generated.length} piezas listas para revisar</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                      {generated.map(function (item, index) {
                        return (
                          <div key={item} className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0d0f13]">
                            <div className="aspect-[4/5] bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-black p-4">
                              <div className="flex h-full flex-col justify-between rounded-xl border border-white/[0.08] bg-black/20 p-4">
                                <span className="text-[10px] uppercase tracking-[0.16em] text-white/30">{active.initials}</span>
                                <div>
                                  <div className="text-sm font-semibold">{item}</div>
                                  <div className="mt-1 text-[10px] text-white/35">Concepto visual · {index + 1}</div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between p-3">
                              <span className="text-[10px] text-white/40">Borrador</span>
                              <button className="text-[10px] text-white/70">Abrir →</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid flex-1 place-items-center p-10">
              <div className="max-w-lg text-center">
                <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.06]">
                  {NAV.find(function (item) { return item[0] === view; })?.[2] || "•"}
                </div>
                <h2 className="text-2xl font-semibold">
                  {NAV.find(function (item) { return item[0] === view; })?.[1] || "Creative Studio"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/40">
                  Este módulo forma parte de la arquitectura V1. Aquí añadiremos la biblioteca, el historial, la inspiración y los conectores de IA.
                </p>
                <button onClick={function () { setView("home"); }} className="mt-6 rounded-full border border-white/[0.09] px-4 py-2 text-xs text-white/70">
                  Volver al generador
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {brandOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-3xl p-5">
            <div className="mb-5">
              <div className="text-lg font-semibold">Crear nueva marca</div>
              <div className="mt-1 text-xs text-white/35">Cada marca tendrá su identidad, recursos e historial separados.</div>
            </div>

            <input
              autoFocus
              value={brandName}
              onChange={function (event) { setBrandName(event.target.value); }}
              onKeyDown={function (event) {
                if (event.key === "Enter") createBrand();
              }}
              placeholder="Ej. Noir Chronos"
              className="w-full rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm outline-none placeholder:text-white/20"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={function () { setBrandOpen(false); }} className="rounded-xl px-4 py-2.5 text-xs text-white/55">
                Cancelar
              </button>
              <button onClick={createBrand} className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black">
                Crear marca
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
