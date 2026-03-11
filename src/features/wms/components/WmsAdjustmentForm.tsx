"use client";

import { useMemo, useState } from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { FormSubmitButton } from "@/src/components/FormButtons";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import {
  WmsAdjustmentFormValues,
  WmsAdjustmentSchema,
} from "../schemas/wms-adjustment.schema";
import { WmsAdjustmentReason } from "../interfaces/wms-adjustment.interface";
import { useWmsAdjustmentStore } from "../stores/wms-adjustment.store";

type SimulatedStockByLocation = {
  producto: string;
  ubicacion: string;
  cantidad: number;
};

const simulatedStock: SimulatedStockByLocation[] = [
  { producto: "Caja Corrugada 30x20 (BX-320)", ubicacion: "A-01-03", cantidad: 120 },
  { producto: "Caja Corrugada 30x20 (BX-320)", ubicacion: "A-02-01", cantidad: 48 },
  { producto: "Caja Corrugada 30x20 (BX-320)", ubicacion: "B-01-02", cantidad: 0 },
  { producto: "Etiqueta Térmica 100x50 (ET-100)", ubicacion: "A-01-03", cantidad: 310 },
  { producto: "Etiqueta Térmica 100x50 (ET-100)", ubicacion: "C-02-05", cantidad: 200 },
  { producto: "Film Stretch Industrial (FS-01)", ubicacion: "B-01-02", cantidad: 26 },
  { producto: "Film Stretch Industrial (FS-01)", ubicacion: "C-02-05", cantidad: 0 },
  { producto: "Tarima de Madera Estándar (TM-10)", ubicacion: "A-02-01", cantidad: 12 },
];

const motivoOptions: { value: WmsAdjustmentReason; label: string }[] = [
  { value: "Conteo físico", label: "Conteo físico" },
  { value: "Merma", label: "Merma" },
  { value: "Error sistema", label: "Error sistema" },
  { value: "Producto dañado", label: "Producto dañado" },
];

const getCurrentQuantity = (producto: string, ubicacion: string) => {
  const row = simulatedStock.find(
    (item) => item.producto === producto && item.ubicacion === ubicacion
  );
  return row?.cantidad ?? 0;
};

export const WmsAdjustmentForm = () => {
  const addAdjustment = useWmsAdjustmentStore((state) => state.addAdjustment);
  const { data: session } = useSession();
  const userName = session?.user?.name || "Usuario";

  const productoOptions = useMemo(
    () =>
      Array.from(new Set(simulatedStock.map((item) => item.producto))).map(
        (producto) => ({
          value: producto,
          label: producto,
        })
      ),
    []
  );

  const ubicacionOptions = useMemo(
    () =>
      Array.from(new Set(simulatedStock.map((item) => item.ubicacion))).map(
        (ubicacion) => ({
          value: ubicacion,
          label: ubicacion,
        })
      ),
    []
  );

  const defaultProducto = productoOptions[0]?.value ?? "";
  const defaultUbicacion = ubicacionOptions[0]?.value ?? "";
  const defaultCantidadActual = getCurrentQuantity(defaultProducto, defaultUbicacion);

  const defaultValues: WmsAdjustmentFormValues = {
    producto: defaultProducto,
    ubicacion: defaultUbicacion,
    cantidadActual: defaultCantidadActual,
    cantidadCorrecta: defaultCantidadActual,
    motivo: "Conteo físico",
  };
  const [cantidadActualView, setCantidadActualView] = useState(defaultCantidadActual);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<WmsAdjustmentFormValues>({
    resolver: zodResolver(WmsAdjustmentSchema) as Resolver<WmsAdjustmentFormValues>,
    defaultValues,
  });

  const onSubmit = async (values: WmsAdjustmentFormValues) => {
    addAdjustment({
      ...values,
      usuario: userName,
    });
    toast.success("Ajuste guardado correctamente");
    reset(defaultValues);
    setCantidadActualView(defaultCantidadActual);
  };

  const productoField = register("producto", {
    onChange: (e) => {
      const selectedProducto = e.target.value;
      const currentUbicacion = getValues("ubicacion");
      const quantity = getCurrentQuantity(selectedProducto, currentUbicacion);
      setValue("cantidadActual", quantity, { shouldValidate: true });
      setCantidadActualView(quantity);
    },
  });
  const ubicacionField = register("ubicacion", {
    onChange: (e) => {
      const selectedUbicacion = e.target.value;
      const currentProducto = getValues("producto");
      const quantity = getCurrentQuantity(currentProducto, selectedUbicacion);
      setValue("cantidadActual", quantity, { shouldValidate: true });
      setCantidadActualView(quantity);
    },
  });
  const motivoField = register("motivo");

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
          Ajustes de inventario
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Motivo obligatorio
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="w-full">
            <FormSelect
              label="Producto"
              options={productoOptions}
              {...productoField}
              error={errors.producto}
            />
          </div>

          <div className="w-full">
            <FormSelect
              label="Ubicación"
              options={ubicacionOptions}
              {...ubicacionField}
              error={errors.ubicacion}
            />
          </div>

          <div className="w-full">
            <FormInput
              label="Cantidad actual"
              type="number"
              readOnly
              disabled
              value={String(cantidadActualView)}
              {...register("cantidadActual", { valueAsNumber: true })}
              error={errors.cantidadActual}
            />
          </div>

          <div className="w-full">
            <FormInput
              label="Cantidad correcta"
              type="number"
              placeholder="Ej: 120"
              {...register("cantidadCorrecta", {
                valueAsNumber: true,
                setValueAs: (value) => (value === "" ? 0 : Number(value)),
              })}
              error={errors.cantidadCorrecta}
            />
          </div>
        </div>

        <div className="w-full">
          <FormSelect
            label="Motivo"
            options={motivoOptions}
            {...motivoField}
            error={errors.motivo}
          />
        </div>

        <div className="flex justify-end">
          <FormSubmitButton isPending={isSubmitting}>Guardar ajuste</FormSubmitButton>
        </div>
      </form>
    </div>
  );
};
