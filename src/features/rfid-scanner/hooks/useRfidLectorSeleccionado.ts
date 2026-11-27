import { useEffect, useState } from "react";
import { useRfidLectores } from "./useRfidLectores";
import { marcarLectorEnUso } from "../services/actions";
import { estadoCatalogoLectores } from "../utils/rfidLectorListo";

/** Cada cuánto se renueva el aviso "en uso" mientras se escanea. */
const EN_USO_INTERVAL_MS = 30_000;

const storageKey = (pantalla: string) => `rfid-lector:${pantalla}`;

const leerGuardado = (pantalla: string): number | null => {
  try {
    const v = Number(window.localStorage.getItem(storageKey(pantalla)));
    return Number.isInteger(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
};

/**
 * Lector con el que escanea una pantalla (`pantalla`: "recepcion", "surtido",
 * "scanner"). Se recuerda por pantalla en este navegador; si el guardado ya no
 * existe o no hay ninguno y solo hay un lector, se usa ese.
 *
 * `lectorId === null` = sin filtro: si el backend no tiene el catálogo (404)
 * se lee de todos los lectores, como antes. Si falla de otra forma, las
 * capturas no leen hasta que responda (`catalogoFallido`).
 */
export function useRfidLectorSeleccionado(pantalla: string, { allowAll = false } = {}) {
  const { lectores, hasLoaded, isInitialError, noDisponible } = useRfidLectores();
  const catalogo = estadoCatalogoLectores({ hasLoaded, isInitialError, noDisponible });
  const [guardado, setGuardado] = useState<number | null>(null);

  useEffect(() => {
    setGuardado(leerGuardado(pantalla));
  }, [pantalla]);

  const existe = (id: number | null) => id !== null && lectores.some((l) => l.id === id);
  const lectorId = existe(guardado)
    ? guardado
    : !allowAll && lectores.length === 1
      ? lectores[0].id
      : null;

  const seleccionar = (id: number | null) => {
    setGuardado(id);
    try {
      if (id === null) window.localStorage.removeItem(storageKey(pantalla));
      else window.localStorage.setItem(storageKey(pantalla), String(id));
    } catch {
      // Sin storage solo se pierde el recuerdo; la selección sigue en memoria.
    }
  };

  return {
    lectores,
    hasLoaded,
    // El catálogo ya respondió con la lista, o el backend no lo tiene (404: se
    // lee de todos, como dice arriba). Un fallo de otro tipo no lo resuelve.
    catalogoResuelto: catalogo.resuelto,
    catalogoFallido: catalogo.fallido,
    lectorId,
    lector: lectores.find((l) => l.id === lectorId) ?? null,
    seleccionar,
  };
}

/**
 * Mientras `activo`, avisa al backend que este usuario escanea con el lector
 * (`en-uso/`). Best-effort: un backend sin el endpoint responde 404 y se ignora.
 */
export function useLectorEnUso(
  lectorId: number | null,
  activo: boolean,
  pantalla: string,
  documento?: string | null,
) {
  useEffect(() => {
    if (!activo || lectorId === null) return;
    const latir = () => {
      marcarLectorEnUso(lectorId, { pantalla, documento: documento ?? null }).catch(() => {});
    };
    latir();
    const t = window.setInterval(latir, EN_USO_INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [lectorId, activo, pantalla, documento]);
}
