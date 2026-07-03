"use client";

import { InfoIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";

interface SkuInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Datos de referencia ──────────────────────────────────────────────────────

/** Segmentos que componen el SKU: `MMMM / CCC / TTT`. */
const SKU_SEGMENTS: {
  code: string;
  label: string;
  digits: string;
  description: string;
  boxClass: string;
  dotClass: string;
}[] = [
  {
    code: "MMMM",
    label: "Modelo",
    digits: "4 dígitos",
    description:
      "Identifica el diseño. Es el mismo para todos los colores y tallas de ese modelo.",
    boxClass:
      "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300",
    dotClass: "bg-indigo-500",
  },
  {
    code: "CCC",
    label: "Color",
    digits: "3 dígitos",
    description: "Identifica el color normalizado.",
    boxClass:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300",
    dotClass: "bg-sky-500",
  },
  {
    code: "TTT",
    label: "Talla",
    digits: "3 dígitos",
    description: "Identifica la talla.",
    boxClass:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300",
    dotClass: "bg-amber-500",
  },
];

/** Rangos del código de color (CCC) con un swatch representativo de la familia. */
const COLOR_RANGES: { range: string; family: string; hex: string }[] = [
  { range: "100–199", family: "Blancos, hueso, crema",          hex: "#ffffff" },
  { range: "200–299", family: "Beige, arena, camel",            hex: "#d8c19a" },
  { range: "300–399", family: "Amarillos, mostaza",             hex: "#eab308" },
  { range: "400–499", family: "Naranjas",                       hex: "#f97316" },
  { range: "500–599", family: "Rojos, vino",                    hex: "#dc2626" },
  { range: "600–699", family: "Rosas, fucsias",                 hex: "#ec4899" },
  { range: "700–799", family: "Azules",                         hex: "#3b82f6" },
  { range: "800–899", family: "Negros, grises oscuros, carbón", hex: "#1f2937" },
  { range: "900–999", family: "Verdes, olivo, menta",           hex: "#22c55e" },
];

/** Ejemplo práctico: mismo modelo y talla, distinto color → distinto CCC. */
const SKU_EXAMPLES: {
  color: string;
  hex: string;
  modelo: string;
  ccc: string;
  talla: string;
}[] = [
  { color: "Negro",       hex: "#1f2937", modelo: "1042", ccc: "800", talla: "2XG" },
  { color: "Blanco",      hex: "#ffffff", modelo: "1042", ccc: "250", talla: "2XG" },
  { color: "Azul marino", hex: "#1e3a5f", modelo: "1042", ccc: "720", talla: "2XG" },
  { color: "Azul cielo",  hex: "#38bdf8", modelo: "1042", ccc: "740", talla: "2XG" },
];

// ─── Sub-componentes ──────────────────────────────────────────────────────────

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
    {children}
  </h3>
);

const Swatch = ({ hex }: { hex: string }) => (
  <span
    className="w-5 h-5 rounded-md border border-slate-200 dark:border-white/20 shrink-0"
    style={{ backgroundColor: hex }}
  />
);

// ─── Componente principal del diálogo ─────────────────────────────────────────

/**
 * Diálogo informativo (solo lectura) que explica al usuario cómo se compone
 * un SKU: su formato `MMMM / CCC / TTT`, el catálogo de rangos de color y un
 * ejemplo práctico.
 */
export function SkuInfoDialog({ open, onOpenChange }: SkuInfoDialogProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="640px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <InfoIcon className="w-5 h-5 text-sky-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              ¿Cómo se compone un SKU?
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              Guía rápida del código de cada producto
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ── Sección 1: Formato visual del SKU ─────────────────────────────── */}
        <section>
          <SectionTitle>Formato del SKU</SectionTitle>

          {/* Bloque segmentado: MMMM / CCC / TTT */}
          <div className="flex items-end justify-center gap-2 sm:gap-3 px-2 py-4 rounded-xl bg-slate-50 dark:bg-white/5">
            {SKU_SEGMENTS.map((seg, index) => (
              <div key={seg.code} className="flex items-end gap-2 sm:gap-3">
                {index > 0 && (
                  <span className="text-xl font-light text-slate-300 dark:text-slate-600 pb-6">
                    /
                  </span>
                )}
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`px-3 sm:px-4 py-2.5 rounded-xl border-2 font-mono text-sm font-bold tracking-widest ${seg.boxClass}`}
                  >
                    {seg.code}
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {seg.label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Explicación por segmento */}
          <ul className="mt-4 space-y-2.5">
            {SKU_SEGMENTS.map((seg) => (
              <li key={seg.code} className="flex items-start gap-2.5 text-sm">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${seg.dotClass}`} />
                <span className="text-slate-600 dark:text-slate-300 leading-snug">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {seg.code}
                  </span>{" "}
                  <span className="text-slate-400 dark:text-slate-500">({seg.digits})</span> —{" "}
                  {seg.description}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Sección 2: Catálogo de colores por rango ──────────────────────── */}
        <section>
          <SectionTitle>Catálogo de colores (CCC)</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {COLOR_RANGES.map((r) => (
              <div
                key={r.range}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5"
              >
                <Swatch hex={r.hex} />
                <div className="min-w-0">
                  <p className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 leading-tight">
                    {r.range}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    {r.family}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Sección 3: Ejemplo práctico ───────────────────────────────────── */}
        <section>
          <SectionTitle>Ejemplo práctico</SectionTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-snug">
            Mismo modelo <span className="font-mono font-semibold">1042</span> y talla{" "}
            <span className="font-mono font-semibold">2XG</span>: solo cambia el código de color
            (<span className="font-semibold text-sky-600 dark:text-sky-400">CCC</span>).
          </p>
          <div className="rounded-xl border border-slate-100 dark:border-white/10 overflow-hidden divide-y divide-slate-100 dark:divide-white/10">
            {SKU_EXAMPLES.map((ex) => (
              <div
                key={ex.color}
                className="flex items-center justify-between gap-3 px-3 py-2.5 bg-slate-50/40 dark:bg-white/5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Swatch hex={ex.hex} />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                    {ex.color}
                  </span>
                </div>
                <span className="font-mono text-sm whitespace-nowrap">
                  <span className="text-slate-500 dark:text-slate-400">{ex.modelo}</span>
                  <span className="text-slate-300 dark:text-slate-600">/</span>
                  <span className="px-1.5 py-0.5 rounded-md font-bold bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                    {ex.ccc}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">/</span>
                  <span className="text-slate-500 dark:text-slate-400">{ex.talla}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </MainDialog>
  );
}
