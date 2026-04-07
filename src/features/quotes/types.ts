/**
 * src/features/quotes/types.ts
 * Tipos compartidos y constantes usadas por el flujo de cotización y el
 * diálogo de agregar productos. Centralizar tipos evita imports cíclicos
 * y facilita la composición de hooks y vistas.
 */
import type { Product } from "../products/interfaces/product.interface";
import type { Size } from "../sizes/interfaces/size.interface";
import type { QuoteFormValues } from "./schemas/quote.schema";

/**
 * `QuoteItem` — alias al tipo generado por el schema `quote.schema`.
 */
export type QuoteItem = QuoteFormValues["items"][number];

/**
 * Pasos del diálogo de agregar producto.
 */
export type Step = "select" | "embroidery" | "reflective" | "sizes";

/**
 * Fila simplificada del catálogo usada en las vistas de selección.
 */
export interface CatalogRow {
  id: number;
  productoId: number;
  nombre: string;
  descripcion: string;
  unidad: string;
  precio: number;
  isActive: boolean;
}

/**
 * Representación editable de una especificación de bordado en el formulario.
 */
export interface EmbroiderySpecForm {
  id: string;
  posicionCodigo: string;
  ancho: string;
  alto: string;
  colorHilo: string;
  imagen: string;
}

/**
 * Errores por campo para cada especificación de bordado.
 */
export interface EmbroiderySpecFieldErrors {
  posicion?: string;
  ancho?: string;
  alto?: string;
  color?: string;
  imagen?: string;
}

export type EmbroiderySpecErrorsById = Record<string, EmbroiderySpecFieldErrors>;

/**
 * Props que recibe el hook contenedor `useAddProductDialogState`.
 */
export interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddItem?: (item: QuoteItem) => void;
  onAddItems?: (items: QuoteItem[]) => void;
  onUpdateItem?: (item: QuoteItem) => void;
  initialItem?: QuoteItem | null;
  startStep?: Step;
  sizes: Size[];
  products: Partial<Product>[];
}

/**
 * Etiquetas legibles para cada paso (usadas por la barra de progreso).
 */
export const STEP_LABELS: Record<Step, string> = {
  select: "Selección de Productos",
  embroidery: "Configuración de Bordado",
  reflective: "Configuración de Reflejante",
  sizes: "Seleccionar Tallas",
};

/**
 * Opciones de posiciones para bordado (código + nombre legible).
 */
export const POSITION_OPTIONS: { codigo: string; nombre: string }[] = [
  { codigo: "A", nombre: "Frente Izquierdo" },
  { codigo: "B", nombre: "Frente Derecho" },
  { codigo: "C", nombre: "Manga Derecha" },
  { codigo: "D", nombre: "Manga Izquierda" },
  { codigo: "E", nombre: "Frente Centro" },
  { codigo: "F", nombre: "Espalda Alta" },
  { codigo: "G", nombre: "Espalda Media" },
  { codigo: "H", nombre: "Espalda Baja" },
  { codigo: "I", nombre: "Sobre la bolsa del pantalon izquierda" },
  { codigo: "J", nombre: "Sobre la bolsa del pantalon Derecha" },
  { codigo: "K", nombre: "Pierna Izquierda" },
  { codigo: "L", nombre: "Pierna Derecha" },
];

/**
 * Opciones de colores de hilo (códigos representativos).
 */
export const THREAD_COLOR_OPTIONS: string[] = ["1002", "1004", "1174", "1256", "1176"];
