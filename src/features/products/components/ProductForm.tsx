"use client";

import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useProductStore } from "../stores/product.store";
import { ProductFormSchema, ProductFormValues } from "../schemas/product.schema";
import { FormInput } from "../../../components/FormInput";
import { FormSelect } from "../../../components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { InfoIcon, ProductIcon, SettingsIcon } from "../../../components/Icons";
import toast from "react-hot-toast";
import { useProductCategoryStore } from "../../product-categories/stores/product-category.store";
import { useUnitOfMeasureStore } from "../../units-of-measure/stores/unit-of-measure.store";
import { useTaxStore } from "../../taxes/stores/tax.store";
import { useSatProdservCodeStore } from "../../sat-prodserv-codes/stores/sat-prodserv-code.store";
import { useSatUnitCodeStore } from "../../sat-unit-codes/stores/sat-unit-code.store";
import { useProductTypes } from "../../product-types/hooks/useProductTypes";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";
import MissingPrerequisites from "./MissingPrerequisites";

interface ProductFormProps {
  onSuccess: () => void;
}

export default function ProductForm({ onSuccess }: ProductFormProps) {

  // Obtener funciones y estado del store de productos
  const addProduct = useProductStore((state) => state.addProduct);
  const updateProduct = useProductStore((state) => state.updateProduct);
  const selectedProduct = useProductStore((state) => state.selectedProduct);
  const isLoading = useProductStore((state) => state.isLoading);
  const setIsLoading = useProductStore((state) => state.setIsLoading);

  // Obtener la empresa seleccionada del store de espacios de trabajo
  const selectedCompany = useWorkspaceStore((state) => state.selectedCompany);

  // Obtener categorías, unidades, impuestos, claves SAT y tipos de producto de los stores correspondientes
  const { categories } = useProductCategoryStore((state) => state);
  const { units } = useUnitOfMeasureStore((state) => state);
  const { taxes } = useTaxStore((state) => state);
  const { satProdservCodes } = useSatProdservCodeStore((state) => state);
  const { satUnitCodes } = useSatUnitCodeStore((state) => state);
  const { productTypes, isLoading: isLoadingProductTypes } = useProductTypes();

  // Filtrar categorías, unidades, impuestos, claves SAT y tipos de producto activos
  const activeCategories = categories.filter((category) => category.activo);
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
    activeCategories.length === 0 ? "Categorías de producto" : null,
    productTypes.length === 0 && !isLoadingProductTypes ? "Tipos de producto" : null,
    activeUnits.length === 0 ? "Unidades de medida" : null,
    activeTaxes.length === 0 ? "Impuestos" : null,
    activeSatProdservCodes.length === 0 ? "Claves SAT Prod/Serv" : null,
    activeSatUnitCodes.length === 0 ? "Claves SAT Unidad" : null,
  ].filter((item): item is string => Boolean(item));

  const isEditing = Boolean(selectedProduct?.id); // Comprobar si se está editando un producto existente
  const emptyValues: ProductFormValues = { // Valores por defecto para el formulario
    nombre: "",
    descripcion: "",
    tipo: 0,
    categoria_producto_id: 0,
    unidad_medida_id: 0,
    impuesto_id: 0,
    sat_prodserv_id: 0,
    sat_unidad_id: 0,
    activo: true,
  };

  // Comprobar si el producto seleccionado tiene categorías, tipos, unidades, impuestos, claves SAT Prod/Serv y claves SAT Unidad activos
  const hasCategory = activeCategories.some(
    (category) => category.id === selectedProduct?.categoria_producto_id
  );
  const hasType = productTypes.some((type) => type.id === selectedProduct?.tipo);
  const hasUnit = activeUnits.some((unit) => unit.id === selectedProduct?.unidad_medida_id);
  const hasTax = activeTaxes.some((tax) => tax.id === selectedProduct?.impuesto_id);
  const hasSatProdserv = activeSatProdservCodes.some(
    (code) => code.id_sat_prodserv === selectedProduct?.sat_prodserv_id
  );
  const hasSatUnit = activeSatUnitCodes.some(
    (code) => code.id_sat_unidad === selectedProduct?.sat_unidad_id
  );

  const editValues: ProductFormValues = selectedProduct // Valores para editar un producto existente
    ? {
        nombre: selectedProduct.nombre,
        descripcion: selectedProduct.descripcion,
        tipo: hasType ? selectedProduct.tipo : 0,
        categoria_producto_id: hasCategory ? selectedProduct.categoria_producto_id : 0,
        unidad_medida_id: hasUnit ? selectedProduct.unidad_medida_id : 0,
        impuesto_id: hasTax ? selectedProduct.impuesto_id : 0,
        sat_prodserv_id: hasSatProdserv ? selectedProduct.sat_prodserv_id : 0,
        sat_unidad_id: hasSatUnit ? selectedProduct.sat_unidad_id : 0,
        activo: selectedProduct.activo,
      }
    : emptyValues;

  // Configurar el formulario con valores por defecto y valores para editar si es necesario
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(ProductFormSchema) as Resolver<ProductFormValues>,
    defaultValues: emptyValues,
    values: isEditing ? editValues : undefined,
  });

  const isActive = watch("activo"); // Obtener el valor del campo activo del formulario

  // Manejar la submisión del formulario
  const onSubmit = async (data: ProductFormValues) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simular una demora en la submisión

      const now = new Date().toISOString(); // Obtener la fecha y hora actual en formato ISO

      if (selectedProduct) { // Actualizar un producto existente
        updateProduct({
          ...selectedProduct,
          ...data,
          updated_at: now,
        });
        toast.success("Producto actualizado correctamente");
      } else { // Registrar un nuevo producto
        addProduct({
          id: Date.now(),
          empresa_id: selectedCompany.id!,
          nombre: data.nombre,
          descripcion: data.descripcion,
          tipo: data.tipo,
          categoria_producto_id: data.categoria_producto_id,
          unidad_medida_id: data.unidad_medida_id,
          impuesto_id: data.impuesto_id,
          sat_prodserv_id: data.sat_prodserv_id,
          sat_unidad_id: data.sat_unidad_id,
          activo: data.activo,
          created_at: now,
          updated_at: now,
        });
        toast.success("Producto registrado correctamente");
      }
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error al guardar el producto");
    } finally {
      setIsLoading(false);
    }
  };

  // Comprobar si hay elementos faltantes en el formulario
  if (missingItems.length > 0) {
    return <MissingPrerequisites items={missingItems} />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      <fieldset disabled={isLoading} className="group-disabled:opacity-50">
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
                  {...register("tipo", { valueAsNumber: true })}
                  error={errors.tipo}
                >
                  <option value="0" disabled>
                    Seleccionar...
                  </option>
                  {productTypes.map((type) => (
                    <option
                      key={type.id}
                      value={type.id}
                      className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                    >
                      {type.codigo}
                    </option>
                  ))}
                </FormSelect>
              </div>

              <FormSelect
                label="Categoría"
                {...register("categoria_producto_id", { valueAsNumber: true })}
                error={errors.categoria_producto_id}
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

              <div className="group/field md:col-span-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within:text-sky-500">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe el producto"
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all dark:text-white resize-none"
                  {...register("descripcion")}
                />
                {errors.descripcion && (
                  <p className="text-xs text-red-600 mt-1">{errors.descripcion.message}</p>
                )}
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
                {...register("unidad_medida_id", { valueAsNumber: true })}
                error={errors.unidad_medida_id}
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
                {...register("impuesto_id", { valueAsNumber: true })}
                error={errors.impuesto_id}
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
                {...register("sat_prodserv_id", { valueAsNumber: true })}
                error={errors.sat_prodserv_id}
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
                {...register("sat_unidad_id", { valueAsNumber: true })}
                error={errors.sat_unidad_id}
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
                    {...register("activo")}
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

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <FormCancelButton
            onClick={() => reset(isEditing ? editValues : emptyValues)}
            disabled={isLoading}
          />
          <FormSubmitButton isPending={isLoading} loadingLabel="Guardando...">
            {isEditing ? "Actualizar Producto" : "Registrar Producto"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
