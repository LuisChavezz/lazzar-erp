"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useIsFetching } from "@tanstack/react-query";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { MainDialog } from "@/src/components/MainDialog";
import { renderRadioIndicator } from "@/src/components/RadioIndicator";
import { SearchableSelectList } from "@/src/components/SearchableSelectList";
import { SectionErrorNotice } from "@/src/components/SectionErrorNotice";
import { useProductCategories } from "@/src/features/product-categories/hooks/useProductCategories";
import { useSizes } from "@/src/features/sizes/hooks/useSizes";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useAltaCatalogoLinea } from "../hooks/useAltaCatalogoLinea";
import type {
  SpecialOrderCategoria,
  SpecialOrderLine,
} from "../interfaces/special-order.interface";
import {
  getCategoriesCoveringLine,
  getLineSizeNames,
  isTallaPendingCatalogAlta,
  resolveCategoryAltaSubmit,
} from "../utils/catalogAlta";
import { isCategoryRejection } from "../utils/parseCatalogAltaError";

const MUTED_CLS = "text-slate-500 dark:text-slate-400";

interface CatalogAltaConfirmDialogProps {
  pedidoId: number;
  open: boolean;
  /** La línea del detalle vigente; `null` cuando no hay ninguna elegida. */
  line: SpecialOrderLine | null;
  onClose: () => void;
}

/**
 * Confirmación de "Dar de alta en catálogo" de UNA línea. Trabaja con la línea
 * tal como estaba al abrir (`useDialogSession`): el texto no cambia si el
 * detalle se relee a media confirmación, y sobrevive a la animación de salida.
 *
 * Con categoría es una confirmación simple. Sin ella pide la categoría
 * (`CatalogAltaCategoryDialog`), que el alta guarda en la línea.
 */
export function CatalogAltaConfirmDialog({
  pedidoId,
  open,
  line,
  onClose,
}: CatalogAltaConfirmDialogProps) {
  const session = useDialogSession(open, line);
  const missingLine = open && !session.snapshot;
  // Abierto sin línea (un refetch la sacó antes de abrir): se cierra, para que
  // el próximo clic vuelva a ser una apertura y tome su copia.
  useEffect(() => {
    if (missingLine) onClose();
  }, [missingLine, onClose]);
  if (!session.snapshot) return null;

  if (session.snapshot.categoria_producto === null) {
    return (
      <CatalogAltaCategoryDialog
        key={session.id}
        pedidoId={pedidoId}
        open={open}
        line={session.snapshot}
        // La categoría que la línea tiene AHORA (el detalle se relee mientras
        // el diálogo está abierto); `line` es la copia de la apertura.
        liveCategoria={line?.categoria_producto ?? null}
        onClose={onClose}
      />
    );
  }
  return (
    <CatalogAltaConfirmDialogContent
      key={session.id}
      pedidoId={pedidoId}
      open={open}
      line={session.snapshot}
      onClose={onClose}
    />
  );
}

type ContentProps = Omit<CatalogAltaConfirmDialogProps, "line"> & { line: SpecialOrderLine };

const describePendientes = (line: SpecialOrderLine): string =>
  line.tallas
    .filter(isTallaPendingCatalogAlta)
    .map((talla) => talla.talla_nombre || "—")
    .join(", ");

function CatalogAltaConfirmDialogContent({ pedidoId, open, line, onClose }: ContentProps) {
  const { altaCatalogo, isPending } = useAltaCatalogoLinea(pedidoId, line.id);

  const pendientes = describePendientes(line);
  // Alta incremental: el backend cuelga las tallas nuevas del producto de
  // catálogo que la línea ya tenga.
  const yaEnCatalogo = line.tallas.some((talla) => talla.aplica_catalogo);
  const categoria = line.categoria_producto?.nombre ?? "—";

  const description = yaEnCatalogo
    ? `Se agregará un SKU de catálogo por cada talla pendiente (${pendientes}) al producto que la línea ya tiene en catálogo, con su lista de materiales, para que salgan en Nueva OP y en los movimientos de stock.`
    : `Se creará el producto de catálogo (categoría ${categoria}) y un SKU por cada talla pendiente (${pendientes}), con su lista de materiales, para que salgan en Nueva OP y en los movimientos de stock.`;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Dar de alta en catálogo"
      description={`${line.producto_nombre_externo || "Línea de muestra"}: ${description}`}
      confirmText={isPending ? "Dando de alta..." : "Dar de alta"}
      confirmColor="blue"
      closeOnConfirm={false}
      busy={isPending}
      onConfirm={() => altaCatalogo({ onSettled: onClose })}
    />
  );
}

/**
 * Alta de una línea SIN categoría: se elige una y el backend la guarda en la
 * línea junto con el alta (nucleo-erp #797).
 *
 * Solo se ofrecen las categorías que admiten todas las tallas de la línea
 * (`getCategoriesCoveringLine`); si ninguna, se explica y no se puede
 * confirmar. Un rechazo de la categoría (`categoria_producto` o
 * `alta_catalogo`) va bajo el selector y el diálogo sigue abierto para elegir
 * otra; el resto, en el toast del hook, y se cierra.
 *
 * Si mientras está abierto la línea recibe categoría en otra sesión
 * (`liveCategoria`), se avisa, se quita el selector y el alta se envía sin
 * `categoria_producto` (`resolveCategoryAltaSubmit`): el backend ignoraría la
 * elegida y usaría la de la línea.
 */
function CatalogAltaCategoryDialog({
  pedidoId,
  open,
  line,
  liveCategoria,
  onClose,
}: ContentProps & { liveCategoria: SpecialOrderCategoria | null }) {
  const { altaCatalogo, isPending } = useAltaCatalogoLinea(pedidoId, line.id);
  const categoriesQuery = useProductCategories();
  const sizesQuery = useSizes();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  // Desde el envío hasta un rechazo, la categoría en vivo no cuenta: el alta
  // propia se la da a la línea y el aviso de "otra sesión" no debe asomar
  // mientras el diálogo se cierra.
  const [submitted, setSubmitted] = useState(false);
  const fieldErrorId = useId();
  const gainedCategoria = submitted ? null : liveCategoria;

  const covering = getCategoriesCoveringLine(categoriesQuery.categories, line, sizesQuery.sizes).sort(
    (a, b) => a.nombre.localeCompare(b.nombre, "es"),
  );
  // Una elegida que una relectura dejó fuera ya no se puede enviar.
  const selected = covering.find((category) => category.id === selectedId) ?? null;
  const isLoading = categoriesQuery.isLoading || sizesQuery.isLoading;
  const isInitialError = categoriesQuery.isInitialError || sizesQuery.isInitialError;
  // Los hooks de catálogo no exponen `isFetching`; se lee de la caché por su
  // llave EXACTA (`["sizes"]` como prefijo también contaría las tallas por categoría).
  const isRetrying =
    useIsFetching({ queryKey: ["product-categories"], exact: true }) +
      useIsFetching({ queryKey: ["sizes"], exact: true }) >
    0;
  const submission = resolveCategoryAltaSubmit(gainedCategoria, selected?.id ?? null);
  const tallas = getLineSizeNames(line).join(", ");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submission === null || isPending) return;
    setFieldError(null);
    setSubmitted(true);
    altaCatalogo({
      categoriaProductoId: submission.categoriaProductoId,
      onSuccess: onClose,
      onError: (parsed) => {
        if (isCategoryRejection(parsed)) {
          setSubmitted(false);
          setFieldError(parsed.message);
        } else onClose();
      },
    });
  };

  return (
    <MainDialog
      title={
        <DialogHeader
          title="Dar de alta en catálogo"
          subtitle={line.producto_nombre_externo || "Línea de muestra"}
          statusColor="sky"
        />
      }
      open={open}
      onOpenChange={(next) => {
        if (!next && !isPending) onClose();
      }}
      maxWidth="560px"
      showCloseButton={false}
    >
      <form onSubmit={handleSubmit} className="w-full space-y-5" noValidate>
        {gainedCategoria ? (
          <div
            role="status"
            className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300"
          >
            Mientras elegías, la línea recibió la categoría{" "}
            <span className="font-semibold">{gainedCategoria.nombre}</span>. Se dará de alta con
            ella: se creará el producto de catálogo y un SKU por cada talla pendiente (
            {describePendientes(line)}), con su lista de materiales.
          </div>
        ) : (
          <>
          <p className={`text-sm ${MUTED_CLS}`}>
            La línea no tiene categoría de producto. La que elijas se guardará en la línea y con ella
            se creará el producto de catálogo y un SKU por cada talla pendiente (
            {describePendientes(line)}), con su lista de materiales.
          </p>

          {/* Enter en el buscador NO envía: se escribe ahí para filtrar. */}
          <fieldset
            disabled={isPending}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? fieldErrorId : undefined}
            className="space-y-2"
            onKeyDown={(event) => {
              if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
                event.preventDefault();
              }
            }}
          >
            <legend className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Categoría de producto
            </legend>
            {isInitialError ? (
              <SectionErrorNotice
                variant="inline"
                message="No se pudieron cargar las categorías y tallas para elegir la categoría."
                onRetry={() => {
                  if (categoriesQuery.isInitialError) void categoriesQuery.refetch();
                  if (sizesQuery.isInitialError) void sizesQuery.refetch();
                }}
                isRetrying={isRetrying}
              />
            ) : isLoading ? (
              <p role="status" className={`py-6 text-center text-sm ${MUTED_CLS}`}>
                Cargando categorías...
              </p>
            ) : (
              <SearchableSelectList
                items={covering}
                pinSelected
                searchPlaceholder="Buscar categoría…"
                filterPredicate={(category, term) =>
                  category.nombre.toLowerCase().includes(term) ||
                  category.codigo.toLowerCase().includes(term)
                }
                getKey={(category) => category.id}
                isSelected={(category) => category.id === selectedId}
                onSelect={(category) => {
                  setSelectedId(category.id);
                  setFieldError(null);
                }}
                renderIndicator={renderRadioIndicator}
                renderContent={(category) => (
                  <>
                    <span className="block truncate text-sm font-medium text-slate-700 dark:text-slate-100">
                      {category.nombre}
                    </span>
                    <span className={`block truncate text-xs ${MUTED_CLS}`}>
                      {category.codigo}
                      {category.descripcion && category.descripcion !== category.nombre
                        ? ` · ${category.descripcion}`
                        : ""}
                    </span>
                  </>
                )}
                emptyMessage={`Ninguna categoría activa admite todas las tallas de la línea (${tallas}), así que no se puede dar de alta en catálogo.`}
                noResultsMessage="Ninguna categoría coincide con la búsqueda."
              />
            )}
            {fieldError && (
              <p id={fieldErrorId} role="alert" className="ml-1 text-xs text-red-600 dark:text-red-400">
                {fieldError}
              </p>
            )}
            {!isLoading && !isInitialError && covering.length > 0 && (
              <p className={`ml-1 text-xs ${MUTED_CLS}`}>
                Solo se muestran las categorías que admiten todas las tallas de la línea ({tallas}).
              </p>
            )}
          </fieldset>
          </>
        )}

        <div className="flex justify-end gap-3 pb-2">
          <FormCancelButton label="Cancelar" onClick={onClose} disabled={isPending} />
          <FormSubmitButton
            isPending={isPending}
            loadingLabel="Dando de alta..."
            disabled={submission === null}
          >
            Dar de alta
          </FormSubmitButton>
        </div>
      </form>
    </MainDialog>
  );
}
