"use client";

import { useRef, useState } from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProductFormSchema, ProductFormValues } from "../schemas/product.schema";
import { FormInput } from "../../../components/FormInput";
import { FormSelect } from "../../../components/FormSelect";
import { FormTextarea } from "../../../components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { InfoIcon, ProductIcon, SettingsIcon } from "../../../components/Icons";
import { useProductCategories } from "../../product-categories/hooks/useProductCategories";
import { useUnitsOfMeasure } from "../../units-of-measure/hooks/useUnitsOfMeasure";
import { useTaxes } from "../../taxes/hooks/useTaxes";
import { useSatUnitCodes } from "../../sat-unit-codes/hooks/useSatUnitCodes";
import { useProductTypes } from "../../product-types/hooks/useProductTypes";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";
import MissingPrerequisites from "./MissingPrerequisites";
import { useSatProdServCodes } from "../../sat-prodserv-codes/hooks/useSatProdServCodes";
import { useCreateProduct } from "../hooks/useCreateProduct";
import { useUpdateProduct } from "../hooks/useUpdateProduct";
import { Product } from "../interfaces/product.interface";

interface ProductFormProps {
  onSuccess: () => void;
  productToEdit?: Product | null;
}

export default function ProductForm({ onSuccess, productToEdit }: ProductFormProps) {
  // Obtener la empresa seleccionada del store de espacios de trabajo
  const selectedCompany = useWorkspaceStore((state) => state.selectedCompany);

  // Obtener categorías, unidades, impuestos, claves SAT y tipos de producto de los stores correspondientes
  const { categories, isLoading: isLoadingProductCategories } = useProductCategories();
  const { units, isLoading: isLoadingUnits } = useUnitsOfMeasure();
  const { taxes, isLoading: isLoadingTaxes } = useTaxes();
  const { satProdservCodes, isLoading: isLoadingSatProdservCodes } = useSatProdServCodes();
  const { satUnitCodes, isLoading: isLoadingSatUnitCodes } = useSatUnitCodes();
  const { productTypes, isLoading: isLoadingProductTypes } = useProductTypes();

  // Filtrar categorías, unidades, impuestos, claves SAT y tipos de producto activos
  const activeCategories = categories;
  const activeUnits = units.filter((unit) => unit.estatus);
  const activeTaxes = taxes.filter((tax) => tax.estatus);
  const activeSatProdservCodes = satProdservCodes.filter(
    (code) => (code.estatus || "").toLowerCase() === "activo"
  );
  const activeSatUnitCodes = satUnitCodes.filter(
    (code) => (code.estatus || "").toLowerCase() === "activo"
  );

  // Comprobar si faltan productos, colores, tallas, categorías, unidades, impuestos, claves SAT Prod/Serv, claves SAT Unidad o tipos de producto activos
  const missingItems = [
    activeCategories.length === 0 && !isLoadingProductCategories ? "Categorías de producto" : null,
    productTypes.length === 0 && !isLoadingProductTypes ? "Tipos de producto" : null,
    activeUnits.length === 0 && !isLoadingUnits ? "Unidades de medida" : null,
    activeTaxes.length === 0 && !isLoadingTaxes ? "Impuestos" : null,
    activeSatProdservCodes.length === 0 && !isLoadingSatProdservCodes
      ? "Claves SAT Prod/Serv"
      : null,
    activeSatUnitCodes.length === 0 && !isLoadingSatUnitCodes ? "Claves SAT Unidad" : null,
  ].filter((item): item is string => Boolean(item));

  const isEditing = Boolean(productToEdit?.id); // Comprobar si se está editando un producto existente
  const emptyValues: ProductFormValues = { // Valores por defecto para el formulario
    nombre: "",
    descripcion: "",
    tipo: "",
    categoria_producto: 0,
    unidad_medida: 0,
    impuesto: 0,
    sat_prodserv: 0,
    sat_unidad: 0,
    activo: true,
  };

  // Comprobar si el producto seleccionado tiene categorías, tipos, unidades, impuestos, claves SAT Prod/Serv y claves SAT Unidad activos
  const hasCategory = activeCategories.some(
    (category) => category.id === productToEdit?.categoria_producto
  );
  const productTypeCode = productToEdit?.tipo ?? "";
  const hasType = productTypes.some((type) => type.codigo === productTypeCode);
  const hasUnit = activeUnits.some((unit) => unit.id === productToEdit?.unidad_medida);
  const hasTax = activeTaxes.some((tax) => tax.id === productToEdit?.impuesto);
  const hasSatProdserv = activeSatProdservCodes.some(
    (code) => code.id_sat_prodserv === productToEdit?.sat_prodserv
  );
  const hasSatUnit = activeSatUnitCodes.some(
    (code) => code.id_sat_unidad === productToEdit?.sat_unidad
  );

  const editValues: ProductFormValues = productToEdit // Valores para editar un producto existente
    ? {
        nombre: productToEdit.nombre,
        descripcion: productToEdit.descripcion,
        tipo: hasType ? productTypeCode : "",
        categoria_producto: hasCategory ? productToEdit.categoria_producto : 0,
        unidad_medida: hasUnit ? productToEdit.unidad_medida : 0,
        impuesto: hasTax ? productToEdit.impuesto : 0,
        sat_prodserv: hasSatProdserv ? productToEdit.sat_prodserv : 0,
        sat_unidad: hasSatUnit ? productToEdit.sat_unidad : 0,
        activo: productToEdit.activo,
      }
    : emptyValues;

  // Configurar el formulario con valores por defecto y valores para editar si es necesario
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    getValues,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(ProductFormSchema) as Resolver<ProductFormValues>,
    defaultValues: emptyValues,
    values: isEditing ? editValues : undefined,
  });

  const formRef = useRef<HTMLFormElement | null>(null);
  const [keepCreating, setKeepCreating] = useState(false);

  // eslint-disable-next-line react-hooks/incompatible-library
  const isActive = watch("activo"); // Obtener el valor del campo activo del formulario
  const { mutateAsync: createProduct, isPending: isCreating } = useCreateProduct(setError);
  const { mutateAsync: updateProduct, isPending: isUpdating } = useUpdateProduct(setError);
  const isPending = isCreating || isUpdating;

  // Manejar la submisión del formulario
  const onSubmit = async (data: ProductFormValues) => {
    try {
      if (isEditing && productToEdit) { // Actualizar un producto existente
        await updateProduct({
          id: productToEdit.id,
          empresa: productToEdit.empresa ?? selectedCompany.id!,
          ...data,
        });
        reset(editValues);
        onSuccess();
        return;
      } else { // Registrar un nuevo producto
        await createProduct({
          empresa: selectedCompany.id!,
          ...data,
        });
        if (keepCreating) {
          const currentValues = getValues();
          reset({
            ...currentValues,
            nombre: "",
            descripcion: "",
          });
          setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 0);
          return;
        }
        reset(emptyValues);
      }
      onSuccess();
    } catch (error) {
      console.error(error);
    }
  };

  // Comprobar si hay elementos faltantes en el formulario
  if (missingItems.length > 0) {
    return <MissingPrerequisites items={missingItems} />;
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="w-full">
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        <section className="mb-8">
          <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-8 border border-slate-100 dark:border-white/5">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <ProductIcon className="w-4 h-4" />
              Información General
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field md:col-span-2">
                <FormInput
                  label="Nombre"
                  placeholder="Ej. Playera básica"
                  className="text-2xl font-bold"
                  variant="ghost"
                  {...register("nombre")}
                  error={errors.nombre}
                />
              </div>

              <div className="group/field">
                <FormSelect
                  label="Tipo"
                  {...register("tipo")}
                  error={errors.tipo}
                >
                  <option value="" disabled>
                    Seleccionar...
                  </option>
                  {productTypes.map((type) => (
                    <option
                      key={type.id}
                      value={type.codigo}
                      className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                    >
                      {type.codigo}
                    </option>
                  ))}
                </FormSelect>
              </div>

              <FormSelect
                label="Categoría"
                {...register("categoria_producto", { valueAsNumber: true })}
                error={errors.categoria_producto}
              >
                <option value="0" disabled>
                  Seleccionar...
                </option>
                  {activeCategories.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                    className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                  >
                    {category.nombre}
                  </option>
                ))}
              </FormSelect>

              <div className="md:col-span-2">
                <FormTextarea
                  label="Descripción"
                  rows={3}
                  placeholder="Describe el producto"
                  {...register("descripcion")}
                  error={errors.descripcion}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-8 border border-slate-100 dark:border-white/5">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <InfoIcon className="w-4 h-4" />
              Clasificación y SAT
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              <FormSelect
                label="Unidad de Medida"
                {...register("unidad_medida", { valueAsNumber: true })}
                error={errors.unidad_medida}
              >
                <option value="0" disabled>
                  Seleccionar...
                </option>
                  {activeUnits.map((unit) => (
                  <option
                    key={unit.id}
                    value={unit.id}
                    className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                  >
                    {unit.clave} - {unit.nombre}
                  </option>
                ))}
              </FormSelect>

              <FormSelect
                label="Impuesto"
                {...register("impuesto", { valueAsNumber: true })}
                error={errors.impuesto}
              >
                <option value="0" disabled>
                  Seleccionar...
                </option>
                  {activeTaxes.map((tax) => (
                  <option
                    key={tax.id}
                    value={tax.id}
                    className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                  >
                    {tax.nombre}
                  </option>
                ))}
              </FormSelect>

              <FormSelect
                label="SAT Prod/Serv"
                {...register("sat_prodserv", { valueAsNumber: true })}
                error={errors.sat_prodserv}
              >
                <option value="0" disabled>
                  Seleccionar...
                </option>
                  {activeSatProdservCodes.map((code) => (
                  <option
                    key={code.id_sat_prodserv}
                    value={code.id_sat_prodserv}
                    className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                  >
                    {code.codigo} - {code.descripcion}
                  </option>
                ))}
              </FormSelect>

              <FormSelect
                label="SAT Unidad"
                {...register("sat_unidad", { valueAsNumber: true })}
                error={errors.sat_unidad}
              >
                <option value="0" disabled>
                  Seleccionar...
                </option>
                  {activeSatUnitCodes.map((code) => (
                  <option
                    key={code.id_sat_unidad}
                    value={code.id_sat_unidad}
                    className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                  >
                    {code.codigo} - {code.descripcion}
                  </option>
                ))}
              </FormSelect>
            </div>
          </div>
        </section>

        <div className="w-full">
          <div className="w-full space-y-8">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
                  <SettingsIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                    Estado
                  </h3>
                  <p className="text-xs text-slate-500">Control de disponibilidad</p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 px-4 py-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                    {...register("activo", { setValueAs: (value) => Boolean(value) })}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {isActive ? "Producto activo" : "Producto inactivo"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isActive ? "Disponible para catálogos" : "No disponible para selección"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pb-8 mt-8 sm:flex-row sm:items-center sm:justify-end">
          {!isEditing ? (
            <label className="inline-flex items-center gap-2 rounded-xl border cursor-pointer border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={keepCreating}
                onChange={(event) => setKeepCreating(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 focus:ring-sky-500"
                aria-label="Seguir registrando"
              />
              Seguir registrando
            </label>
          ) : null}
          <FormCancelButton
            onClick={() => reset(isEditing ? editValues : emptyValues)}
            disabled={isPending}
          />
          <FormSubmitButton
            isPending={isPending}
            loadingLabel={isEditing ? "Actualizando..." : "Guardando..."}
          >
            {isEditing ? "Actualizar Producto" : "Registrar Producto"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
