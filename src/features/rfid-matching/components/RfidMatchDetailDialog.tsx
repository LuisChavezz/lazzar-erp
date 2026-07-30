"use client";

import { useRef, useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { StatusBadge } from "@/src/components/StatusBadge";
import { Button } from "@/src/components/Button";
import {
  CheckCircleIcon,
  InfoIcon,
  QrCodeIcon,
  WarningFilledIcon,
} from "@/src/components/Icons";
import {
  EmptyLines,
  InfoField,
  LineItemsTable,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { RFID_MATCH_STATUS_CONFIG } from "../constants/rfidMatchStatus";
import { useRfidMatches } from "../hooks/useRfidMatches";
import { useRegisterLectura } from "../hooks/useRegisterLectura";
import { useAcceptRfidMatch } from "../hooks/useAcceptRfidMatch";
import {
  codigosDisponibles,
  isRfidMatchComplete,
  lecturasSinAsignar,
  ULTIMAS_LECTURAS_LIMIT,
  ultimasLecturas,
  unidadesPendientes,
  unidadesSobrantes,
} from "../utils/rfid-matching.utils";
import type { RfidMatch, RfidMatchReading } from "../interfaces/rfid-matching.interface";

/** Hora local corta de una lectura ("14:32:07"). */
const horaDe = (iso: string): string => {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return "—";
  return new Date(parsed).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

/** Une frases en español con "y" antes de la última ("A" / "A y B" / "A, B y C"). */
const joinConY = (partes: string[]): string => {
  if (partes.length === 0) return "";
  if (partes.length === 1) return partes[0];
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
};

// ── Tarjetas de conteo ───────────────────────────────────────────────────────

function CounterCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: number;
  note?: string;
  tone: "slate" | "sky" | "amber";
}) {
  const tones = {
    slate: "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-white",
    sky: "border-sky-200 dark:border-sky-500/20 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300",
    amber:
      "border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300",
  } as const;

  return (
    <div className={`rounded-xl border px-4 py-3 ${tones[tone]}`}>
      <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">{label}</div>
      <div className="mt-1 text-2xl font-bold font-mono tabular-nums">{value}</div>
      {note && <div className="mt-0.5 text-[11px] opacity-70">{note}</div>}
    </div>
  );
}

// ── Panel de lecturas ────────────────────────────────────────────────────────

function LecturaRow({ lectura }: { lectura: RfidMatchReading }) {
  const sinAsignar = lectura.linea_id === null;

  return (
    <li
      className={`rounded-xl border px-3 py-2 ${
        sinAsignar
          ? "border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10"
          : "border-slate-200 dark:border-white/10"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200 break-all">
          {lectura.codigo}
        </span>
        <span className="shrink-0 text-[11px] font-mono text-slate-400 dark:text-slate-500">
          {horaDe(lectura.timestamp)}
        </span>
      </div>
      <p
        className={`mt-0.5 text-[11px] ${
          sinAsignar
            ? "text-amber-700 dark:text-amber-400"
            : "text-slate-500 dark:text-slate-400"
        }`}
      >
        {sinAsignar
          ? `No se pudo asignar automáticamente. Cantidad ${lectura.cantidad}.`
          : `${lectura.producto_matched} · Cantidad ${lectura.cantidad}`}
      </p>
    </li>
  );
}

function LecturasPanel({
  titulo,
  lecturas,
  vacio,
}: {
  titulo: string;
  lecturas: RfidMatchReading[];
  vacio: string;
}) {
  return (
    <div>
      <SectionTitle>{titulo}</SectionTitle>
      {lecturas.length === 0 ? (
        <EmptyLines>{vacio}</EmptyLines>
      ) : (
        <ul className="max-h-56 overflow-y-auto space-y-2 pr-1">
          {lecturas.map((lectura) => (
            <LecturaRow key={lectura.id} lectura={lectura} />
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Códigos de prueba ────────────────────────────────────────────────────────

/**
 * Afordancia EXCLUSIVA de la maqueta: los tags que este encuadre todavía
 * admite, para poder escanear sin adivinar. En producción los emite el lector
 * Zebra (hoy, un MC3300X que se comporta como teclado sobre el mismo campo) y
 * el operador nunca los ve escritos. Sin esto no habría forma de descubrir un
 * código válido y toda lectura caería en "sin asignar", lo que haría ver la
 * simulación como rota.
 */
function CodigosDePrueba({
  match,
  onPick,
}: {
  match: RfidMatch;
  onPick: (codigo: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const grupos = codigosDisponibles(match);

  return (
    <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/15 px-4 py-3">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 text-left cursor-pointer"
      >
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Códigos de prueba
        </span>
        <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400">
          {isOpen ? "Ocultar" : `Ver ${grupos.length > 0 ? "disponibles" : ""}`}
        </span>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3">
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Sustituyen al lector Zebra en esta maqueta. Toca uno para cargarlo en el campo de
            escaneo; los ya leídos desaparecen de la lista.
          </p>
          {grupos.length === 0 ? (
            <EmptyLines>Ya se leyeron todos los códigos de esta orden.</EmptyLines>
          ) : (
            grupos.map(({ linea, codigos }) => (
              <div key={linea.id}>
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {linea.producto}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {codigos.map((codigo) => (
                    <button
                      key={codigo}
                      type="button"
                      onClick={() => onPick(codigo)}
                      className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-2 py-1 font-mono text-[11px] text-slate-600 dark:text-slate-300 hover:border-sky-300 hover:text-sky-700 dark:hover:text-sky-300 transition-colors cursor-pointer"
                    >
                      {codigo}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Diálogo ──────────────────────────────────────────────────────────────────

interface RfidMatchDetailDialogProps {
  /** Se pasa el ID, no el registro: el diálogo relee el encuadre VIGENTE de la
   *  caché en cada render, de modo que cada lectura registrada se refleja al
   *  instante sin depender de que la tabla vuelva a pasar la fila. */
  matchId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RfidMatchDetailDialog({
  matchId,
  open,
  onOpenChange,
}: RfidMatchDetailDialogProps) {
  const { matches } = useRfidMatches();
  const registrarLectura = useRegisterLectura();
  const acceptRfidMatch = useAcceptRfidMatch();

  const [codigoTag, setCodigoTag] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const match = matches.find((item) => item.id === matchId);
  if (!match) return null;

  const esPendiente = match.estado === "PENDIENTE";
  const completo = isRfidMatchComplete(match);
  const faltantes = unidadesPendientes(match);
  const sobrantes = unidadesSobrantes(match);

  // Composición de la diferencia para el aviso de aceptación y su
  // confirmación: las tres formas en que un encuadre puede NO cuadrar exacto
  // —faltan piezas, sobran piezas, o hay lecturas sin asignar— no son
  // excluyentes entre sí, así que se listan todas las que apliquen en vez de
  // asumir que solo puede darse una a la vez.
  const diferenciaPartes: string[] = [];
  if (faltantes > 0) diferenciaPartes.push(`${faltantes} pza(s) por leer`);
  if (sobrantes > 0) diferenciaPartes.push(`${sobrantes} pza(s) de más sin explicar`);
  if (match.sin_asignar_total > 0) {
    diferenciaPartes.push(`${match.sin_asignar_total} lectura(s) sin asignar`);
  }

  const handleScan = () => {
    const resultado = registrarLectura(match.id, codigoTag);
    // Un tag DUPLICADO se conserva en el campo: el operador acaba de leerlo,
    // conviene que lo vea para reaccionar. Cualquier otro desenlace limpia
    // para dejar el campo listo para el siguiente disparo del lector.
    if (resultado.tipo !== "DUPLICADA") setCodigoTag("");
    scanInputRef.current?.focus();
  };

  const handleAceptar = () => {
    acceptRfidMatch(match.id);
    setIsConfirmOpen(false);
  };

  const ultimas = ultimasLecturas(match);
  const sinAsignar = lecturasSinAsignar(match);

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="900px"
      showCloseButton={true}
      title={
        <div className="flex items-start justify-between gap-4 pr-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <QrCodeIcon className="w-5 h-5 text-indigo-500 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100 truncate">
                {match.nombre}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5 truncate">
                {match.orden_compra} · {match.almacen}
              </p>
            </div>
          </div>
          <StatusBadge status={match.estado} config={RFID_MATCH_STATUS_CONFIG} />
        </div>
      }
    >
      <div className="space-y-5">
        {/* Encabezado del documento */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
          <InfoField label="Proveedor" className="col-span-2">
            {match.orden_compra_proveedor}
          </InfoField>
          <InfoField label="Serie">
            <span className="font-mono">{match.serie}</span>
          </InfoField>
          <InfoField label="Remisión">
            <span className="font-mono">{textOrDash(match.remision)}</span>
          </InfoField>
          <InfoField label="Factura referencia">
            <span className="font-mono">{textOrDash(match.factura_referencia)}</span>
          </InfoField>
          <InfoField label="Observaciones" className="col-span-2 sm:col-span-3">
            {textOrDash(match.observaciones)}
          </InfoField>
        </div>

        {/* Escaneo */}
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/10 px-4 py-4">
          <SectionTitle>Escanear tag</SectionTitle>

          {esPendiente ? (
            <>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 mb-3">
                Coloca el cursor en el campo, dispara el lector y presiona Enter. El tag se
                asigna por SKU de variante, código o código Proscai; si no coincide con ninguna
                línea de la orden, se guarda como lectura sin asignar.
              </p>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleScan();
                }}
                className="flex flex-col sm:flex-row gap-2"
              >
                <input
                  ref={scanInputRef}
                  type="text"
                  autoComplete="off"
                  // El lector se comporta como teclado: el campo tiene que estar
                  // enfocado desde que abre el diálogo para no perder el primer
                  // disparo.
                  autoFocus
                  value={codigoTag}
                  onChange={(event) => setCodigoTag(event.target.value)}
                  placeholder="Escanea aquí el tag RFID o código"
                  aria-label="Tag a registrar"
                  className="flex-1 rounded-xl border border-indigo-300 dark:border-indigo-500/30 bg-white dark:bg-black/20 px-4 py-2.5 text-sm font-mono text-slate-900 dark:text-white outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <Button type="submit" variant="primary" className="bg-indigo-600! border-indigo-600! hover:bg-indigo-700! shadow-indigo-500/30!">
                  Registrar lectura
                </Button>
              </form>

              <div className="mt-3">
                <CodigosDePrueba
                  match={match}
                  onPick={(codigo) => {
                    setCodigoTag(codigo);
                    scanInputRef.current?.focus();
                  }}
                />
              </div>
            </>
          ) : (
            <p className="flex items-start gap-2 text-xs text-indigo-700 dark:text-indigo-300">
              <InfoIcon className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
              Solo puedes escanear encuadres pendientes. Este encuadre ya fue aceptado en QA y
              su conteo quedó cerrado.
            </p>
          )}
        </div>

        {/* Conteos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <CounterCard label="Esperado" value={match.esperado_total} tone="slate" />
          <CounterCard
            label="Leído"
            value={match.leido_total}
            tone="sky"
            note={
              match.sin_asignar_total > 0
                ? `Incluye ${match.sin_asignar_total} sin asignar`
                : undefined
            }
          />
          <CounterCard
            label="Sin asignar"
            value={match.sin_asignar_total}
            tone={match.sin_asignar_total > 0 ? "amber" : "slate"}
          />
        </div>

        {/* Desglose por producto */}
        <div>
          <SectionTitle>Desglose por producto</SectionTitle>
          {match.lineas.length === 0 ? (
            <EmptyLines>La orden aún no tiene detalle esperado para mostrar.</EmptyLines>
          ) : (
            <LineItemsTable
              head={
                <>
                  <th className="px-3 py-2 font-medium">Producto</th>
                  <th className="px-3 py-2 font-medium">Código</th>
                  <th className="px-3 py-2 font-medium text-right">Esperado</th>
                  <th className="px-3 py-2 font-medium text-right">Leído</th>
                  <th className="px-3 py-2 font-medium text-right">Diferencia</th>
                </>
              }
            >
              {match.lineas.map((linea) => (
                <tr key={linea.id}>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                    {linea.producto}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                    {linea.codigo}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    {linea.esperado}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-200">
                    {linea.leido}
                  </td>
                  {/* Diferencia > 0 = faltan piezas; < 0 = se leyó de más. Las dos
                      son discrepancias, pero se distinguen: faltante en ámbar
                      (lo habitual) y excedente en rosa (obliga a revisar el
                      físico). Cero, en verde, es la línea cuadrada. */}
                  <td
                    className={`px-3 py-2 text-right font-mono tabular-nums font-semibold ${
                      linea.diferencia > 0
                        ? "text-amber-600 dark:text-amber-400"
                        : linea.diferencia < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {linea.diferencia}
                  </td>
                </tr>
              ))}
            </LineItemsTable>
          )}
        </div>

        {/* Lecturas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <LecturasPanel
            titulo={`Últimas lecturas${
              match.lecturas.length > ULTIMAS_LECTURAS_LIMIT
                ? ` (${ULTIMAS_LECTURAS_LIMIT} de ${match.lecturas.length})`
                : ""
            }`}
            lecturas={ultimas}
            vacio="Todavía no hay lecturas registradas."
          />
          <LecturasPanel
            titulo="Lecturas sin asignar"
            lecturas={sinAsignar}
            vacio="No hay tags sin asignar."
          />
        </div>

        {/* Aceptación en QA */}
        {esPendiente && (
          <div
            className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              completo
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                : "border-slate-200 dark:border-white/10"
            }`}
          >
            <div className="flex items-start gap-2 min-w-0">
              {completo ? (
                <CheckCircleIcon
                  className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
              ) : (
                <WarningFilledIcon
                  className="w-4 h-4 shrink-0 mt-0.5 text-amber-500"
                  aria-hidden="true"
                />
              )}
              <p
                className={`text-xs ${
                  completo
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {completo
                  ? "El conteo cuadra: todas las líneas cubiertas exactas y ningún tag sin asignar."
                  : diferenciaPartes.length > 0
                    ? `El conteo no cuadra todavía: hay ${joinConY(diferenciaPartes)}. Aceptar deja registrada esa diferencia.`
                    : "La orden no tiene líneas esperadas que validar. Aceptar deja registrado un encuadre sin detalle."}
              </p>
            </div>

            {/* Habilitado SIEMPRE que el encuadre esté pendiente, cuadre o no —
                `aceptar_encuadre` en el backend no valida nada, y por eso la
                pantalla de referencia muestra un encuadre aceptado con 1 leído
                de 5 esperados. Aceptar con diferencia es una decisión de QA,
                no un error a bloquear; lo que cambia es la presentación: si el
                conteo cuadra la acción es primaria y directa, y si no, es
                secundaria y pasa por una confirmación que nombra la
                diferencia. */}
            <Button
              variant={completo ? "primary" : "secondary"}
              className={completo ? "bg-emerald-600! border-emerald-600! hover:bg-emerald-700! shadow-emerald-500/30!" : ""}
              leftIcon={<CheckCircleIcon className="w-4 h-4" aria-hidden="true" />}
              onClick={() => (completo ? handleAceptar() : setIsConfirmOpen(true))}
            >
              Marcar aceptado en QA
            </Button>
          </div>
        )}

        <p className="flex items-start gap-2 text-[11px] text-slate-400 dark:text-slate-500">
          <InfoIcon className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true" />
          Simulación local. No hay lector conectado ni endpoint detrás: aceptar el encuadre no
          mueve inventario, solo deja el conteo validado.
        </p>
      </div>

      {/* Confirmación apilada, solo para aceptar con diferencia. */}
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title="Aceptar con diferencia"
        description={
          diferenciaPartes.length > 0
            ? `Hay ${joinConY(diferenciaPartes)}. El encuadre se aceptará con esa diferencia registrada y ya no podrá seguir escaneándose.`
            : "La orden no tiene líneas esperadas que validar. El encuadre se aceptará sin detalle y ya no podrá seguir escaneándose."
        }
        confirmText="Aceptar de todos modos"
        confirmColor="amber"
        onConfirm={handleAceptar}
      />
    </MainDialog>
  );
}
