/**
 * Utilidades de formateo y presentación para los componentes de correo (Gmail).
 * Funciones puras — sin efectos secundarios, sin dependencias de React.
 */

// --- Formateo de remitentes ---

/**
 * Extrae el nombre visible del remitente del campo `from_full`.
 * Ejemplo: "Juan Pérez <juan@example.com>" → "Juan Pérez"
 * Si no tiene nombre explícito, devuelve el usuario de la dirección de email.
 */
export const parseSenderName = (fromFull: string): string => {
  const match = fromFull.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : fromFull.split("@")[0];
};

/**
 * Extrae las iniciales para el avatar del remitente (máximo 2 caracteres).
 * Si el nombre tiene al menos dos palabras, usa la inicial de cada una.
 */
export const getSenderInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

// --- Formateo de fechas ---

/**
 * Formatea la fecha de un mensaje en la lista de correos:
 * - Si es hoy      → hora "HH:MM"
 * - Si es este año → "DD mmm"
 * - En otro caso   → "DD/MM/AAAA"
 */
export const formatMessageDate = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  }

  const isSameYear = date.getFullYear() === now.getFullYear();
  if (isSameYear) {
    return date.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  }

  return date.toLocaleDateString("es-MX");
};

/**
 * Formatea la fecha larga para la vista de detalle de un mensaje.
 * Ejemplo: "lunes, 21 de abril de 2025, 14:32"
 */
export const formatDetailDate = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// --- Avatares ---

/**
 * Paleta de colores de fondo para los avatares de remitentes.
 * El color se elige de forma determinista según el nombre del remitente.
 */
const AVATAR_COLORS = [
  "bg-sky-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-pink-500",
] as const;

/**
 * Devuelve una clase de color de fondo determinista (Tailwind) para el avatar,
 * basándose en el hash del nombre del remitente.
 */
export const getAvatarColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};
