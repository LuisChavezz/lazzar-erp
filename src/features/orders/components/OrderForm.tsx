"use client";

import { useSession } from "next-auth/react";
import { useForm, useFieldArray, useWatch, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import {
  FormCancelButton,
  FormSecondaryButton,
  FormSubmitButton,
} from "@/src/components/FormButtons";
import { EmbarquesIcon, PedidosIcon, PlusIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { orderFormSchema, OrderFormValues } from "../schema/order.schema";
import { getFieldError } from "../../../utils/getFieldError";
import { formatCurrency } from "../../../utils/formatCurrency";
import { useOrderStore } from "../stores/order.store";
import { useCustomerStore } from "../../customers/stores/customer.store";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Order } from "../interfaces/order.interface";
import { Loader } from "@/src/components/Loader";
import { useRef, useState } from "react";
import { AddProductDialog } from "./AddProductDialog";
import { CustomerSearchDropdown } from "./CustomerSearchDropdown";
import CustomerForm from "../../customers/components/CustomerForm";
import type { CustomerItem } from "@/src/features/customers/interfaces/customer.interface";
import { DialogHeader } from "@/src/components/DialogHeader";

interface OrderFormProps {
  orderId?: string;
}

export default function OrderForm({ orderId }: OrderFormProps) {
  const { data: session } = useSession();
  const userName = session?.user?.name || "Usuario";
  const userId = session?.user?.id ?? "";
  const isEditing = Boolean(orderId);

  const todayStr = new Date().toISOString().split("T")[0];
  const sellerName = userName;
  const documentTypeOptions = [
    { value: "pedido", label: "Pedido de Venta" },
    { value: "muestra", label: "Muestra" },
  ];
  const originOptions = [
    "Recompra",
    "Google",
    "Chat Online",
    "Publicidad",
    "Pedido Online",
    "Mercado Libre",
    "Prospección",
    "Redes Sociales",
    "Recomendación",
    "Otro",
    "Amazon",
    "Mailing",
  ];
  const normalizeRegimenFiscal = (
    value?: string
  ): OrderFormValues["regimenFiscal"] =>
    value === "601" || value === "603" || value === "605" ? value : "601";
  const normalizeFormaPago = (value?: string): OrderFormValues["formaPago"] =>
    value === "01" || value === "03" || value === "04" ? value : "03";
  const normalizeMetodoPago = (value?: string): OrderFormValues["metodoPago"] =>
    value === "PUE" || value === "PPD" || value === "NA" ? value : "PUE";
  const normalizeUsoCfdi = (value?: string): OrderFormValues["usoCfdi"] =>
    value === "G03" || value === "G01" || value === "I01" ? value : "G03";
  const addOrder = useOrderStore((s) => s.addOrder);
  const updateOrder = useOrderStore((s) => s.updateOrder);
  const orderToEdit = useOrderStore((s) =>
    orderId ? s.orders.find((o) => o.id === orderId) : undefined
  );
  const customers = useCustomerStore((s) => s.customers);
  const router = useRouter();
  const emptyValues: OrderFormValues = {
    clienteBusqueda: "",
    clienteNombre: "",
    razonSocial: "",
    rfc: "",
    regimenFiscal: "601",
    direccionFiscal: "",
    coloniaFiscal: "",
    codigoPostalFiscal: "",
    ciudadFiscal: "",
    estadoFiscal: "",
    giroEmpresa: "",
    personaPagos: "",
    correoFacturas: "",
    telefonoPagos: "",
    ordenCompra: "",
    formaPago: "03",
    metodoPago: "PUE",
    usoCfdi: "G03",
    referenciarOcFactura: false,
    condicionPago100Anticipo: true,
    condicionPago50Anticipo: false,
    condicionPagoVendedorAutoriza: false,
    condicionPagoPagoAntesEmbarque: false,
    condicionPagoPorConfirmar: false,
    condicionPagoOtraCantidad: false,
    condicionPagoMonto: 0,
    fecha: todayStr,
    agente: userName,
    tipoDocumento: "pedido",
    origen: [],
    destinatario: "",
    empresaEnvio: "",
    telefonoEnvio: "",
    celularEnvio: "",
    direccionEnvio: "",
    coloniaEnvio: "",
    codigoPostalEnvio: "",
    ciudadEnvio: "",
    estadoEnvio: "",
    referenciasEnvio: "",
    enviarDomicilioFiscal: false,
    embarcarConOtrosPedidos: false,
    empaqueEcologico: false,
    embarqueParcial: false,
    comentariosParcialidad: "",
    servicioEnvioActivo: false,
    servicioEnvioMonto: 0,
    programaBordadosActivo: false,
    programaBordadosMonto: 0,
    bordadoPantalonesExtrasActivo: false,
    bordadoPantalonesExtrasMonto: 0,
    bordadoLogotipoIncluido: true,
    estatusPedido: "Pendiente",
    docRelacionado: "",
    observaciones: "",
    flete: 0,
    seguro: 0,
    anticipo: 0,
    iva: 0.16,
    items: [],
  };

  const editValues: OrderFormValues = orderToEdit
    ? {
      clienteBusqueda: orderToEdit.clienteBusqueda ?? "",
      clienteNombre: orderToEdit.clienteNombre,
      razonSocial: orderToEdit.razonSocial ?? "",
      rfc: orderToEdit.rfc ?? "",
      regimenFiscal: normalizeRegimenFiscal(orderToEdit.regimenFiscal),
      direccionFiscal: orderToEdit.direccionFiscal ?? "",
      coloniaFiscal: orderToEdit.coloniaFiscal ?? "",
      codigoPostalFiscal: orderToEdit.codigoPostalFiscal ?? "",
      ciudadFiscal: orderToEdit.ciudadFiscal ?? "",
      estadoFiscal: orderToEdit.estadoFiscal ?? "",
      giroEmpresa: orderToEdit.giroEmpresa ?? "",
      personaPagos: orderToEdit.personaPagos ?? "",
      correoFacturas: orderToEdit.correoFacturas ?? "",
      telefonoPagos: orderToEdit.telefonoPagos ?? "",
      ordenCompra: orderToEdit.ordenCompra ?? "",
      formaPago: normalizeFormaPago(orderToEdit.formaPago),
      metodoPago: normalizeMetodoPago(orderToEdit.metodoPago),
      usoCfdi: normalizeUsoCfdi(orderToEdit.usoCfdi),
      referenciarOcFactura: orderToEdit.referenciarOcFactura ?? false,
      condicionPago100Anticipo: orderToEdit.condicionPago100Anticipo ?? false,
      condicionPago50Anticipo: orderToEdit.condicionPago50Anticipo ?? false,
      condicionPagoVendedorAutoriza: orderToEdit.condicionPagoVendedorAutoriza ?? false,
      condicionPagoPagoAntesEmbarque: orderToEdit.condicionPagoPagoAntesEmbarque ?? false,
      condicionPagoPorConfirmar: orderToEdit.condicionPagoPorConfirmar ?? false,
      condicionPagoOtraCantidad: orderToEdit.condicionPagoOtraCantidad ?? false,
      condicionPagoMonto: orderToEdit.condicionPagoMonto ?? 0,
      fecha: orderToEdit.fecha,
      agente: orderToEdit.agente ?? userName,
      tipoDocumento: orderToEdit.tipoDocumento ?? "pedido",
      origen: orderToEdit.origen ?? [],
      destinatario: orderToEdit.destinatario ?? "",
      empresaEnvio: orderToEdit.empresaEnvio ?? "",
      telefonoEnvio: orderToEdit.telefonoEnvio ?? "",
      celularEnvio: orderToEdit.celularEnvio ?? "",
      direccionEnvio: orderToEdit.direccionEnvio ?? "",
      coloniaEnvio: orderToEdit.coloniaEnvio ?? "",
      codigoPostalEnvio: orderToEdit.codigoPostalEnvio ?? "",
      ciudadEnvio: orderToEdit.ciudadEnvio ?? "",
      estadoEnvio: orderToEdit.estadoEnvio ?? "",
      referenciasEnvio: orderToEdit.referenciasEnvio ?? "",
      enviarDomicilioFiscal: orderToEdit.enviarDomicilioFiscal ?? false,
      embarcarConOtrosPedidos: orderToEdit.embarcarConOtrosPedidos ?? false,
      empaqueEcologico: orderToEdit.empaqueEcologico ?? false,
      embarqueParcial: orderToEdit.embarqueParcial ?? false,
      comentariosParcialidad: orderToEdit.comentariosParcialidad ?? "",
      servicioEnvioActivo: orderToEdit.servicioEnvioActivo ?? false,
      servicioEnvioMonto: orderToEdit.servicioEnvioMonto ?? 0,
      programaBordadosActivo: orderToEdit.programaBordadosActivo ?? false,
      programaBordadosMonto: orderToEdit.programaBordadosMonto ?? 0,
      bordadoPantalonesExtrasActivo:
        orderToEdit.bordadoPantalonesExtrasActivo ?? false,
      bordadoPantalonesExtrasMonto:
        orderToEdit.bordadoPantalonesExtrasMonto ?? 0,
      bordadoLogotipoIncluido: orderToEdit.bordadoLogotipoIncluido ?? true,
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
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema) as Resolver<OrderFormValues>,
    defaultValues: emptyValues,
    values: isEditing ? editValues : undefined,
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = useWatch({ control, name: "items" });
  const watchedFlete = useWatch({ control, name: "flete" });
  const watchedSeguro = useWatch({ control, name: "seguro" });
  const watchedAnticipo = useWatch({ control, name: "anticipo" });
  const watchedIva = useWatch({ control, name: "iva" });
  const watchedServicioEnvioActivo = useWatch({
    control,
    name: "servicioEnvioActivo",
  });
  const watchedServicioEnvioMonto = useWatch({
    control,
    name: "servicioEnvioMonto",
  });
  const watchedProgramaBordadosActivo = useWatch({
    control,
    name: "programaBordadosActivo",
  });
  const watchedProgramaBordadosMonto = useWatch({
    control,
    name: "programaBordadosMonto",
  });
  const watchedBordadoPantalonesExtrasActivo = useWatch({
    control,
    name: "bordadoPantalonesExtrasActivo",
  });
  const watchedBordadoPantalonesExtrasMonto = useWatch({
    control,
    name: "bordadoPantalonesExtrasMonto",
  });
  const watchedFecha = useWatch({ control, name: "fecha" });
  const watchedEnviarDomicilioFiscal = useWatch({
    control,
    name: "enviarDomicilioFiscal",
  });

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
    const servicioEnvioValue = watchedServicioEnvioActivo
      ? Number(watchedServicioEnvioMonto) || 0
      : 0;
    const programaBordadosValue = watchedProgramaBordadosActivo
      ? Number(watchedProgramaBordadosMonto) || 0
      : 0;
    const bordadoPantalonesExtrasValue = watchedBordadoPantalonesExtrasActivo
      ? Number(watchedBordadoPantalonesExtrasMonto) || 0
      : 0;
    const extrasValue =
      servicioEnvioValue + programaBordadosValue + bordadoPantalonesExtrasValue;

    const baseImponible =
      subtotalValue - descuentoValue + fleteValue + seguroValue + extrasValue;
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
  const [isAddProductsOpen, setIsAddProductsOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [clienteSearchTerm, setClienteSearchTerm] = useState(
    isEditing ? editValues.clienteBusqueda ?? "" : ""
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);

  const handleCustomerCreated = (customer: CustomerItem) => {
    handleSelectCustomer(customer);
    setIsCustomerDialogOpen(false);
  };

  const handleSelectCustomer = (customer: CustomerItem) => {
    const profile = customer.orderProfile;
    setValue("clienteBusqueda", customer.razonSocial, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setClienteSearchTerm(customer.razonSocial);
    setValue("clienteNombre", profile.clienteNombre || customer.contacto, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("razonSocial", profile.razonSocial, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("rfc", profile.rfc, { shouldDirty: true, shouldValidate: true });
    setValue("regimenFiscal", profile.regimenFiscal, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("direccionFiscal", profile.direccionFiscal, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("coloniaFiscal", profile.coloniaFiscal, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("codigoPostalFiscal", profile.codigoPostalFiscal, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("ciudadFiscal", profile.ciudadFiscal, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("estadoFiscal", profile.estadoFiscal, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("giroEmpresa", profile.giroEmpresa, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("destinatario", profile.destinatario, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("empresaEnvio", profile.empresaEnvio, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("telefonoEnvio", profile.telefonoEnvio, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("celularEnvio", profile.celularEnvio, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("direccionEnvio", profile.direccionEnvio, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("coloniaEnvio", profile.coloniaEnvio, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("codigoPostalEnvio", profile.codigoPostalEnvio, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("ciudadEnvio", profile.ciudadEnvio, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("estadoEnvio", profile.estadoEnvio, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("referenciasEnvio", profile.referenciasEnvio ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("enviarDomicilioFiscal", true, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

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
    const servicioEnvioValue = values.servicioEnvioActivo
      ? Number(values.servicioEnvioMonto) || 0
      : 0;
    const programaBordadosValue = values.programaBordadosActivo
      ? Number(values.programaBordadosMonto) || 0
      : 0;
    const bordadoPantalonesExtrasValue = values.bordadoPantalonesExtrasActivo
      ? Number(values.bordadoPantalonesExtrasMonto) || 0
      : 0;
    const extrasValue =
      servicioEnvioValue + programaBordadosValue + bordadoPantalonesExtrasValue;
    const baseImponible =
      subtotalValue - descuentoValue + fleteValue + seguroValue + extrasValue;
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
    ordenCompra: values.ordenCompra ?? "",
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
      ordenCompra: values.ordenCompra ?? "",
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
        setClienteSearchTerm(editValues.clienteBusqueda ?? "");
        toast.success("Pedido actualizado correctamente");
      } else {
        const newOrder = makeNewOrder(values);
        await addOrder(newOrder);
        reset(emptyValues);
        setClienteSearchTerm("");
        toast.success("Pedido registrado correctamente");
      }
      router.replace("/sales/orders");
    } catch {
      toast.error("No se pudo guardar el pedido");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    reset(isEditing ? editValues : emptyValues);
    setClienteSearchTerm(isEditing ? editValues.clienteBusqueda ?? "" : "");
    toast.success(
      isEditing ? "Pedido restablecido correctamente" : "Formulario limpiado correctamente"
    );
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const itemsError = getFieldError(
    errors.items?.root ?? (errors.items as unknown)
  );
  const docRelacionadoError = getFieldError(errors.docRelacionado);
  const tipoDocumentoError = getFieldError(errors.tipoDocumento);
  const origenError = getFieldError(errors.origen);

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
    <form
      ref={formRef}
      key={formKey}
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
    >
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
            {/* <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400">
                Total Pedido
              </p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white font-mono">
                {formatCurrency(granTotal)}
              </p>
            </div> */}
            
            <FormSecondaryButton label="Regresar" onClick={() => router.back()} />
          </div>
        </div>

        <div className="flex flex-col xl:flex-row items-start gap-8 relative z-10">
          <div className="shrink-0 w-full xl:w-80 bg-slate-50 dark:bg-black/20 rounded-3xl p-6 border border-slate-100 dark:border-white/5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Vendedor
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white font-mono mb-6">
              {sellerName}
            </div>
            <input type="hidden" {...register("agente")} />
            <div className="space-y-4">
              <FormSelect
                label="Tipo Documento"
                options={documentTypeOptions}
                error={tipoDocumentoError}
                {...register("tipoDocumento")}
              />
              <FormInput
                label="Fecha"
                type="date"
                readOnly
                tabIndex={-1}
                className="cursor-not-allowed bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-slate-400 focus:bg-slate-100 dark:focus:bg-zinc-800 focus:ring-0 focus:border-slate-200 dark:focus:border-zinc-700"
                {...register("fecha")}
                error={errors.fecha}
              />
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                  Origen
                </p>
                <div className="grid grid-cols-2 gap-y-2 gap-x-2">
                  {originOptions.map((origin) => (
                    <label
                      key={origin}
                      className="flex items-center gap-2 text-[10px] font-medium text-slate-600 dark:text-slate-300 leading-tight"
                    >
                      <input
                        type="checkbox"
                        value={origin}
                        className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        {...register("origen")}
                      />
                      <span>{origin}</span>
                    </label>
                  ))}
                </div>
                {origenError && (
                  <p className="text-[10px] text-rose-600 dark:text-rose-400">
                    {origenError.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 self-start w-full space-y-6">
            <div className="bg-slate-50 dark:bg-black/20 rounded-3xl p-6 border border-slate-100 dark:border-white/5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  Datos de Facturación
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer text-sky-600 hover:text-sky-700"
                  onClick={() => setIsCustomerDialogOpen(true)}
                >
                  <PlusIcon className="w-4 h-4" />
                  Agregar nuevo cliente
                </button>
                <MainDialog
                  title={
                    <DialogHeader
                      title={isEditing ? "Editar Cliente" : "Alta de Cliente"}
                      subtitle={isEditing ? "Edita los datos del cliente" : "Registra un nuevo cliente"}
                      statusColor="emerald"
                    />
                  }
                  open={isCustomerDialogOpen}
                  onOpenChange={setIsCustomerDialogOpen}
                  maxWidth="900px"
                  hideCloseButton={true}
                >
                  <CustomerForm
                    sellerName={userName}
                    onCreated={handleCustomerCreated}
                  />
                </MainDialog>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CustomerSearchDropdown
                  label="Cliente"
                  placeholder="Buscar Cliente..."
                  value={clienteSearchTerm}
                  onValueChange={setClienteSearchTerm}
                  customers={customers}
                  onSelect={handleSelectCustomer}
                  error={errors.clienteBusqueda}
                />
                <FormInput
                  label="Nombre del Cliente"
                  placeholder="Nombre"
                  disabled
                  {...register("clienteNombre")}
                  error={errors.clienteNombre}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <FormInput
                  label="Razón Social"
                  placeholder="Razón Social"
                  disabled
                  {...register("razonSocial")}
                  error={errors.razonSocial}
                />
                <FormInput
                  label="RFC"
                  placeholder="RFC"
                  disabled
                  {...register("rfc")}
                  error={errors.rfc}
                />
                <FormSelect
                  label="Régimen Fiscal"
                  options={[
                    { value: "601", label: "601 - General de Ley" },
                    { value: "603", label: "603 - Personas Morales" },
                    { value: "605", label: "605 - Sueldos" },
                  ]}
                  disabled
                  {...register("regimenFiscal")}
                  error={errors.regimenFiscal}
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <FormInput
                  label="Dirección Fiscal"
                  placeholder="Dirección Fiscal"
                  disabled
                  {...register("direccionFiscal")}
                  error={errors.direccionFiscal}
                />
                <FormInput
                  label="Colonia"
                  placeholder="Colonia"
                  disabled
                  {...register("coloniaFiscal")}
                  error={errors.coloniaFiscal}
                />
                <FormInput
                  label="C.P."
                  placeholder="C.P."
                  disabled
                  {...register("codigoPostalFiscal")}
                  error={errors.codigoPostalFiscal}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <FormInput
                  label="Ciudad"
                  placeholder="Ciudad"
                  disabled
                  {...register("ciudadFiscal")}
                  error={errors.ciudadFiscal}
                />
                <FormInput
                  label="Estado"
                  placeholder="Estado"
                  disabled
                  {...register("estadoFiscal")}
                  error={errors.estadoFiscal}
                />
                <FormInput
                  label="Giro de la empresa"
                  placeholder="Giro de la empresa"
                  disabled
                  {...register("giroEmpresa")}
                  error={errors.giroEmpresa}
                />
              </div>
            </div>

          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 items-start">
          <div className="bg-slate-50 dark:bg-black/20 rounded-3xl p-6 border border-slate-100 dark:border-white/5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">
              Forma de pago y contacto para envío de facturas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput
                label="Persona Pagos"
                placeholder="Persona Pagos"
                {...register("personaPagos")}
                error={errors.personaPagos}
              />
              <FormInput
                label="Correo Facturas"
                placeholder="correo@empresa.com"
                {...register("correoFacturas")}
                error={errors.correoFacturas}
              />
              <FormInput
                label="Teléfono Pagos"
                placeholder="Teléfono"
                {...register("telefonoPagos")}
                error={errors.telefonoPagos}
              />
              <FormInput
                label="O.C."
                placeholder="Orden de compra"
                {...register("ordenCompra")}
                error={errors.ordenCompra}
              />
              <FormSelect
                label="Forma de Pago"
                options={[
                  { value: "01", label: "01 - Efectivo" },
                  { value: "03", label: "03 - Transferencia" },
                  { value: "04", label: "04 - Tarjeta" },
                ]}
                {...register("formaPago")}
                error={errors.formaPago}
              />
              <FormSelect
                label="Método de Pago"
                options={[
                  { value: "PUE", label: "PUE - Pago en una sola exhibición" },
                  { value: "PPD", label: "PPD - Pago en parcialidades" },
                  { value: "NA", label: "N/A" },
                ]}
                {...register("metodoPago")}
                error={errors.metodoPago}
              />
              <FormSelect
                label="Uso de CFDI"
                options={[
                  { value: "G03", label: "G03 - Gastos en general" },
                  { value: "G01", label: "G01 - Adquisición de mercancías" },
                  { value: "I01", label: "I01 - Construcciones" },
                ]}
                {...register("usoCfdi")}
                error={errors.usoCfdi}
              />
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  {...register("referenciarOcFactura")}
                />
                Referenciar OC en factura
              </label>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-black/20 rounded-3xl p-6 border border-slate-100 dark:border-white/5 shadow-sm h-fit">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">
              Condiciones de pago
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  {...register("condicionPago100Anticipo")}
                />
                100% Anticipo
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  {...register("condicionPago50Anticipo")}
                />
                50% Anticipo
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  {...register("condicionPagoVendedorAutoriza")}
                />
                Vendedor autoriza
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  {...register("condicionPagoPagoAntesEmbarque")}
                />
                Pago antes de embarque
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  {...register("condicionPagoPorConfirmar")}
                />
                Por confirmar
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  {...register("condicionPagoOtraCantidad")}
                />
                Otra cantidad
              </label>
            </div>
            <div className="mt-6">
              <FormInput
                label="Especificar monto"
                type="number"
                placeholder="$0.00"
                className="text-right"
                {...register("condicionPagoMonto", { valueAsNumber: true })}
                error={getFieldError(errors.condicionPagoMonto)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-white/5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <EmbarquesIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                Datos de Envío
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Información para entrega y condiciones de envío.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                {...register("enviarDomicilioFiscal")}
              />
              Enviar al domicilio fiscal
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                {...register("embarcarConOtrosPedidos")}
              />
              Embarcar con otros pedidos
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-1">
            <FormInput
              label="Destinatario"
              placeholder="Nombre completo"
              disabled={Boolean(watchedEnviarDomicilioFiscal)}
              {...register("destinatario")}
              error={errors.destinatario}
            />
          </div>
          <div className="lg:col-span-1">
            <FormInput
              label="Empresa"
              placeholder="Razón Social"
              disabled={Boolean(watchedEnviarDomicilioFiscal)}
              {...register("empresaEnvio")}
              error={errors.empresaEnvio}
            />
          </div>
          <div className="lg:col-span-1">
            <FormInput
              label="Teléfono"
              placeholder="Teléfono"
              disabled={Boolean(watchedEnviarDomicilioFiscal)}
              {...register("telefonoEnvio")}
              error={errors.telefonoEnvio}
            />
          </div>
          <div className="lg:col-span-1">
            <FormInput
              label="Celular"
              placeholder="Celular"
              disabled={Boolean(watchedEnviarDomicilioFiscal)}
              {...register("celularEnvio")}
              error={errors.celularEnvio}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <FormInput
              label="Dirección"
              placeholder="Calle y número"
              disabled={Boolean(watchedEnviarDomicilioFiscal)}
              {...register("direccionEnvio")}
              error={errors.direccionEnvio}
            />
          </div>
          <div className="lg:col-span-1">
            <FormInput
              label="Colonia"
              placeholder="Colonia"
              disabled={Boolean(watchedEnviarDomicilioFiscal)}
              {...register("coloniaEnvio")}
              error={errors.coloniaEnvio}
            />
          </div>
          <div className="lg:col-span-1">
            <FormInput
              label="Código Postal"
              placeholder="C.P."
              disabled={Boolean(watchedEnviarDomicilioFiscal)}
              {...register("codigoPostalEnvio")}
              error={errors.codigoPostalEnvio}
            />
          </div>
          <div className="lg:col-span-1">
            <FormInput
              label="Ciudad"
              placeholder="Ciudad"
              disabled={Boolean(watchedEnviarDomicilioFiscal)}
              {...register("ciudadEnvio")}
              error={errors.ciudadEnvio}
            />
          </div>
          <div className="lg:col-span-1">
            <FormInput
              label="Estado"
              placeholder="Estado"
              disabled={Boolean(watchedEnviarDomicilioFiscal)}
              {...register("estadoEnvio")}
              error={errors.estadoEnvio}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <FormInput
              label="Referencias adicionales"
              placeholder="Entre calles, etc."
              disabled={Boolean(watchedEnviarDomicilioFiscal)}
              {...register("referenciasEnvio")}
              error={errors.referenciasEnvio}
            />
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <label className="flex items-start gap-3 rounded-2xl cursor-pointer border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-500/10 p-4">
            <input
              type="checkbox"
              className="mt-0.5 w-4 h-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
              {...register("empaqueEcologico")}
            />
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">
                Empaque ecológico, sin bolsas de plástico
              </p>
              <p className="text-[11px] text-emerald-600/80 dark:text-emerald-300/80">
                ¡Gracias por ayudarnos a cuidar el medio ambiente!
              </p>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-2xl cursor-pointer border border-amber-100 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/10 p-4">
            <input
              type="checkbox"
              className="mt-0.5 w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              {...register("embarqueParcial")}
            />
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-300">
                Embarque parcial
              </p>
              <p className="text-[11px] text-amber-600/80 dark:text-amber-300/80">
                Es posible embarcar parcialidad facturada de lo disponible en inventario.
              </p>
            </div>
          </label>
          <FormInput
            label="Comentarios parcialidad"
            placeholder="Especificaciones para el envío parcial..."
            {...register("comentariosParcialidad")}
            error={errors.comentariosParcialidad}
          />
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
              onClick={() => {
                setEditIndex(null);
                setIsAddProductsOpen(true);
              }}
              className="inline-flex items-center px-3 py-1.5 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-lg text-xs font-bold tracking-wide hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors cursor-pointer"
              title="Agregar producto al pedido"
              aria-label="Agregar producto al pedido"
            >
              Agregar Producto
            </button>
          </div>
        </div>

        <AddProductDialog
          key={editIndex ?? "new"}
          open={isAddProductsOpen}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setEditIndex(null);
            }
            setIsAddProductsOpen(nextOpen);
          }}
          onAddItem={(item) => append(item)}
          onUpdateItem={
            editIndex !== null
              ? (item) => {
                update(editIndex, item);
              }
              : undefined
          }
          initialItem={editIndex !== null ? watchedItems?.[editIndex] : null}
          startStep={editIndex !== null ? "sizes" : "select"}
        />

        {/* Detalle de productos */}
        <div className="flex-1 overflow-auto -mx-6 px-6 pb-2 border-b border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-300 border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-zinc-900/95 backdrop-blur shadow-sm">
              <tr>
                <th className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-10 text-center">
                  #
                </th>
                <th className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-24">
                  Código
                </th>
                <th className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-40">
                  Descripción
                </th>
                <th className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16 text-center">
                  UM
                </th>
                <th className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-56">
                  Tallas
                </th>
                <th className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-20 text-center">
                  Bordado
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
              {fields.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="p-6 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No hay productos agregados.
                  </td>
                </tr>
              ) : (
                fields.map((field, index) => {
                  const itemErrors = errors.items?.[index];
                  const skuError = getFieldError(itemErrors?.sku);
                  const descripcionError = getFieldError(itemErrors?.descripcion);
                  const unidadError = getFieldError(itemErrors?.unidad);
                  const cantidadError = getFieldError(itemErrors?.cantidad);
                  const precioError = getFieldError(itemErrors?.precio);
                  const descuentoError = getFieldError(itemErrors?.descuento);
                  const importeError = getFieldError(itemErrors?.importe);

                  const currentItem = watchedItems?.[index];
                  const tallasLabel =
                    currentItem?.tallas && currentItem.tallas.length > 0
                      ? currentItem.tallas
                        .map((talla) => `${talla.nombre} (${talla.cantidad})`)
                        .join(", ")
                      : "—";
                  const bordadoLabel = currentItem?.bordados?.activo ? "Sí" : "No";
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
                      <td className="p-2">
                        <div className="space-y-1">
                          <div
                            className={`text-xs font-medium text-slate-700 dark:text-slate-200 ${skuError ? "text-rose-600 dark:text-rose-400" : ""}`}
                          >
                            {currentItem?.sku || "—"}
                          </div>
                          <input type="hidden" {...register(`items.${index}.sku`)} />
                          {skuError && (
                            <p className="text-[10px] text-rose-600 dark:text-rose-400">
                              {skuError.message}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="space-y-1">
                          <div
                            className={`text-xs text-slate-600 dark:text-slate-300 ${descripcionError ? "text-rose-600 dark:text-rose-400" : ""}`}
                          >
                            {currentItem?.descripcion || "—"}
                          </div>
                          <input
                            type="hidden"
                            {...register(`items.${index}.descripcion`)}
                          />
                          {descripcionError && (
                            <p className="text-[10px] text-rose-600 dark:text-rose-400">
                              {descripcionError.message}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="space-y-1">
                          <div
                            className={`text-xs text-center uppercase text-slate-600 dark:text-slate-300 ${unidadError ? "text-rose-600 dark:text-rose-400" : ""}`}
                          >
                            {currentItem?.unidad || "—"}
                          </div>
                          <input type="hidden" {...register(`items.${index}.unidad`)} />
                          {unidadError && (
                            <p className="text-[10px] text-rose-600 dark:text-rose-400">
                              {unidadError.message}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="space-y-1">
                          <div
                            className="text-xs text-slate-500 dark:text-slate-400 whitespace-normal wrap-break-word"
                            aria-label="Tallas del producto"
                          >
                            {tallasLabel}
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="space-y-1">
                          <div className="text-xs text-center text-slate-500 dark:text-slate-400">
                            {bordadoLabel}
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="space-y-1">
                          <div
                            className={`text-xs text-right text-slate-600 dark:text-slate-300 ${cantidadError ? "text-rose-600 dark:text-rose-400" : ""}`}
                          >
                            {cantidad || 0}
                          </div>
                          <input
                            type="hidden"
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
                      <td className="p-2">
                        <div className="space-y-1">
                          <div
                            className={`text-xs text-right text-slate-600 dark:text-slate-300 ${precioError ? "text-rose-600 dark:text-rose-400" : ""}`}
                          >
                            {precio.toFixed(2)}
                          </div>
                          <input
                            type="hidden"
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
                      <td className="p-2">
                        <div className="space-y-1">
                          <div
                            className={`text-xs text-right text-slate-600 dark:text-slate-300 ${descuentoError ? "text-rose-600 dark:text-rose-400" : ""}`}
                          >
                            {descuento}
                          </div>
                          <input
                            type="hidden"
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
                      <td className="p-2">
                        <div className="space-y-1">
                          <div
                            className={`text-xs text-right text-slate-600 dark:text-slate-300 ${importeError ? "text-rose-600 dark:text-rose-400" : ""}`}
                          >
                            {calculatedImporte.toFixed(2)}
                          </div>
                          {importeError && (
                            <p className="text-[10px] text-rose-600 dark:text-rose-400 text-right">
                              {importeError.message}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditIndex(index);
                              setIsAddProductsOpen(true);
                            }}
                            aria-label="Editar partida"
                            className="text-slate-400 hover:text-sky-500 transition-colors cursor-pointer p-1"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            aria-label="Eliminar partida"
                            className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer p-1"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-2 pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-slate-400">{fields.length} partidas</div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="lg:col-span-1 bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-white/5 shadow-sm space-y-6">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Servicios Extras
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    {...register("servicioEnvioActivo")}
                  />
                  <span>Envío</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2 top-1.5 text-xs text-slate-400">
                    $
                  </span>
                  <input
                    type="number"
                    aria-label="Envío"
                    className="w-24 bg-transparent border border-slate-300 dark:border-slate-700 rounded-full pl-5 pr-3 py-1 text-xs text-right text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    {...register("servicioEnvioMonto", { valueAsNumber: true })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    {...register("programaBordadosActivo")}
                  />
                  <span>Programa de Bordados</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2 top-1.5 text-xs text-slate-400">
                    $
                  </span>
                  <input
                    type="number"
                    aria-label="Programa de Bordados"
                    className="w-24 bg-transparent border border-slate-300 dark:border-slate-700 rounded-full pl-5 pr-3 py-1 text-xs text-right text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    {...register("programaBordadosMonto", { valueAsNumber: true })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    {...register("bordadoPantalonesExtrasActivo")}
                  />
                  <span>Bordado Pantalones Extras</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2 top-1.5 text-xs text-slate-400">
                    $
                  </span>
                  <input
                    type="number"
                    aria-label="Bordado Pantalones Extras"
                    className="w-24 bg-transparent border border-slate-300 dark:border-slate-700 rounded-full pl-5 pr-3 py-1 text-xs text-right text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    {...register("bordadoPantalonesExtrasMonto", {
                      valueAsNumber: true,
                    })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked
                    readOnly
                    className="w-4 h-4 rounded border-slate-300 text-slate-400"
                  />
                  <span>Bordado Logotipo (Incluido)</span>
                </div>
                <span className="px-2 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-slate-200/70 dark:bg-white/10 text-slate-500 dark:text-slate-300">
                  GRATIS
                </span>
                <input
                  type="hidden"
                  value="true"
                  {...register("bordadoLogotipoIncluido", {
                    setValueAs: (value) => value === "true",
                  })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-400">
                Documento Relacionado
              </p>
              <input
                type="text"
                placeholder="Cotización / OC"
                aria-label="Documento relacionado"
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

            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Usuario Captura
              </span>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                {isEditing ? (orderToEdit?.capturadoPor ?? userName) : userName}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Fecha Captura
              </span>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                {watchedFecha || todayStr}
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-400">
                Observaciones
              </p>
              <textarea
                rows={3}
                placeholder="Notas del pedido..."
                aria-label="Observaciones"
                className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs resize-none focus:outline-none"
                {...register("observaciones")}
              />
            </div>
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
                      aria-label="Flete"
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
                      aria-label="Seguros"
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
                      aria-label="Anticipo"
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
                      aria-label="Tasa de IVA"
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
          onClick={handleReset}
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
