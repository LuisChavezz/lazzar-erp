/**
 * Contrato de props del formulario de solicitudes.
 *
 * ── Por qué existe este archivo
 *
 * Antes, `RequestForm` renderizaba `QuoteFormContent` de cotizaciones, cuyo tipo
 * de props es `ReturnType<typeof useQuoteForm>`. Eso ataba solicitudes al hook
 * de cotizaciones: cualquier divergencia futura de campos rompía la compilación
 * aquí y empujaba a editar cotizaciones. Este tipo corta ese acoplamiento —
 * `requests` declara explícitamente lo que su formulario consume, y una
 * divergencia de campos pasa a ser una edición local a este archivo.
 *
 * `useRequestForm` sigue siendo la fuente que lo satisface, pero por
 * ESTRUCTURA, no por alias: si el hook deja de cumplir el contrato, falla el
 * typecheck en `RequestForm.tsx` con el campo exacto que ya no coincide.
 */
import type { Dispatch, FormEventHandler, RefObject, SetStateAction } from "react";
import type { CustomerAddress } from "../../customers/interfaces/customer-address.interface";
import type { Customer } from "../../customers/interfaces/customer.interface";
import type { Size } from "../../sizes/interfaces/size.interface";
import type { FormFieldError } from "../../../utils/getFieldError";
import type { RequestFormValues } from "../schemas/request.schema";
import type {
  RequestExtraService,
  RequestItem,
  RequestPaymentCondition,
} from "./request.interface";
// Formas de datos de las queries REUTILIZADAS de cotizaciones. Son alias
// locales a propósito: cuando solicitudes tenga sus propios endpoints se
// reapuntan aquí y ni el hook ni el componente cambian.
import type { QuoteOnboardingData } from "../../quotes/interfaces/quote.interface";
import type { ProductWithColors } from "../../quotes/types";
import type { useRequestForm } from "../hooks/useRequestForm";

/** Cliente tal como lo devuelve el onboarding reutilizado. */
export type RequestOnboardingCustomer = QuoteOnboardingData["busqueda"]["clientes"][number];

/** Producto del catálogo con sus variantes, tal como lo devuelve el onboarding. */
export type RequestCatalogProduct = ProductWithColors;

/** Opción `{ value, label }` de los catálogos del onboarding. */
export interface RequestSelectOption<TValue extends string | number> {
  value: TValue;
  label: string;
}

/**
 * Instancia de TanStack Form del formulario de solicitudes.
 *
 * Único tipo que se deriva en vez de escribirse: `ReactFormExtendedApi` lleva
 * diez parámetros genéricos (nueve de ellos validadores en `undefined`) y
 * escribirlos a mano se rompería en cada actualización de la librería. Se
 * deriva del hook PROPIO de solicitudes, no del de cotizaciones.
 */
export type RequestFormApi = ReturnType<typeof useRequestForm>["form"];

export interface RequestFormContentProps {
  // ── Formulario y utilidades de error ──────────────────────────────────────
  form: RequestFormApi;
  formRef: RefObject<HTMLFormElement | null>;
  formKey: string;
  getError: (field: string) => FormFieldError | undefined;
  clearFieldErrors: (field: string) => void;
  validateField: (
    field: keyof RequestFormValues,
    value: RequestFormValues[keyof RequestFormValues]
  ) => boolean;
  itemsError: FormFieldError | undefined;
  tipoPedidoError: FormFieldError | undefined;

  // ── Identidad y fecha ─────────────────────────────────────────────────────
  sellerName: string;
  userName: string;
  todayStr: string;

  // ── Catálogos ─────────────────────────────────────────────────────────────
  tiposPedidoOptions: RequestSelectOption<number>[];
  paymentConditionOptions: RequestSelectOption<RequestPaymentCondition>[];
  ivaOptions: RequestSelectOption<number>[];
  regimenFiscalOptions: RequestSelectOption<string>[];
  usoCfdiOptions: RequestSelectOption<string>[];
  currencyOptions: RequestSelectOption<number>[];
  formasPagoOptions: RequestSelectOption<string>[];
  metodosPagoOptions: RequestSelectOption<string>[];
  sizes: Size[];
  products: RequestCatalogProduct[];

  // ── Estados de carga y transición ─────────────────────────────────────────
  isPending: boolean;
  isCustomersLoading: boolean;
  isCurrenciesLoading: boolean;
  isOnboardingLoading: boolean;
  showForm: boolean;
  isRouteTransitioning: boolean;

  // ── Acciones del formulario ───────────────────────────────────────────────
  handleFormSubmit: FormEventHandler<HTMLFormElement>;
  handleReset: () => void;
  handleBack: () => void;

  // ── Partidas (API estilo field-array) ─────────────────────────────────────
  fields: { id: string }[];
  append: (itemOrItems: RequestItem | RequestItem[]) => void;
  remove: (index: number) => void;
  update: (index: number, item: RequestItem) => void;
  watchedItems: RequestItem[];

  // ── Valores observados ────────────────────────────────────────────────────
  watchedFecha: string | undefined;
  watchedDocRelacionado: string;
  watchedEnviarDomicilioFiscal: boolean | undefined;
  watchedCondicionPago: RequestPaymentCondition | undefined;
  hasCustomerSelected: boolean;

  // ── Totales derivados ─────────────────────────────────────────────────────
  subtotal: number;
  descuentoTotal: number;
  ivaAmount: number;
  granTotal: number;
  saldoPendiente: number;

  // ── Diálogo de alta/edición de partida ────────────────────────────────────
  isAddProductsOpen: boolean;
  setIsAddProductsOpen: Dispatch<SetStateAction<boolean>>;
  editIndex: number | null;
  setEditIndex: Dispatch<SetStateAction<number | null>>;

  // ── Cliente ───────────────────────────────────────────────────────────────
  clienteSearchTerm: string;
  setClienteSearchTerm: (value: string) => void;
  isCustomerDialogOpen: boolean;
  setIsCustomerDialogOpen: Dispatch<SetStateAction<boolean>>;
  customers: RequestOnboardingCustomer[];
  handleSelectCustomer: (customer: RequestOnboardingCustomer, fromSearch?: boolean) => void;
  handleCustomerCreated: (customer?: Customer) => void;
  customerAddresses: CustomerAddress[];
  handleSelectShippingAddress: (address: CustomerAddress) => void;

  // ── Servicios extra ───────────────────────────────────────────────────────
  extraServices: RequestExtraService[];
  setExtraServices: Dispatch<SetStateAction<RequestExtraService[]>>;

  // ── Diálogo de bordado por partida ────────────────────────────────────────
  embroideryEditIndex: number | null;
  isEmbroideryEditOpen: boolean;
  openEmbroideryEdit: (index: number) => void;
  handleEmbroideryEditSave: (updatedItem: RequestItem) => void;
  handleEmbroideryEditOpenChange: (nextOpen: boolean) => void;

  // ── Diálogo de reflejante por partida ─────────────────────────────────────
  reflectiveEditIndex: number | null;
  isReflectiveEditOpen: boolean;
  openReflectiveEdit: (index: number) => void;
  handleReflectiveEditSave: (updatedItem: RequestItem) => void;
  handleReflectiveEditOpenChange: (nextOpen: boolean) => void;

  // ── Diálogo de tallas por partida ─────────────────────────────────────────
  sizesEditIndex: number | null;
  isSizesEditOpen: boolean;
  openSizesEdit: (index: number) => void;
  handleSizesEditSave: (updatedItem: RequestItem) => void;
  handleSizesEditOpenChange: (nextOpen: boolean) => void;

  // ── Personalización ───────────────────────────────────────────────────────
  submitLabel?: string;
}
