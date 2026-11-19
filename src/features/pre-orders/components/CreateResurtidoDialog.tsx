"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MainDialog } from "@/src/components/MainDialog";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { useProductVariants } from "@/src/features/product-variants/hooks/useProductVariants";
import { useCompanyBranches } from "@/src/features/branches/hooks/useCompanyBranches";
import { useSessionCompanyId } from "@/src/features/workspace/hooks/useSessionCompany";
import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import { PurchaseOrderPedidosField } from "@/src/features/purchase-orders/components/PurchaseOrderPedidosField";
import { usePedidoSelectionMemory } from "@/src/features/purchase-orders/hooks/usePedidoSelectionMemory";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { getMexicoTodayDate } from "@/src/utils/mexicoTime";
import { useCreateResurtido } from "../hooks/useCreateResurtido";
import { useDisponibilidad } from "../hooks/useDisponibilidad";
import { parseSkuList } from "../utils/parseSkuList";
import {
  draftKey,
  isValidResurtidoQty,
  mergeDraftLines,
  sanitizeQtyInput,
  toLineaBody,
  type ResurtidoDraftLine,
} from "../utils/resurtidoDraft";
import { ResurtidoProductPicker } from "./ResurtidoProductPicker";

type GeneralField = "sucursal" | "fecha_compromiso" | "notas" | "lineas" | "pedidos";
type ResurtidoErrors = { general: Partial<Record<GeneralField, string>>; porLinea: Record<string, string> };

const NO_ERRORS: ResurtidoErrors = { general: {}, porLinea: {} };
const asText = (v: unknown): string | undefined =>
  typeof v === "string" ? v : Array.isArray(v) && typeof v[0] === "string" ? v[0] : undefined;

/**
 * Errores del POST: generales como string por campo; `lineas` como lista con
 * un objeto por renglón en el MISMO orden en que se mandó (`{}` sin error), o
 * como string (error de toda la lista).
 */
const parseResurtidoErrors = (error: unknown, enviadas: ResurtidoDraftLine[]): ResurtidoErrors => {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (!data || typeof data !== "object") return NO_ERRORS;
  const raw = data as Record<string, unknown>;
  const general: ResurtidoErrors["general"] = {};
  for (const key of ["sucursal", "fecha_compromiso", "notas", "pedidos"] as const) {
    const msg = asText(raw[key]);
    if (msg) general[key] = msg;
  }
  const porLinea: Record<string, string> = {};
  if (Array.isArray(raw.lineas)) {
    raw.lineas.forEach((item, i) => {
      const linea = enviadas[i];
      if (!linea || !item || typeof item !== "object") return;
      const o = item as Record<string, unknown>;
      const msg =
        asText(o.sku) ?? asText(o.variante) ?? asText(o.producto) ?? asText(o.cantidad) ?? asText(Object.values(o)[0]);
      if (msg) porLinea[linea.key] = msg;
    });
  } else {
    const msg = asText(raw.lineas);
    if (msg) general.lineas = msg;
  }
  return { general, porLinea };
};

const fieldError = (message?: string) => (message ? { message } : undefined);
const qty = (n: number | undefined) => (n === undefined ? "—" : formatQuantityValue(n));

/** `YYYY-MM-DD` + n días, en UTC (no depende de la zona del navegador). */
const plusDays = (date: string, n: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const FECHA_RAPIDA = [
  ["1 semana", 7],
  ["2 semanas", 14],
  ["1 mes", 30],
] as const;

/** Renglones agrupados por prenda, en el orden en que se agregaron. */
const groupByPrenda = (lineas: ResurtidoDraftLine[]) => {
  const groups = new Map<string, ResurtidoDraftLine[]>();
  for (const l of lineas) {
    const k = l.nombre || "Por validar (SKU pegado)";
    groups.set(k, [...(groups.get(k) ?? []), l]);
  }
  return [...groups.entries()];
};

/** Bloque numerado del formulario: el número dice el orden, el título qué se captura. */
function Step({
  n,
  title,
  hint,
  aside,
  done,
  children,
}: {
  n: number;
  /** Paso completo: el número cambia por una palomita. */
  done?: boolean;
  title: string;
  hint?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 sm:p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white shadow-sm transition-colors ${
              done ? "bg-emerald-600 shadow-emerald-600/30" : "bg-sky-600 shadow-sky-600/30"
            }`}
          >
            {done ? (
              <svg aria-label="Completo" viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="m5 10 3.5 3.5L15 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              n
            )}
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
            {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
          </div>
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}

function Stat({ label, value, tone = "slate" }: { label: string; value: string; tone?: "slate" | "sky" | "rose" }) {
  const toneCls =
    tone === "sky"
      ? "text-sky-700 dark:text-sky-300"
      : tone === "rose"
        ? "text-rose-600 dark:text-rose-400"
        : "text-slate-900 dark:text-white";
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`text-lg font-bold tabular-nums ${toneCls}`}>{value}</span>
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</span>
    </div>
  );
}

/**
 * "Generar pre-orden": planeación arma una pre-orden SIN pasar por un pedido
 * especial, para UNA sucursal, con prendas del catálogo que tienen BOM (se
 * fabrican). Las busca como en la cotización o pega su lista de SKUs desde
 * Excel; puede ligarla a uno o varios pedidos (opcional). Producción la acepta.
 */
export function CreateResurtidoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Generar pre-orden"
      description="Elige las prendas a fabricar y, si quieres, los pedidos que cubre. Producción la revisa y la acepta."
      maxWidth="1120px"
      showCloseButton={false}
    >
      {open && <CreateResurtidoForm onClose={() => onOpenChange(false)} />}
    </MainDialog>
  );
}

function CreateResurtidoForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { productVariants } = useProductVariants();
  const { branches, isLoading: loadingBranches } = useCompanyBranches(useSessionCompanyId());
  const workspaceBranchId = useWorkspaceStore((s) => s.selectedBranch?.id);
  const pedidoSelection = usePedidoSelectionMemory();
  const create = useCreateResurtido();

  const [sucursal, setSucursal] = useState(workspaceBranchId ? String(workspaceBranchId) : "");
  const [fecha, setFecha] = useState("");
  const [notas, setNotas] = useState("");
  const [pedidos, setPedidos] = useState<number[]>([]);
  const [modo, setModo] = useState<"buscar" | "pegar">("buscar");
  const [pegado, setPegado] = useState("");
  const [lineas, setLineas] = useState<ResurtidoDraftLine[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [errors, setErrors] = useState<ResurtidoErrors>(NO_ERRORS);

  const bySku = new Map(productVariants.map((v) => [v.sku.toUpperCase(), v]));
  const variantIds = lineas.flatMap((l) => ("variante" in l.ref ? [l.ref.variante] : []));
  const { porVariante, isFetching: loadingDisp } = useDisponibilidad(
    sucursal ? Number(sucursal) : null,
    variantIds,
    [],
  );

  const today = getMexicoTodayDate();
  const isPending = create.isPending;
  const invalidas = lineas.filter((l) => !isValidResurtidoQty(l.cantidad, "fabricado"));
  const canSubmit = Boolean(sucursal && fecha) && lineas.length > 0 && invalidas.length === 0 && !isPending;
  const piezas = lineas.reduce((acc, l) => acc + Number(l.cantidad || 0), 0);
  const conError = lineas.filter((l) => errors.porLinea[l.key]).length;
  const [confirmClose, setConfirmClose] = useState(false);
  const pedirCerrar = () => (lineas.length > 0 ? setConfirmClose(true) : onClose());
  // Lo que falta para poder generar, dicho en palabras junto al botón.
  const faltantes = [
    !sucursal && "la sucursal",
    !fecha && "la fecha compromiso",
    lineas.length === 0 && "al menos una prenda",
    invalidas.length > 0 && `piezas en ${invalidas.length} ${invalidas.length === 1 ? "prenda" : "prendas"}`,
  ].filter(Boolean) as string[];

  const addLines = (incoming: ResurtidoDraftLine[], extra: string[] = []) => {
    const { lines, repeated } = mergeDraftLines(lineas, incoming);
    setLineas(lines);
    const partes = [`${incoming.length} ${incoming.length === 1 ? "prenda agregada" : "prendas agregadas"}.`];
    if (repeated) partes.push(`${repeated} ya estaban y se sumaron.`);
    setAviso([...partes, ...extra].join(" "));
  };

  const agregarPegado = () => {
    const parsed = parseSkuList(pegado);
    const enteras = parsed.lines.filter((l) => Number.isInteger(l.cantidad));
    const incoming = enteras.map((l): ResurtidoDraftLine => {
      const v = bySku.get(l.sku);
      const ref = v ? { variante: v.id } : { sku: l.sku };
      return {
        key: draftKey(ref),
        ref,
        codigo: l.sku,
        nombre: v?.producto_nombre ?? "",
        detalle: v ? [v.talla_nombre, v.color_nombre].filter(Boolean).join(" · ") : "",
        unidad: "pz",
        tipo: "fabricado",
        cantidad: String(l.cantidad),
      };
    });
    const sobrantes = [
      ...parsed.invalid,
      ...parsed.lines.filter((l) => !Number.isInteger(l.cantidad)).map((l) => `${l.sku}\t${l.cantidad}`),
    ];
    addLines(
      incoming,
      sobrantes.length ? [`${sobrantes.length} renglones sin piezas enteras quedaron en el cuadro.`] : [],
    );
    setPegado(sobrantes.join("\n"));
  };

  const setCantidad = (key: string, value: string) =>
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, cantidad: sanitizeQtyInput(value, "fabricado") } : l)));
  const quitar = (key: string) => setLineas((prev) => prev.filter((l) => l.key !== key));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    const enviadas = lineas;
    setErrors(NO_ERRORS);
    create.mutate(
      {
        origen: "resurtido",
        sucursal: Number(sucursal),
        fecha_compromiso: fecha,
        lineas: enviadas.map(toLineaBody),
        ...(pedidos.length ? { pedidos } : {}),
        ...(notas.trim() ? { notas: notas.trim() } : {}),
      },
      {
        onSuccess: (res) => {
          onClose();
          router.push(`/manufacturing/pre-orders/${res.id}`);
        },
        onError: (error) => setErrors(parseResurtidoErrors(error, enviadas)),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <Step n={1} title="Datos de la pre-orden" hint="Para qué sucursal y para cuándo." done={Boolean(sucursal && fecha)}>
            <div className="space-y-3">
              <FormSelect
                label="Sucursal"
                name="sucursal"
                value={sucursal}
                error={fieldError(errors.general.sucursal)}
                disabled={isPending || loadingBranches}
                onChange={(e) => setSucursal(e.target.value)}
              >
                <option value="">{loadingBranches ? "Cargando…" : "Selecciona una sucursal"}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre}
                  </option>
                ))}
              </FormSelect>
              <FormInput
                label="Fecha compromiso"
                name="fecha_compromiso"
                type="date"
                min={today}
                value={fecha}
                error={fieldError(errors.general.fecha_compromiso)}
                disabled={isPending}
                onChange={(e) => setFecha(e.target.value)}
              />
              <div className="-mt-1 flex flex-wrap gap-1.5" aria-label="Fecha rápida">
                {FECHA_RAPIDA.map(([label, dias]) => {
                  const value = plusDays(today, dias);
                  const active = fecha === value;
                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={isPending}
                      aria-pressed={active}
                      onClick={() => setFecha(value)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                        active
                          ? "border-sky-500 bg-sky-600 text-white"
                          : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                      }`}
                    >
                      En {label}
                    </button>
                  );
                })}
              </div>
              <FormInput
                label="Notas (opcional)"
                name="notas"
                placeholder="Ej. resurtido de temporada"
                value={notas}
                error={fieldError(errors.general.notas)}
                disabled={isPending}
                onChange={(e) => setNotas(e.target.value)}
              />
            </div>
          </Step>
        </div>
        <div className="lg:col-span-3">
          <Step n={2} done={pedidos.length > 0} title="Ligar pedidos" hint="Opcional. Liga uno o varios pedidos que esta pre-orden va a cubrir.">
            <PurchaseOrderPedidosField
              value={pedidos}
              onChange={setPedidos}
              selection={pedidoSelection}
              error={fieldError(errors.general.pedidos)}
            />
          </Step>
        </div>
      </div>

      <Step
        n={3}
        done={lineas.length > 0 && invalidas.length === 0}
        title="Prendas a fabricar"
        hint="Solo catálogo con BOM. Búscalas o pega tu lista de Excel."
        aside={
          <div className="inline-flex shrink-0 rounded-full bg-slate-100 dark:bg-white/5 p-1" role="tablist" aria-label="Cómo agregar prendas">
            {(
              [
                ["buscar", "Buscar"],
                ["pegar", "Pegar de Excel"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={modo === key}
                onClick={() => setModo(key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  modo === key
                    ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      >
        {modo === "buscar" ? (
          <ResurtidoProductPicker disabled={isPending} onAdd={(l) => addLines(l)} />
        ) : (
          <div className="space-y-2">
            <FormTextarea
              label="SKU y piezas, uno por renglón"
              name="lista"
              rows={4}
              placeholder={"60001006XG\t300\n60001005XG\t150"}
              value={pegado}
              disabled={isPending}
              onChange={(e) => setPegado(e.target.value)}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={agregarPegado}
                disabled={isPending || !pegado.trim()}
                className="rounded-full bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Agregar a la pre-orden
              </button>
            </div>
          </div>
        )}
        {aviso && (
          <p className="mt-2 px-1 text-xs text-emerald-700 dark:text-emerald-400" role="status">
            {aviso}
          </p>
        )}

        <div className="mt-4 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
          {lineas.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Aún no hay prendas</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Lo que agregues aparece aquí con su existencia y lo que ya viene en camino.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-50 dark:bg-white/5 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {!sucursal
                    ? "Elige la sucursal para ver la disponibilidad."
                    : loadingDisp
                      ? "Calculando disponibilidad…"
                      : "Disponibilidad en la sucursal elegida."}
                </span>
                {conError > 0 && (
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    {conError} {conError === 1 ? "prenda" : "prendas"} con error
                  </span>
                )}
              </div>
              <div className="max-h-[38vh] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900 text-[11px] uppercase tracking-wider text-slate-400">
                    <tr className="border-b border-slate-200 dark:border-white/10">
                      <th className="px-3 py-2 text-left font-semibold">Prenda</th>
                      <th className="px-3 py-2 text-right font-semibold">Existencia</th>
                      <th className="px-3 py-2 text-right font-semibold" title="En órdenes de producción abiertas">Por fabricar</th>
                      <th className="px-3 py-2 text-right font-semibold" title="Pedidos autorizados o en proceso y otras pre-órdenes abiertas">Comprometido</th>
                      <th className="px-3 py-2 text-right font-semibold">Disponible</th>
                      <th className="px-3 py-2 text-right font-semibold">Piezas</th>
                      <th className="px-2 py-2"><span className="sr-only">Quitar</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {groupByPrenda(lineas).map(([prenda, grupo]) => [
                      <tr key={`g-${prenda}`} className="bg-slate-50/80 dark:bg-white/[0.03]">
                        <td colSpan={7} className="px-3 py-1.5">
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="truncate text-xs font-bold text-slate-800 dark:text-white" title={prenda}>{prenda}</span>
                            <span className="shrink-0 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                              {grupo.length} {grupo.length === 1 ? "variante" : "variantes"} ·{" "}
                              <b className="text-sky-700 dark:text-sky-300">
                                {formatQuantityValue(grupo.reduce((a, l) => a + Number(l.cantidad || 0), 0))}
                              </b>{" "}
                              pz
                            </span>
                          </span>
                        </td>
                      </tr>,
                      ...grupo.map((l) => {
                      const d = "variante" in l.ref ? porVariante.get(l.ref.variante) : undefined;
                      const err = errors.porLinea[l.key];
                      const qtyInvalid = l.cantidad !== "" && !isValidResurtidoQty(l.cantidad, "fabricado");
                      return (
                        <tr key={l.key} className={err ? "bg-rose-50/60 dark:bg-rose-500/5" : "hover:bg-slate-50/60 dark:hover:bg-white/[0.02]"}>
                          <td className="py-2 pl-6 pr-3 max-w-80">
                            <span className="block font-medium text-slate-800 dark:text-white">
                              {l.detalle || (l.nombre ? l.codigo : <span className="text-amber-600 dark:text-amber-400">Se valida al enviar</span>)}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{l.codigo}</span>
                            {err && <span role="alert" className="block text-xs font-semibold text-rose-600 dark:text-rose-400">{err}</span>}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{qty(d?.existencia)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-sky-700 dark:text-sky-300">{qty(d?.por_fabricar)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">{qty(d?.comprometido)}</td>
                          <td className={`px-3 py-2 text-right tabular-nums font-semibold ${d && d.disponible < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-white"}`}>
                            {qty(d?.disponible)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="text"
                              inputMode="numeric"
                              aria-label={`Piezas de ${l.codigo}`}
                              aria-invalid={qtyInvalid || undefined}
                              value={/^\d+$/.test(l.cantidad) ? Number(l.cantidad).toLocaleString("es-MX") : l.cantidad}
                              disabled={isPending}
                              onChange={(e) => setCantidad(l.key, e.target.value)}
                              className={`w-24 rounded-lg border bg-white dark:bg-zinc-900 px-2 py-1 text-right font-semibold tabular-nums text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                                qtyInvalid ? "border-rose-400" : "border-slate-200 dark:border-white/10"
                              }`}
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => quitar(l.key)}
                              disabled={isPending}
                              aria-label={`Quitar ${l.codigo}`}
                              className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                            >
                              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                      }),
                    ])}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        {errors.general.lineas && (
          <p role="alert" className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
            {errors.general.lineas}
          </p>
        )}
      </Step>

      <div className="sticky bottom-0 -mx-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-zinc-900/95 px-5 py-3 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <Stat label="Prendas" value={String(lineas.length)} />
          <Stat label="Piezas" value={formatQuantityValue(piezas)} tone="sky" />
          <Stat label={pedidos.length === 1 ? "Pedido" : "Pedidos"} value={String(pedidos.length)} />
          {invalidas.length > 0 && <Stat label="Sin piezas" value={String(invalidas.length)} tone="rose" />}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {!isPending && faltantes.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">Falta {faltantes.join(", ")}.</span>
          )}
          <FormCancelButton label="Cancelar" onClick={pedirCerrar} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Generando…" disabled={!canSubmit}>
            Generar pre-orden
          </FormSubmitButton>
        </div>
      </div>
      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title="¿Descartar la pre-orden?"
        description={`Llevas ${lineas.length} ${lineas.length === 1 ? "prenda" : "prendas"} capturadas. Si cierras, se pierden.`}
        confirmText="Descartar"
        cancelText="Seguir capturando"
        confirmColor="red"
        onConfirm={onClose}
      />
    </form>
  );
}
