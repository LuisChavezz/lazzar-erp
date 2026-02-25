"use client";

import { useSession } from "next-auth/react";
import { useForm, useFieldArray, useWatch, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { PedidosIcon } from "@/src/components/Icons";
import { orderFormSchema, OrderFormValues } from "../schema/order.schema";
import { getFieldError } from "../../../utils/getFieldError";
import { formatCurrency } from "../../../utils/formatCurrency";
import { useOrderStore } from "../stores/order.store";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Order } from "../interfaces/order.interface";
import { Loader } from "@/src/components/Loader";
import { useState } from "react";

const defaultItem: OrderFormValues["items"][number] = {
  sku: "",
  descripcion: "",
  unidad: "PZA",
  cantidad: 1,
  precio: 0,
  descuento: 0,
  importe: 0,
};

interface OrderFormProps {
  orderId?: string;
}

export default function OrderForm({ orderId }: OrderFormProps) {
  const { data: session } = useSession();
  const userName = session?.user?.name || "Usuario";
  const userId = session?.user?.id ?? "";
  const isEditing = Boolean(orderId);

  const todayStr = new Date().toISOString().split("T")[0];
  const addOrder = useOrderStore((s) => s.addOrder);
  const updateOrder = useOrderStore((s) => s.updateOrder);
  const orderToEdit = useOrderStore((s) =>
    orderId ? s.orders.find((o) => o.id === orderId) : undefined
  );
  const router = useRouter();

  const emptyValues: OrderFormValues = {
    clienteId: "",
    clienteNombre: "",
    pedidoCliente: "",
    fecha: todayStr,
    fechaVence: "",
    agente: "",
    comision: 0,
    plazo: 30,
    sucursal: "matriz",
    almacen: "general",
    canal: "mayorista",
    puntos: 0,
    anticipoReq: 0,
    pedidoInicial: false,
    estatusPedido: "capturado",
    docRelacionado: "",
    observaciones: "",
    flete: 0,
    seguro: 0,
    anticipo: 0,
    iva: 0.16,
    items: [defaultItem],
  };

  const editValues: OrderFormValues = orderToEdit
    ? {
        clienteId: orderToEdit.clienteId,
        clienteNombre: orderToEdit.clienteNombre,
        pedidoCliente: orderToEdit.pedidoCliente,
        fecha: orderToEdit.fecha,
        fechaVence: orderToEdit.fechaVence,
        agente: orderToEdit.agente,
        comision: orderToEdit.comision,
        plazo: orderToEdit.plazo,
        sucursal: orderToEdit.sucursal,
        almacen: orderToEdit.almacen,
        canal: orderToEdit.canal,
        puntos: orderToEdit.puntos,
        anticipoReq: orderToEdit.anticipoReq,
        pedidoInicial: orderToEdit.pedidoInicial,
        estatusPedido: orderToEdit.estatusPedido,
        docRelacionado: orderToEdit.docRelacionado,
        observaciones: orderToEdit.observaciones ?? "",
        flete: orderToEdit.totals.flete,
        seguro: orderToEdit.totals.seguro,
        anticipo: orderToEdit.totals.anticipo,
        iva: orderToEdit.totals.ivaRate,
        items: orderToEdit.items.map((i) => ({ ...i })),
      }
    : emptyValues;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema) as Resolver<OrderFormValues>,
    defaultValues: emptyValues,
    values: isEditing ? editValues : undefined,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = useWatch({ control, name: "items" });
  const watchedFlete = useWatch({ control, name: "flete" });
  const watchedSeguro = useWatch({ control, name: "seguro" });
  const watchedAnticipo = useWatch({ control, name: "anticipo" });
  const watchedIva = useWatch({ control, name: "iva" });

  const {
    subtotal,
    descuentoTotal,
    ivaAmount,
    granTotal,
    saldoPendiente,
  } = (() => {
    const items = watchedItems || [];
    let subtotalValue = 0;
    let descuentoValue = 0;

    items.forEach((item) => {
      const cantidad = Number(item?.cantidad) || 0;
      const precio = Number(item?.precio) || 0;
      const descuento = Number(item?.descuento) || 0;
      const amount = cantidad * precio;
      const descuentoAmount = amount * (descuento / 100);
      subtotalValue += amount;
      descuentoValue += descuentoAmount;
    });

    const fleteValue = Number(watchedFlete) || 0;
    const seguroValue = Number(watchedSeguro) || 0;
    const anticipoValue = Number(watchedAnticipo) || 0;
    const ivaRate = Number(watchedIva) || 0;

    const baseImponible = subtotalValue - descuentoValue + fleteValue + seguroValue;
    const ivaValue = baseImponible * ivaRate;
    const totalValue = baseImponible + ivaValue;
    const saldoValue = totalValue - anticipoValue;

    return {
      subtotal: subtotalValue,
      descuentoTotal: descuentoValue,
      ivaAmount: ivaValue,
      granTotal: totalValue,
      saldoPendiente: saldoValue,
    };
  })();

  const [isLoading, setIsLoading] = useState(false);
  const isPending = isSubmitting || isLoading;

  const computeItemsFrom = (items: OrderFormValues["items"]) =>
    (items || []).map((item) => {
      const cantidad = Number(item.cantidad) || 0;
      const precio = Number(item.precio) || 0;
      const descuento = Number(item.descuento) || 0;
      const amount = cantidad * precio;
      const descuentoAmount = amount * (descuento / 100);
      const importe = Number((amount - descuentoAmount).toFixed(2));
      return { ...item, importe };
    });

  const computeTotalsFrom = (values: OrderFormValues) => {
    const items = values.items || [];
    let subtotalValue = 0;
    let descuentoValue = 0;
    items.forEach((item) => {
      const cantidad = Number(item.cantidad) || 0;
      const precio = Number(item.precio) || 0;
      const descuento = Number(item.descuento) || 0;
      const amount = cantidad * precio;
      const descuentoAmount = amount * (descuento / 100);
      subtotalValue += amount;
      descuentoValue += descuentoAmount;
    });
    const fleteValue = Number(values.flete) || 0;
    const seguroValue = Number(values.seguro) || 0;
    const anticipoValue = Number(values.anticipo) || 0;
    const ivaRate = Number(values.iva) || 0;
    const baseImponible = subtotalValue - descuentoValue + fleteValue + seguroValue;
    const ivaValue = baseImponible * ivaRate;
    const totalValue = baseImponible + ivaValue;
    const saldoValue = totalValue - anticipoValue;
    return {
      subtotal: subtotalValue,
      descuentoTotal: descuentoValue,
      ivaAmount: ivaValue,
      granTotal: totalValue,
      saldoPendiente: saldoValue,
      flete: fleteValue,
      seguro: seguroValue,
      anticipo: anticipoValue,
      ivaRate,
    };
  };

  const makeUpdatedOrder = (values: OrderFormValues): Order => ({
    ...orderToEdit!,
    ...values,
    estatusPedido: values.estatusPedido as Order["estatusPedido"],
    items: computeItemsFrom(values.items),
    totals: computeTotalsFrom(values),
  });

  const makeNewOrder = (values: OrderFormValues): Order => {
    const id = crypto.randomUUID();
    return {
      id,
      folio: `#ORD-${id.split("-")[0].toUpperCase()}`,
      capturadoPor: userId,
      ...values,
      estatusPedido: values.estatusPedido as Order["estatusPedido"],
      items: computeItemsFrom(values.items),
      totals: computeTotalsFrom(values),
    };
  };

  const onSubmit = async (values: OrderFormValues) => {
    setIsLoading(true);
    try {
      if (isEditing && orderToEdit) {
        const updatedOrder = makeUpdatedOrder(values);
        await updateOrder(updatedOrder);
        reset(editValues);
        toast.success("Pedido actualizado correctamente");
      } else {
        const newOrder = makeNewOrder(values);
        await addOrder(newOrder);
        reset(emptyValues);
        toast.success("Pedido registrado correctamente");
      }
      router.replace("/orders");
    } catch {
      toast.error("No se pudo guardar el pedido");
    } finally {
      setIsLoading(false);
    }
  };

  const itemsError = getFieldError(
    errors.items?.root ?? (errors.items as unknown)
  );
  const docRelacionadoError = getFieldError(errors.docRelacionado);

  const showForm = !isEditing || !!orderToEdit;
  if (!showForm) {
    return (
      <div className="w-full pt-2" role="status" aria-live="polite">
        <div className="rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-zinc-900 p-10 text-center">
          <Loader aria-hidden="true" />
          <p className="text-sm mt-2 text-slate-500 dark:text-slate-400">
            Cargando pedido...
          </p>
        </div>
      </div>
    );
  }

  const formKey = isEditing ? `${orderId}-ready` : "new";

  return (
    <form key={formKey} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <PedidosIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-slate-900 dark:text-white text-xl">
                Información Comercial
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Datos principales del pedido y configuración comercial.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400">
                Total Pedido
              </p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white font-mono">
                {formatCurrency(granTotal)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 relative z-10">
          <div className="md:col-span-1 lg:col-span-1">
            <FormInput
              label="Cliente ID"
              placeholder="ID"
              {...register("clienteId")}
              error={errors.clienteId}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <FormInput
              label="Nombre del Cliente"
              placeholder="Razón Social"
              {...register("clienteNombre")}
              error={errors.clienteNombre}
            />
          </div>
          <div className="md:col-span-1 lg:col-span-2">
            <FormInput
              label="Pedido del Cliente (OC)"
              placeholder="Ref. Cliente"
              {...register("pedidoCliente")}
              error={errors.pedidoCliente}
            />
          </div>

          <div className="md:col-span-1">
            <FormInput
              label="Fecha"
              type="date"
              readOnly
              tabIndex={-1}
              className="cursor-not-allowed bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-slate-400 focus:bg-slate-100 dark:focus:bg-zinc-800 focus:ring-0 focus:border-slate-200 dark:focus:border-zinc-700"
              {...register("fecha")}
              error={errors.fecha}
            />
          </div>
          <div className="md:col-span-1">
            <FormInput
              label="Fecha Vence"
              type="date"
              min={todayStr}
              {...register("fechaVence")}
              error={errors.fechaVence}
            />
          </div>
          <div className="md:col-span-1 lg:col-span-2">
            <FormSelect
              label="Agente / Vendedor"
              error={getFieldError(errors.agente)}
              {...register("agente")}
            >
              <option value="" disabled>
                Seleccionar...
              </option>
              <option value="1">Vendedor 1</option>
              <option value="2">Vendedor 2</option>
            </FormSelect>
          </div>
          <div className="md:col-span-1">
            <FormInput
              label="Comisión %"
              type="number"
              placeholder="0%"
              className="text-right"
              {...register("comision", { valueAsNumber: true })}
              error={getFieldError(errors.comision)}
            />
          </div>
          <div className="md:col-span-1">
            <FormInput
              label="Plazo (Días)"
              type="number"
              placeholder="30"
              className="text-right"
              {...register("plazo", { valueAsNumber: true })}
              error={getFieldError(errors.plazo)}
            />
          </div>

          <div className="md:col-span-1">
            <FormSelect
              label="Sucursal"
              options={[
                { value: "matriz", label: "Matriz" },
                { value: "norte", label: "Sucursal Norte" },
              ]}
              {...register("sucursal")}
            />
          </div>
          <div className="md:col-span-1">
            <FormSelect
              label="Almacén"
              options={[
                { value: "general", label: "General" },
                { value: "pt", label: "Producto Terminado" },
              ]}
              {...register("almacen")}
            />
          </div>
          <div className="md:col-span-1">
            <FormSelect
              label="Canal"
              options={[
                { value: "mayorista", label: "Mayorista" },
                { value: "retail", label: "Retail" },
                { value: "ecommerce", label: "E-Commerce" },
              ]}
              {...register("canal")}
            />
          </div>
          <div className="md:col-span-1">
            <FormInput
              label="Puntos Cliente"
              type="number"
              placeholder="0"
              className="text-right"
              {...register("puntos", { valueAsNumber: true })}
              error={getFieldError(errors.puntos)}
            />
          </div>
          <div className="md:col-span-1">
            <FormInput
              label="Anticipo Req."
              type="number"
              placeholder="$0.00"
              className="text-right"
              {...register("anticipoReq", { valueAsNumber: true })}
              error={getFieldError(errors.anticipoReq)}
            />
          </div>
          <div className="md:col-span-1 flex items-center pt-6">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                {...register("pedidoInicial")}
              />
              <div className="relative w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-sky-600" />
              <span className="ml-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                Pedido Inicial
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-white/5 shadow-sm flex flex-col h-125">
        {itemsError && (
          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mb-2">
            {itemsError.message}
          </p>
        )}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            Detalle de Productos
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => append(defaultItem)}
              className="inline-flex items-center px-3 py-1.5 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors cursor-pointer"
              title="Agregar producto al pedido"
              aria-label="Agregar producto al pedido"
            >
              Agregar Producto
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto -mx-6 px-6 pb-2 border-b border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-300 border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-zinc-900/95 backdrop-blur shadow-sm">
              <tr>
                <th className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-10 text-center">
                  #
                </th>
                <th className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-32">
                  Código
                </th>
                <th className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-50">
                  Descripción
                </th>
                <th className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-20 text-center">
                  UM
                </th>
                <th className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-24 text-right">
                  Cantidad
                </th>
                <th className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-24 text-right">
                  Precio
                </th>
                <th className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-20 text-right">
                  Desc %
                </th>
                <th className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-28 text-right">
                  Importe
                </th>
                <th className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {fields.map((field, index) => {
                const itemErrors = errors.items?.[index];
                const skuError = getFieldError(itemErrors?.sku);
                const descripcionError = getFieldError(itemErrors?.descripcion);
                const unidadError = getFieldError(itemErrors?.unidad);
                const cantidadError = getFieldError(itemErrors?.cantidad);
                const precioError = getFieldError(itemErrors?.precio);
                const descuentoError = getFieldError(itemErrors?.descuento);
                const importeError = getFieldError(itemErrors?.importe);

                const currentItem = watchedItems?.[index];
                const cantidad = Number(currentItem?.cantidad) || 0;
                const precio = Number(currentItem?.precio) || 0;
                const descuento = Number(currentItem?.descuento) || 0;
                const amount = cantidad * precio;
                const descuentoAmount = amount * (descuento / 100);
                const calculatedImporte = Number((amount - descuentoAmount).toFixed(2));

                return (
                  <tr
                    key={field.id}
                    className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="p-2 text-center text-xs text-slate-400 select-none">
                      {index + 1}
                    </td>
                    <td className="p-1">
                      <div className="space-y-1">
                        <input
                          type="text"
                          placeholder="SKU"
                          autoComplete="off"
                          className={`w-full bg-transparent border-b border-transparent focus:ring-0 p-1.5 text-xs text-slate-700 dark:text-slate-200 focus:border-sky-500 ${skuError ? "border-rose-500 text-rose-600 dark:text-rose-400" : ""}`}
                          {...register(`items.${index}.sku`)}
                        />
                        {skuError && (
                          <p className="text-[10px] text-rose-600 dark:text-rose-400">
                            {skuError.message}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-1">
                      <div className="space-y-1">
                        <input
                          type="text"
                          placeholder="Descripción del producto"
                          autoComplete="off"
                          className={`w-full bg-transparent border-b border-transparent focus:ring-0 p-1.5 text-xs text-slate-700 dark:text-slate-200 focus:border-sky-500 ${descripcionError ? "border-rose-500 text-rose-600 dark:text-rose-400" : ""}`}
                          {...register(`items.${index}.descripcion`)}
                        />
                        {descripcionError && (
                          <p className="text-[10px] text-rose-600 dark:text-rose-400">
                            {descripcionError.message}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-1">
                      <div className="space-y-1">
                        <input
                          type="text"
                          placeholder="PZA"
                          autoComplete="off"
                          className={`w-full bg-transparent border-b border-transparent focus:ring-0 p-1.5 text-xs text-center uppercase text-slate-700 dark:text-slate-200 focus:border-sky-500 ${unidadError ? "border-rose-500 text-rose-600 dark:text-rose-400" : ""}`}
                          {...register(`items.${index}.unidad`)}
                        />
                        {unidadError && (
                          <p className="text-[10px] text-rose-600 dark:text-rose-400">
                            {unidadError.message}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-1">
                      <div className="space-y-1">
                        <input
                          type="number"
                          placeholder="0"
                          autoComplete="off"
                          className={`w-full bg-transparent border-b border-transparent focus:ring-0 p-1.5 text-xs text-right text-slate-800 dark:text-white focus:border-sky-500 ${cantidadError ? "border-rose-500 text-rose-600 dark:text-rose-400" : ""}`}
                          {...register(`items.${index}.cantidad`, {
                            valueAsNumber: true,
                          })}
                        />
                        {cantidadError && (
                          <p className="text-[10px] text-rose-600 dark:text-rose-400 text-right">
                            {cantidadError.message}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-1">
                      <div className="space-y-1">
                        <input
                          type="number"
                          placeholder="0.00"
                          step="0.01"
                          className={`w-full bg-transparent border-b border-transparent focus:ring-0 p-1.5 text-xs text-right text-slate-700 dark:text-slate-200 focus:border-sky-500 ${precioError ? "border-rose-500 text-rose-600 dark:text-rose-400" : ""}`}
                          {...register(`items.${index}.precio`, {
                            valueAsNumber: true,
                          })}
                        />
                        {precioError && (
                          <p className="text-[10px] text-rose-600 dark:text-rose-400 text-right">
                            {precioError.message}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-1">
                      <div className="space-y-1">
                        <input
                          type="number"
                          placeholder="0"
                          className={`w-full bg-transparent border-b border-transparent focus:ring-0 p-1.5 text-xs text-right text-slate-700 dark:text-slate-200 focus:border-sky-500 ${descuentoError ? "border-rose-500 text-rose-600 dark:text-rose-400" : ""}`}
                          {...register(`items.${index}.descuento`, {
                            valueAsNumber: true,
                          })}
                        />
                        {descuentoError && (
                          <p className="text-[10px] text-rose-600 dark:text-rose-400 text-right">
                            {descuentoError.message}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-1">
                      <div className="space-y-1">
                        <input
                          type="number"
                          placeholder="0.00"
                          readOnly
                          value={calculatedImporte}
                          className={`w-full bg-transparent border-b border-transparent focus:ring-0 p-1.5 text-xs text-right text-slate-700 dark:text-slate-200 focus:border-sky-500 ${importeError ? "border-rose-500 text-rose-600 dark:text-rose-400" : ""}`}
                        />
                        {importeError && (
                          <p className="text-[10px] text-rose-600 dark:text-rose-400 text-right">
                            {importeError.message}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer p-1"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-2 pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-slate-400">{fields.length} partidas</div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="lg:col-span-1 bg-slate-50/80 dark:bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-slate-200 dark:border-white/5 shadow-inner space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Control del Sistema
          </h3>
          <FormSelect
            label="Estatus Pedido"
            options={[
              { value: "capturado", label: "Capturado" },
              { value: "autorizado", label: "Autorizado" },
              { value: "surtido", label: "Surtido" },
              { value: "facturado", label: "Facturado" },
              { value: "cancelado", label: "Cancelado" },
            ]}
            error={getFieldError(errors.estatusPedido)}
            {...register("estatusPedido")}
          />

          <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700">
            <p className="text-[10px] uppercase font-bold text-slate-400">
              Capturado por
            </p>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
              {isEditing ? (orderToEdit?.capturadoPor ?? userName) : userName}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-400">
              Doc. Relacionado
            </p>
            <input
              type="text"
              placeholder="Cotización / OC"
              autoComplete="off"
              className={`w-full bg-transparent border-b text-xs py-1 focus:outline-none border-slate-200 dark:border-slate-700 ${docRelacionadoError ? "border-rose-500 text-rose-600 dark:text-rose-400" : ""}`}
              {...register("docRelacionado")}
            />
            {docRelacionadoError && (
              <p className="text-[10px] text-rose-600 dark:text-rose-400">
                {docRelacionadoError.message}
              </p>
            )}
          </div>

          <div className="space-y-1 pt-2">
            <p className="text-[10px] uppercase font-bold text-slate-400">
              Observaciones
            </p>
            <textarea
              rows={3}
              placeholder="Notas del pedido..."
              className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs resize-none focus:outline-none"
              {...register("observaciones")}
            />
          </div>
        </div>

        <div className="lg:col-span-3 bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-white/5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                Cargos Adicionales
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">
                    Flete
                  </label>
                  <div className="relative">
                    <span className="absolute left-2 top-1.5 text-xs text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-800 rounded-lg pl-5 pr-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-sky-500"
                      {...register("flete", { valueAsNumber: true })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">
                    Seguros
                  </label>
                  <div className="relative">
                    <span className="absolute left-2 top-1.5 text-xs text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-800 rounded-lg pl-5 pr-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-sky-500"
                      {...register("seguro", { valueAsNumber: true })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">
                    A cuenta (Anticipo)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2 top-1.5 text-xs text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-800 rounded-lg pl-5 pr-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-sky-500 text-rose-500 font-medium"
                      {...register("anticipo", { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 pl-0 md:pl-8 md:border-l border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium font-mono text-slate-700 dark:text-slate-200">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Descuento Global</span>
                <span className="font-medium font-mono text-rose-500">
                  -{formatCurrency(descuentoTotal)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">IEPS</span>
                <span className="font-medium font-mono text-slate-700 dark:text-slate-200">
                  $0.00
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">IVA</span>
                  <div className="w-20">
                    <FormSelect
                      className="px-2 py-1.5 text-xs bg-slate-100 dark:bg-white/10 rounded-lg"
                      options={[
                        { value: 0.16, label: "16%" },
                        { value: 0.08, label: "8%" },
                        { value: 0, label: "0%" },
                      ]}
                      {...register("iva", { valueAsNumber: true })}
                    />
                  </div>
                </div>
                <span className="font-medium font-mono text-slate-700 dark:text-slate-200">
                  {formatCurrency(ivaAmount)}
                </span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 my-2 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-slate-800 dark:text-white">
                    Gran Total
                  </span>
                  <span className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400">
                    {formatCurrency(granTotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-slate-400">Saldo Pendiente</span>
                  <span className="text-sm font-medium font-mono text-slate-500">
                    {formatCurrency(saldoPendiente)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-3 pb-8">
        <FormCancelButton
          onClick={() => reset(isEditing ? editValues : emptyValues)}
          disabled={isPending}
        />
        <FormSubmitButton
          isPending={isPending}
          loadingLabel={isEditing ? "Actualizando..." : "Guardando..."}
        >
          {isEditing ? "Actualizar Pedido" : "Guardar Pedido"}
        </FormSubmitButton>
      </div>
    </form>
  );
}
