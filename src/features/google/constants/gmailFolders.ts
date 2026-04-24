import type React from "react";
import {
  InboxIcon,
  PaperPlaneIcon,
  StarIcon,
  PencilSquareIcon,
  ExclamationTriangleIcon,
} from "@/src/components/Icons";

// --- Tipos ---

export type GmailFolderId = "inbox" | "sent" | "starred" | "drafts" | "spam";

export interface GmailFolder {
  id: GmailFolderId;
  /** Etiqueta visible en la interfaz. */
  label: string;
  /** Parámetro `q` que se envía a la API de Gmail para filtrar mensajes. */
  query: string;
  /** Ícono representativo de la carpeta. */
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

// --- Configuración de carpetas ---

export const GMAIL_FOLDERS: GmailFolder[] = [
  { id: "inbox",   label: "Recibidos",   query: "in:inbox",   icon: InboxIcon },
  { id: "sent",    label: "Enviados",    query: "in:sent",    icon: PaperPlaneIcon },
  { id: "starred", label: "Destacados",  query: "is:starred", icon: StarIcon },
  { id: "drafts",  label: "Borradores",  query: "in:drafts",  icon: PencilSquareIcon },
  { id: "spam",    label: "No deseado",  query: "in:spam",    icon: ExclamationTriangleIcon },
];

export const DEFAULT_FOLDER_ID: GmailFolderId = "inbox";

/** Obtiene el parámetro `q` para una carpeta dada. */
export const getFolderQuery = (id: GmailFolderId): string =>
  GMAIL_FOLDERS.find((f) => f.id === id)?.query ?? "in:inbox";
