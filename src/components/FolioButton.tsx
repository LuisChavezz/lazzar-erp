"use client";

interface FolioButtonProps {
  folio: string | null | undefined;
  onClick: () => void;
  /** Tooltip y acción ("Ver detalle", "Inspeccionar"). */
  title?: string;
  /** Nombre accesible; por defecto "<title> <folio>". */
  ariaLabel?: string;
}

/**
 * Folio clicable de un listado: azul, monoespaciado y con "›" para que se note
 * que abre el detalle. Misma pinta que el folio de Surtidos (PICK).
 */
export function FolioButton({ folio, onClick, title = "Ver detalle", ariaLabel }: FolioButtonProps) {
  const text = folio || "—";
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel ?? `${title} ${text}`}
      className="group inline-flex items-center gap-1 font-mono text-[13px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline cursor-pointer whitespace-nowrap"
    >
      {text}
      <span aria-hidden="true" className="text-sky-500/70 transition-transform group-hover:translate-x-0.5">
        ›
      </span>
    </button>
  );
}

/** Clases del folio de pedido (`PedidoFolioLink`, con `tone="accent"`) en azul. */
export const BLUE_FOLIO_LINK_CLASS = "font-mono text-[13px] font-bold text-sky-600 dark:text-sky-400";
