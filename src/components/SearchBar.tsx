"use client";

import { SearchIcon } from "./Icons";
import { useGlobalSearchModal } from "@/src/features/search/hooks/useGlobalSearchModal";

/**
 * Botón de búsqueda del header: abre la paleta de búsqueda global
 * (`GlobalSearchPalette`). Es su ÚNICO punto de entrada — no hay atajo de
 * teclado.
 *
 * Es un icono compacto, con el mismo tratamiento que sus hermanos del header
 * —la campana de `Notifications`—: `<button>` plano con `p-2`, icono de 20px y
 * el color pasando de `slate-400` a `sky-600` al pasar el cursor. Sin fondo,
 * sin borde y sin animación de ancho.
 */
export const SearchBar = () => {
  const { open } = useGlobalSearchModal();

  return (
    // Landmark de búsqueda: lo tenía la barra anterior y es la forma en que un
    // lector de pantalla salta hasta aquí sin recorrer el header entero.
    <div role="search" aria-label="Búsqueda global">
      <button
        type="button"
        onClick={open}
        aria-label="Buscar en el sistema"
        aria-haspopup="dialog"
        title="Buscar"
        // `outline-none` quita el anillo del navegador, así que el foco de
        // teclado se repinta a mano: sin esto el único acceso a la búsqueda no
        // se ve al tabular.
        className="p-2 rounded-lg cursor-pointer text-slate-400 hover:text-sky-600 transition outline-none focus-visible:text-sky-600 focus-visible:ring-2 focus-visible:ring-sky-500/50"
      >
        <SearchIcon className="w-5 h-5" aria-hidden="true" />
      </button>
    </div>
  );
};
