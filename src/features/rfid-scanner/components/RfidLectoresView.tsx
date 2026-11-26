"use client";

import { useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { MainDialog } from "@/src/components/MainDialog";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { FormInput } from "@/src/components/FormInput";
import { useIsCompanyAdmin } from "@/src/features/users/hooks/useIsCompanyAdmin";
import { MEXICO_TIME_ZONE } from "@/src/utils/mexicoTime";
import type { RfidLectorConfig, RfidLectorEstado } from "../interfaces/rfid-scanner.interface";
import {
  useCreateRfidLector,
  useDeleteRfidLector,
  useRegenerarTokenRfidLector,
  useRfidLectores,
} from "../hooks/useRfidLectores";

const ESTADO: Record<RfidLectorEstado, { label: string; dot: string; text: string }> = {
  LEYENDO: { label: "Conectado", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  CONECTADO_SIN_TAGS: { label: "Conectado", dot: "bg-sky-500", text: "text-sky-600 dark:text-sky-400" },
  SIN_CONEXION: { label: "Sin conexión", dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
};

const fechaCorta = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-MX", { timeZone: MEXICO_TIME_ZONE, dateStyle: "short", timeStyle: "short" })
    : "—";

function CopiarUrl({ url }: { url: string }) {
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copiada");
    } catch {
      toast.error("No se pudo copiar; selecciónala y cópiala a mano");
    }
  };
  return (
    <div className="flex items-center gap-2">
      <code
        className="min-w-0 flex-1 truncate rounded-md bg-slate-100 dark:bg-white/5 px-2 py-1 text-[11px] text-slate-600 dark:text-slate-300"
        title={url}
      >
        {url}
      </code>
      <button
        type="button"
        onClick={copiar}
        className="shrink-0 rounded-md border border-slate-200 dark:border-white/10 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
      >
        Copiar
      </button>
    </div>
  );
}

/** Token dentro de la URL del FX (`?token=`), para la opción Basic auth. */
const tokenDeUrl = (url: string): string | null => {
  try {
    return new URL(url).searchParams.get("token");
  } catch {
    return null;
  }
};

/**
 * Credenciales completas del FX: el backend solo las devuelve al crear o al
 * regenerar el token. Después el GET las trae enmascaradas, así que se
 * muestran una sola vez.
 */
function CredencialesFx({ nombre, url }: { nombre: string; url?: string | null }) {
  if (!url) {
    return <p className="text-sm text-amber-600 dark:text-amber-400">El servidor no devolvió la URL del lector.</p>;
  }
  const token = tokenDeUrl(url);
  const base = url.split("?")[0];
  return (
    <div className="space-y-3 text-sm">
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
        Cópialo ahora: por seguridad no se volverá a mostrar.
      </p>
      <p className="text-slate-600 dark:text-slate-300">
        Configura el IoT Connector del FX de <b>{nombre}</b> y dale Stop/Start a la conexión.
      </p>
      {token ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Recomendado: Basic auth</p>
          <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>URL</span>
            <CopiarUrl url={base} />
            <span>Contraseña</span>
            <CopiarUrl url={token} />
          </div>
          <p className="pt-1 text-xs text-slate-500 dark:text-slate-400">O, si el FX no lo permite, la URL con el token:</p>
        </div>
      ) : null}
      <CopiarUrl url={url} />
    </div>
  );
}

function AgregarLectorDialog() {
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [creado, setCreado] = useState<RfidLectorConfig | null>(null);
  const create = useCreateRfidLector();

  const cambiarOpen = (o: boolean) => {
    setOpen(o);
    if (!o) {
      setNombre("");
      setUbicacion("");
      setCreado(null);
    }
  };
  const guardar = () => {
    if (!nombre.trim() || create.isPending) return;
    create.mutate(
      { nombre: nombre.trim(), ...(ubicacion.trim() ? { ubicacion: ubicacion.trim() } : {}) },
      { onSuccess: (lector) => setCreado(lector) },
    );
  };

  return (
    <MainDialog
      open={open}
      onOpenChange={cambiarOpen}
      maxWidth="520px"
      title={creado ? "Lector agregado" : "Agregar lector RFID"}
      trigger={
        <button
          type="button"
          className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 cursor-pointer"
        >
          + Agregar lector
        </button>
      }
      actionButton={
        creado ? undefined : (
          <button
            type="button"
            onClick={guardar}
            disabled={!nombre.trim() || create.isPending}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50 cursor-pointer"
          >
            {create.isPending ? "Agregando..." : "Agregar"}
          </button>
        )
      }
      actionButtonClose={false}
    >
      {creado ? (
        <CredencialesFx nombre={creado.nombre} url={creado.url_fx} />
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            guardar();
          }}
        >
          <FormInput label="Nombre" placeholder="Ej. Cajón 2" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <FormInput
            label="Ubicación (opcional)"
            placeholder="Ej. Nave 1, andén de recepción"
            value={ubicacion}
            onChange={(e) => setUbicacion(e.target.value)}
          />
        </form>
      )}
    </MainDialog>
  );
}

function LectorCard({ lector, puedeEliminar }: { lector: RfidLectorConfig; puedeEliminar: boolean }) {
  const del = useDeleteRfidLector();
  const regen = useRegenerarTokenRfidLector();
  const [nuevo, setNuevo] = useState<RfidLectorConfig | null>(null);
  const estado = lector.estado ? ESTADO[lector.estado] : null;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{lector.nombre}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{[lector.sucursal_nombre, lector.ubicacion].filter(Boolean).join(" · ") || "Sin ubicación"}</p>
        </div>
        {estado && (
          <span className={`flex shrink-0 items-center gap-1.5 text-xs font-semibold ${estado.text}`}>
            <span className={`h-2 w-2 rounded-full ${estado.dot}`} aria-hidden="true" />
            {estado.label}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>
          Última conexión:{" "}
          <b className="font-medium text-slate-700 dark:text-slate-200">{fechaCorta(lector.ultima_conexion)}</b>
        </span>
        <span>
          Última lectura:{" "}
          <b className="font-medium text-slate-700 dark:text-slate-200">{fechaCorta(lector.ultima_lectura)}</b>
        </span>
      </div>
      {lector.url_fx && (
        <code
          className="block truncate rounded-md bg-slate-100 dark:bg-white/5 px-2 py-1 text-[11px] text-slate-500 dark:text-slate-400"
          title="El token completo solo se muestra al crear el lector o al regenerarlo"
        >
          {lector.url_fx}
        </code>
      )}
      {puedeEliminar && (
        <div className="flex justify-end gap-4">
          <ConfirmDialog
            title={`Regenerar token de "${lector.nombre}"`}
            description="El token actual deja de servir de inmediato: el FX dejará de enviar lecturas hasta que lo configures con el nuevo."
            confirmText="Regenerar"
            confirmColor="amber"
            onConfirm={() => regen.mutate(lector, { onSuccess: (r) => setNuevo(r) })}
            trigger={
              <button
                type="button"
                disabled={regen.isPending}
                className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:underline disabled:opacity-50 cursor-pointer"
              >
                {regen.isPending ? "Regenerando..." : "Regenerar token"}
              </button>
            }
          />
          <ConfirmDialog
            title={`Eliminar "${lector.nombre}"`}
            description={`El FX "${lector.nombre}" dejará de enviar lecturas al ERP en este momento: su URL deja de funcionar y habría que darlo de alta de nuevo. Las lecturas que ya registró se conservan.`}
            confirmText="Eliminar"
            confirmColor="red"
            onConfirm={() => del.mutate(lector)}
            trigger={
              <button
                type="button"
                disabled={del.isPending}
                className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline disabled:opacity-50 cursor-pointer"
              >
                Eliminar
              </button>
            }
          />
        </div>
      )}
      <MainDialog
        open={nuevo !== null}
        onOpenChange={(o) => {
          if (!o) setNuevo(null);
        }}
        maxWidth="520px"
        title="Token regenerado"
      >
        {nuevo && <CredencialesFx nombre={nuevo.nombre} url={nuevo.url_fx} />}
      </MainDialog>
    </div>
  );
}

function Aviso({ texto, children }: { texto: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/15 px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
      <p>{texto}</p>
      {children}
    </div>
  );
}

/** Catálogo de lectores RFID: alta, baja, estado y URL de cada FX. */
export function RfidLectoresView() {
  const { lectores, isLoading, isInitialError, noDisponible, refetch } = useRfidLectores();
  const isAdmin = useIsCompanyAdmin();

  let contenido: ReactNode;
  if (noDisponible) {
    contenido = (
      <Aviso texto="La configuración de lectores aún no está disponible en el servidor. El lector actual sigue funcionando en Scanner RFID." />
    );
  } else if (isLoading) {
    contenido = (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-xl bg-slate-100 dark:bg-white/5" />
        ))}
      </div>
    );
  } else if (isInitialError) {
    contenido = (
      <Aviso texto="No se pudieron cargar los lectores.">
        <button type="button" onClick={() => refetch()} className="mt-2 text-sky-600 hover:underline cursor-pointer">
          Reintentar
        </button>
      </Aviso>
    );
  } else if (lectores.length === 0) {
    contenido = <Aviso texto={isAdmin ? "Aún no hay lectores. Agrega el primero." : "Aún no hay lectores dados de alta."} />;
  } else {
    contenido = (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {lectores.map((l) => (
          <LectorCard key={l.id} lector={l} puedeEliminar={isAdmin} />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cada lector (cajón) tiene su propia URL para el FX. Agrega o elimina lectores sin afectar a los demás.
        </p>
        {isAdmin && !noDisponible && <AgregarLectorDialog />}
      </div>
      {contenido}
    </div>
  );
}
