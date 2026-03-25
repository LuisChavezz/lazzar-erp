"use client";

import dynamic from "next/dynamic";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import {
  FormCancelButton,
  FormSecondaryButton,
  FormSubmitButton,
} from "@/src/components/FormButtons";
import { EmbarquesIcon, PedidosIcon, PlusIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { getFieldError } from "../../../utils/getFieldError";
import { formatCurrency } from "../../../utils/formatCurrency";
import { Loader } from "@/src/components/Loader";
import { CustomerSearchDropdown } from "./CustomerSearchDropdown";
import CustomerForm from "../../customers/components/CustomerForm";
import { DialogHeader } from "@/src/components/DialogHeader";
import { useOrderForm } from "../hooks/useOrderForm";

const AddProductDialog = dynamic(
  () => import("./AddProductDialog").then((module) => module.AddProductDialog)
);
export default function OrderForm() {
  const {
    form,
    formRef,
    formKey,
    getError,
    clearFieldErrors,
    validateField,
    isPending,
    sellerName,
    userName,
    todayStr,
    tiposPedidoOptions,
    originOptions,
    paymentConditionOptions,
    ivaOptions,
    regimenFiscalOptions,
    usoCfdiOptions,
    currencyOptions,
    formasPagoOptions,
    metodosPagoOptions,
    sizes,
    products,
    isCustomersLoading,
    isCurrenciesLoading,
    isOnboardingLoading,
    showForm,
    handleFormSubmit,
    handleReset,
    handleBack,
    fields,
    append,
    remove,
    update,
    watchedItems,
    watchedFecha,
    watchedEnviarDomicilioFiscal,
    watchedCondicionPago,
    subtotal,
    descuentoTotal,
    ivaAmount,
    granTotal,
    saldoPendiente,
    itemsError,
    docRelacionadoError,
    tipoPedidoError,
    origenError,
    isAddProductsOpen,
    setIsAddProductsOpen,
    editIndex,
    setEditIndex,
    clienteSearchTerm,
    setClienteSearchTerm,
    isCustomerDialogOpen,
    setIsCustomerDialogOpen,
    customers,
    handleSelectCustomer,
    handleCustomerCreated,
  } = useOrderForm();
  const extraServiceCheckboxClass =
    "h-4 w-4 shrink-0 rounded border-slate-300 text-sky-600 focus:ring-sky-500";

  // Estado de carga del formulario
  const isFormLoading = isCustomersLoading || isCurrenciesLoading || isOnboardingLoading || !showForm;
  if (isFormLoading) {
    return (
      <div className="w-full pt-2">
        <Loader
          title="Cargando formulario"
          message="Obteniendo clientes y catálogos..."
        />
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      key={formKey}
      onSubmit={handleFormSubmit}
      aria-busy={isPending}
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
                Datos principales de la cotización y configuración comercial.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400">
                Total Cotización
              </p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white font-mono">
                {formatCurrency(granTotal)}
              </p>
            </div> */}
            
            <FormSecondaryButton label="Regresar" onClick={handleBack} />
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
            <form.Field name="agente">
              {(field) => <input type="hidden" name={field.name} value={field.state.value} readOnly />}
            </form.Field>
            <div className="space-y-4">
              <form.Field name="tipo_pedido">
                {(field) => (
                  <FormSelect
                    label="Tipo de Pedido"
                    options={tiposPedidoOptions}
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(Number(event.target.value));
                      clearFieldErrors("tipo_pedido");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("tipo_pedido", field.state.value);
                    }}
                    error={tipoPedidoError}
                  />
                )}
              </form.Field>
              <form.Field name="fecha">
                {(field) => (
                  <FormInput
                    label="Fecha"
                    type="date"
                    readOnly
                    tabIndex={-1}
                    className="cursor-not-allowed bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-slate-400 focus:bg-slate-100 dark:focus:bg-zinc-800 focus:ring-0 focus:border-slate-200 dark:focus:border-zinc-700"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("fecha");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("fecha", field.state.value);
                    }}
                    error={getError("fecha")}
                  />
                )}
              </form.Field>
              <div className="space-y-2">
                <form.Field name="origen">
                  {(field) => (
                    <FormSelect
                      label="Origen"
                      options={[
                        { value: "", label: "Seleccionar..." },
                        ...originOptions.map((origin) => ({ value: origin, label: origin })),
                      ]}
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("origen");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("origen", field.state.value);
                      }}
                      error={origenError}
                    />
                  )}
                </form.Field>
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
                      title="Alta de Cliente"
                      subtitle="Registra un nuevo cliente"
                      statusColor="emerald"
                    />
                  }
                  open={isCustomerDialogOpen}
                  onOpenChange={setIsCustomerDialogOpen}
                  maxWidth="900px"
                  hideCloseButton={true}
                >
                  <CustomerForm onCreated={handleCustomerCreated} invalidateOrderOnboarding />
                </MainDialog>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div data-error-anchor="clienteBusqueda">
                  <CustomerSearchDropdown
                    label="Cliente"
                    placeholder="Buscar Cliente..."
                    value={clienteSearchTerm}
                    onValueChange={setClienteSearchTerm}
                    customers={customers}
                    onSelect={handleSelectCustomer}
                    error={getError("clienteBusqueda")}
                  />
                </div>
                <form.Field name="clienteNombre">
                  {(field) => (
                    <FormInput
                      label="Nombre del Cliente"
                      placeholder="Nombre"
                      disabled
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("clienteNombre");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("clienteNombre", field.state.value);
                      }}
                      error={getError("clienteNombre")}
                    />
                  )}
                </form.Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <form.Field name="razonSocial">
                  {(field) => (
                    <FormInput
                      label="Razón Social"
                      placeholder="Razón Social"
                      disabled
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("razonSocial");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("razonSocial", field.state.value);
                      }}
                      error={getError("razonSocial")}
                    />
                  )}
                </form.Field>
                <form.Field name="rfc">
                  {(field) => (
                    <FormInput
                      label="RFC"
                      placeholder="RFC"
                      disabled
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("rfc");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("rfc", field.state.value);
                      }}
                      error={getError("rfc")}
                    />
                  )}
                </form.Field>
                <form.Field name="regimenFiscal">
                  {(field) => (
                    <FormSelect
                      label="Régimen Fiscal"
                      options={regimenFiscalOptions}
                      disabled
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("regimenFiscal");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("regimenFiscal", field.state.value);
                      }}
                      error={getError("regimenFiscal")}
                    />
                  )}
                </form.Field>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <form.Field name="direccionFiscal">
                  {(field) => (
                    <FormInput
                      label="Dirección Fiscal"
                      placeholder="Dirección Fiscal"
                      disabled
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("direccionFiscal");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("direccionFiscal", field.state.value);
                      }}
                      error={getError("direccionFiscal")}
                    />
                  )}
                </form.Field>
                <form.Field name="coloniaFiscal">
                  {(field) => (
                    <FormInput
                      label="Colonia"
                      placeholder="Colonia"
                      disabled
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("coloniaFiscal");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("coloniaFiscal", field.state.value);
                      }}
                      error={getError("coloniaFiscal")}
                    />
                  )}
                </form.Field>
                <form.Field name="codigoPostalFiscal">
                  {(field) => (
                    <FormInput
                      label="C.P."
                      placeholder="C.P."
                      disabled
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("codigoPostalFiscal");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("codigoPostalFiscal", field.state.value);
                      }}
                      error={getError("codigoPostalFiscal")}
                    />
                  )}
                </form.Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <form.Field name="ciudadFiscal">
                  {(field) => (
                    <FormInput
                      label="Ciudad"
                      placeholder="Ciudad"
                      disabled
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("ciudadFiscal");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("ciudadFiscal", field.state.value);
                      }}
                      error={getError("ciudadFiscal")}
                    />
                  )}
                </form.Field>
                <form.Field name="estadoFiscal">
                  {(field) => (
                    <FormInput
                      label="Estado"
                      placeholder="Estado"
                      disabled
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("estadoFiscal");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("estadoFiscal", field.state.value);
                      }}
                      error={getError("estadoFiscal")}
                    />
                  )}
                </form.Field>
                <form.Field name="giroEmpresa">
                  {(field) => (
                    <FormInput
                      label="Giro de la empresa"
                      placeholder="Giro de la empresa"
                      disabled
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("giroEmpresa");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("giroEmpresa", field.state.value);
                      }}
                      error={getError("giroEmpresa")}
                    />
                  )}
                </form.Field>
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
              <form.Field name="persona_pagos">
                {(field) => (
                  <FormInput
                    label="Persona Pagos"
                    placeholder="Persona Pagos"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("persona_pagos");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("persona_pagos", field.state.value);
                    }}
                    error={getError("persona_pagos")}
                  />
                )}
              </form.Field>
              <form.Field name="correo_facturas">
                {(field) => (
                  <FormInput
                    label="Correo Facturas"
                    placeholder="correo@empresa.com"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("correo_facturas");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("correo_facturas", field.state.value);
                    }}
                    error={getError("correo_facturas")}
                  />
                )}
              </form.Field>
              <form.Field name="telefono_pagos">
                {(field) => (
                  <FormInput
                    label="Teléfono Pagos"
                    placeholder="Teléfono"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("telefono_pagos");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("telefono_pagos", field.state.value);
                    }}
                    error={getError("telefono_pagos")}
                  />
                )}
              </form.Field>
              <form.Field name="oc">
                {(field) => (
                  <FormInput
                    label="O.C."
                    placeholder="Orden de compra"
                    name={field.name}
                    value={field.state.value ?? ""}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("oc");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("oc", field.state.value ?? "");
                    }}
                    error={getError("oc")}
                  />
                )}
              </form.Field>
              <form.Field name="forma_pago">
                {(field) => (
                  <FormSelect
                    label="Forma de Pago"
                    options={formasPagoOptions}
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value as typeof field.state.value);
                      clearFieldErrors("forma_pago");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("forma_pago", field.state.value);
                    }}
                    error={getError("forma_pago")}
                  />
                )}
              </form.Field>
              <form.Field name="metodo_pago">
                {(field) => (
                  <FormSelect
                    label="Método de Pago"
                    options={metodosPagoOptions}
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value as typeof field.state.value);
                      clearFieldErrors("metodo_pago");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("metodo_pago", field.state.value);
                    }}
                    error={getError("metodo_pago")}
                  />
                )}
              </form.Field>
              <form.Field name="uso_cfdi">
                {(field) => (
                  <FormSelect
                    label="Uso de CFDI"
                    options={usoCfdiOptions}
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("uso_cfdi");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("uso_cfdi", field.state.value);
                    }}
                    error={getError("uso_cfdi")}
                  />
                )}
              </form.Field>
              <form.Field name="referenciarOcFactura">
                {(field) => (
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      name={field.name}
                      checked={Boolean(field.state.value)}
                      onChange={(event) => {
                        field.handleChange(event.target.checked);
                        clearFieldErrors("referenciarOcFactura");
                      }}
                      onBlur={field.handleBlur}
                    />
                    Referenciar OC en factura
                  </label>
                )}
              </form.Field>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-black/20 rounded-3xl p-6 border border-slate-100 dark:border-white/5 shadow-sm h-fit">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">
              Condiciones de pago
            </h3>
            <form.Field name="condicionPago">
              {(field) => (
                <FormSelect
                  label="Condición"
                  options={paymentConditionOptions.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value as typeof field.state.value);
                    clearFieldErrors("condicionPago");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("condicionPago", field.state.value);
                  }}
                  error={getError("condicionPago")}
                />
              )}
            </form.Field>
            <form.Field name="condicionPagoMonto">
              {(field) => (
                <div className="mt-6">
                  <FormInput
                    label="Especificar monto"
                    type="number"
                    placeholder="$0.00"
                    className="text-right"
                    disabled={watchedCondicionPago !== "otra_cantidad"}
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value);
                      field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                      clearFieldErrors("condicionPagoMonto");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("condicionPagoMonto", field.state.value);
                    }}
                    error={getError("condicionPagoMonto")}
                  />
                </div>
              )}
            </form.Field>
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
            <form.Field name="enviarDomicilioFiscal">
              {(field) => (
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    name={field.name}
                    checked={Boolean(field.state.value)}
                    onChange={(event) => {
                      field.handleChange(event.target.checked);
                      clearFieldErrors("enviarDomicilioFiscal");
                    }}
                    onBlur={field.handleBlur}
                  />
                  Enviar al domicilio fiscal
                </label>
              )}
            </form.Field>
            <form.Field name="embarcarConOtrosPedidos">
              {(field) => (
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    name={field.name}
                    checked={Boolean(field.state.value)}
                    onChange={(event) => {
                      field.handleChange(event.target.checked);
                      clearFieldErrors("embarcarConOtrosPedidos");
                    }}
                    onBlur={field.handleBlur}
                  />
                  Embarcar con otras cotizaciones
                </label>
              )}
            </form.Field>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-1">
            <form.Field name="destinatario">
              {(field) => (
                <FormInput
                  label="Destinatario"
                  placeholder="Nombre completo"
                  disabled={Boolean(watchedEnviarDomicilioFiscal)}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("destinatario");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("destinatario", field.state.value);
                  }}
                  error={getError("destinatario")}
                />
              )}
            </form.Field>
          </div>
          <div className="lg:col-span-1">
            <form.Field name="empresaEnvio">
              {(field) => (
                <FormInput
                  label="Empresa"
                  placeholder="Razón Social"
                  disabled={Boolean(watchedEnviarDomicilioFiscal)}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("empresaEnvio");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("empresaEnvio", field.state.value);
                  }}
                  error={getError("empresaEnvio")}
                />
              )}
            </form.Field>
          </div>
          <div className="lg:col-span-1">
            <form.Field name="telefonoEnvio">
              {(field) => (
                <FormInput
                  label="Teléfono"
                  placeholder="Teléfono"
                  disabled={Boolean(watchedEnviarDomicilioFiscal)}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("telefonoEnvio");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("telefonoEnvio", field.state.value);
                  }}
                  error={getError("telefonoEnvio")}
                />
              )}
            </form.Field>
          </div>
          <div className="lg:col-span-1">
            <form.Field name="celularEnvio">
              {(field) => (
                <FormInput
                  label="Celular"
                  placeholder="Celular"
                  disabled={Boolean(watchedEnviarDomicilioFiscal)}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("celularEnvio");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("celularEnvio", field.state.value);
                  }}
                  error={getError("celularEnvio")}
                />
              )}
            </form.Field>
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <form.Field name="direccionEnvio">
              {(field) => (
                <FormInput
                  label="Dirección"
                  placeholder="Calle y número"
                  disabled={Boolean(watchedEnviarDomicilioFiscal)}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("direccionEnvio");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("direccionEnvio", field.state.value);
                  }}
                  error={getError("direccionEnvio")}
                />
              )}
            </form.Field>
          </div>
          <div className="lg:col-span-1">
            <form.Field name="coloniaEnvio">
              {(field) => (
                <FormInput
                  label="Colonia"
                  placeholder="Colonia"
                  disabled={Boolean(watchedEnviarDomicilioFiscal)}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("coloniaEnvio");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("coloniaEnvio", field.state.value);
                  }}
                  error={getError("coloniaEnvio")}
                />
              )}
            </form.Field>
          </div>
          <div className="lg:col-span-1">
            <form.Field name="codigoPostalEnvio">
              {(field) => (
                <FormInput
                  label="Código Postal"
                  placeholder="C.P."
                  disabled={Boolean(watchedEnviarDomicilioFiscal)}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("codigoPostalEnvio");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("codigoPostalEnvio", field.state.value);
                  }}
                  error={getError("codigoPostalEnvio")}
                />
              )}
            </form.Field>
          </div>
          <div className="lg:col-span-1">
            <form.Field name="ciudadEnvio">
              {(field) => (
                <FormInput
                  label="Ciudad"
                  placeholder="Ciudad"
                  disabled={Boolean(watchedEnviarDomicilioFiscal)}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("ciudadEnvio");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("ciudadEnvio", field.state.value);
                  }}
                  error={getError("ciudadEnvio")}
                />
              )}
            </form.Field>
          </div>
          <div className="lg:col-span-1">
            <form.Field name="estadoEnvio">
              {(field) => (
                <FormInput
                  label="Estado"
                  placeholder="Estado"
                  disabled={Boolean(watchedEnviarDomicilioFiscal)}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("estadoEnvio");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("estadoEnvio", field.state.value);
                  }}
                  error={getError("estadoEnvio")}
                />
              )}
            </form.Field>
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <form.Field name="referenciasEnvio">
              {(field) => (
                <FormInput
                  label="Referencias adicionales"
                  placeholder="Entre calles, etc."
                  disabled={Boolean(watchedEnviarDomicilioFiscal)}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("referenciasEnvio");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("referenciasEnvio", field.state.value);
                  }}
                  error={getError("referenciasEnvio")}
                />
              )}
            </form.Field>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <form.Field name="empaque_ecologico">
            {(field) => (
              <label className="flex items-start gap-3 rounded-2xl cursor-pointer border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-500/10 p-4">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                  name={field.name}
                  checked={Boolean(field.state.value)}
                  onChange={(event) => {
                    field.handleChange(event.target.checked);
                    clearFieldErrors("empaque_ecologico");
                  }}
                  onBlur={field.handleBlur}
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
            )}
          </form.Field>
          <form.Field name="embarque_parcial">
            {(field) => (
              <label className="flex items-start gap-3 rounded-2xl cursor-pointer border border-amber-100 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/10 p-4">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  name={field.name}
                  checked={Boolean(field.state.value)}
                  onChange={(event) => {
                    field.handleChange(event.target.checked);
                    clearFieldErrors("embarque_parcial");
                  }}
                  onBlur={field.handleBlur}
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
            )}
          </form.Field>
          <form.Field name="comentarios_parcialidad">
            {(field) => (
              <FormInput
                label="Comentarios parcialidad"
                placeholder="Especificaciones para el envío parcial..."
                name={field.name}
                value={field.state.value}
                onChange={(event) => {
                  field.handleChange(event.target.value);
                  clearFieldErrors("comentarios_parcialidad");
                }}
                onBlur={() => {
                  field.handleBlur();
                  validateField("comentarios_parcialidad", field.state.value);
                }}
                error={getError("comentarios_parcialidad")}
              />
            )}
          </form.Field>
        </div>
      </section>

      <section data-error-anchor="items" className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-white/5 shadow-sm flex flex-col h-125">
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
              title="Agregar producto a la cotización"
              aria-label="Agregar producto a la cotización"
            >
              Agregar Producto
            </button>
          </div>
        </div>

        {isAddProductsOpen && (
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
            sizes={sizes}
            products={products}
          />
        )}

        {/* Detalle de productos */}
        <div className="flex-1 overflow-auto -mx-6 px-6 pb-2 border-b border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-300 border-collapse text-left">
            <caption className="sr-only">
              Tabla de partidas de la cotización con acciones para editar o eliminar
            </caption>
            <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-zinc-900/95 backdrop-blur shadow-sm">
              <tr>
                <th className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-10 text-center">
                  #
                </th>
                <th className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-24">
                  ID
                </th>
                <th className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-40">
                  Descripción
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
                    colSpan={10}
                    className="p-6 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No hay productos agregados.
                  </td>
                </tr>
              ) : (
                fields.map((field: { id: string }, index: number) => {
                  const productoIdError = getFieldError(getError(`items.${index}.productoId`));
                  const descripcionError = getFieldError(getError(`items.${index}.descripcion`));
                  const cantidadError = getFieldError(getError(`items.${index}.cantidad`));
                  const precioError = getFieldError(getError(`items.${index}.precio`));
                  const descuentoError = getFieldError(getError(`items.${index}.descuento`));
                  const importeError = getFieldError(getError(`items.${index}.importe`));

                  const currentItem = watchedItems?.[index];
                  const tallasLabel =
                    currentItem?.tallas && currentItem.tallas.length > 0
                      ? currentItem.tallas
                        .map(
                          (talla: { nombre: string; cantidad: number }) =>
                            `${talla.nombre} (${talla.cantidad})`
                        )
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
                            className={`text-xs font-medium text-slate-700 dark:text-slate-200 ${productoIdError ? "text-rose-600 dark:text-rose-400" : ""}`}
                          >
                            {currentItem?.productoId || "—"}
                          </div>
                          {productoIdError && (
                            <p className="text-[10px] text-rose-600 dark:text-rose-400">
                              {productoIdError.message}
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
              <form.Field name="servicioEnvioActivo">
                {(field) => (
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className={extraServiceCheckboxClass}
                        name={field.name}
                        checked={Boolean(field.state.value)}
                        onChange={(event) => {
                          field.handleChange(event.target.checked);
                          clearFieldErrors("servicioEnvioActivo");
                        }}
                        onBlur={field.handleBlur}
                      />
                      <span>Envío</span>
                    </label>
                    <form.Field name="envio">
                      {(amountField) => (
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-xs text-slate-400">
                            $
                          </span>
                          <input
                            type="number"
                            aria-label="Envío"
                            className="w-24 bg-transparent border border-slate-300 dark:border-slate-700 rounded-full pl-5 pr-3 py-1 text-xs text-right text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                            name={amountField.name}
                            value={amountField.state.value}
                            onChange={(event) => {
                              const nextValue = Number(event.target.value);
                              amountField.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                              clearFieldErrors("envio");
                            }}
                            onBlur={() => {
                              amountField.handleBlur();
                              validateField("envio", amountField.state.value);
                            }}
                          />
                        </div>
                      )}
                    </form.Field>
                  </div>
                )}
              </form.Field>
              <form.Field name="programaBordadosActivo">
                {(field) => (
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className={extraServiceCheckboxClass}
                        name={field.name}
                        checked={Boolean(field.state.value)}
                        onChange={(event) => {
                          field.handleChange(event.target.checked);
                          clearFieldErrors("programaBordadosActivo");
                        }}
                        onBlur={field.handleBlur}
                      />
                      <span>Programa de Bordados</span>
                    </label>
                    <form.Field name="programa_bordados">
                      {(amountField) => (
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-xs text-slate-400">
                            $
                          </span>
                          <input
                            type="number"
                            aria-label="Programa de Bordados"
                            className="w-24 bg-transparent border border-slate-300 dark:border-slate-700 rounded-full pl-5 pr-3 py-1 text-xs text-right text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                            name={amountField.name}
                            value={amountField.state.value}
                            onChange={(event) => {
                              const nextValue = Number(event.target.value);
                              amountField.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                              clearFieldErrors("programa_bordados");
                            }}
                            onBlur={() => {
                              amountField.handleBlur();
                              validateField("programa_bordados", amountField.state.value);
                            }}
                          />
                        </div>
                      )}
                    </form.Field>
                  </div>
                )}
              </form.Field>
              <form.Field name="bordadoPantalonesExtrasActivo">
                {(field) => (
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className={extraServiceCheckboxClass}
                        name={field.name}
                        checked={Boolean(field.state.value)}
                        onChange={(event) => {
                          field.handleChange(event.target.checked);
                          clearFieldErrors("bordadoPantalonesExtrasActivo");
                        }}
                        onBlur={field.handleBlur}
                      />
                      <span>Bordado Pantalones Extras</span>
                    </label>
                    <form.Field name="bordado_pantalones_extras">
                      {(amountField) => (
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-xs text-slate-400">
                            $
                          </span>
                          <input
                            type="number"
                            aria-label="Bordado Pantalones Extras"
                            className="w-24 bg-transparent border border-slate-300 dark:border-slate-700 rounded-full pl-5 pr-3 py-1 text-xs text-right text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                            name={amountField.name}
                            value={amountField.state.value}
                            onChange={(event) => {
                              const nextValue = Number(event.target.value);
                              amountField.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                              clearFieldErrors("bordado_pantalones_extras");
                            }}
                            onBlur={() => {
                              amountField.handleBlur();
                              validateField("bordado_pantalones_extras", amountField.state.value);
                            }}
                          />
                        </div>
                      )}
                    </form.Field>
                  </div>
                )}
              </form.Field>
              <form.Field name="bordado_logotipo">
                {(field) => (
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className={extraServiceCheckboxClass}
                        name={field.name}
                        checked={Boolean(field.state.value)}
                        onChange={(event) => {
                          field.handleChange(event.target.checked);
                          clearFieldErrors("bordado_logotipo");
                        }}
                        onBlur={field.handleBlur}
                      />
                      <span>Bordado Logotipo (Incluido)</span>
                    </label>
                    <span className="px-2 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-slate-200/70 dark:bg-white/10 text-slate-500 dark:text-slate-300">
                      GRATIS
                    </span>
                  </div>
                )}
              </form.Field>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-400">
                Documento Relacionado
              </p>
              <form.Field name="docRelacionado">
                {(field) => (
                  <>
                    <input
                      type="text"
                      placeholder="Cotización / OC"
                      aria-label="Documento relacionado"
                      autoComplete="off"
                      className={`w-full bg-transparent border-b text-xs py-1 focus:outline-none border-slate-200 dark:border-slate-700 ${docRelacionadoError ? "border-rose-500 text-rose-600 dark:text-rose-400" : ""}`}
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("docRelacionado");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("docRelacionado", field.state.value);
                      }}
                    />
                    {docRelacionadoError && (
                      <p className="text-[10px] text-rose-600 dark:text-rose-400">
                        {docRelacionadoError.message}
                      </p>
                    )}
                  </>
                )}
              </form.Field>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Usuario Captura
              </span>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                {userName}
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
              <form.Field name="observaciones">
                {(field) => (
                  <textarea
                    rows={3}
                    placeholder="Notas de la cotización..."
                    aria-label="Observaciones"
                    className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs resize-none focus:outline-none"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("observaciones");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("observaciones", field.state.value);
                    }}
                  />
                )}
              </form.Field>
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
                  <form.Field name="flete">
                    {(field) => (
                      <div className="relative">
                        <span className="absolute left-2 top-1.5 text-xs text-slate-400">
                          $
                        </span>
                        <input
                          type="number"
                          aria-label="Flete"
                          className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-800 rounded-lg pl-5 pr-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-sky-500"
                          name={field.name}
                          value={field.state.value}
                          onChange={(event) => {
                            const nextValue = Number(event.target.value);
                            field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                            clearFieldErrors("flete");
                          }}
                          onBlur={() => {
                            field.handleBlur();
                            validateField("flete", field.state.value);
                          }}
                        />
                      </div>
                    )}
                  </form.Field>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">
                    Seguros
                  </label>
                  <form.Field name="seguros">
                    {(field) => (
                      <div className="relative">
                        <span className="absolute left-2 top-1.5 text-xs text-slate-400">
                          $
                        </span>
                        <input
                          type="number"
                          aria-label="Seguros"
                          className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-800 rounded-lg pl-5 pr-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-sky-500"
                          name={field.name}
                          value={field.state.value}
                          onChange={(event) => {
                            const nextValue = Number(event.target.value);
                            field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                            clearFieldErrors("seguros");
                          }}
                          onBlur={() => {
                            field.handleBlur();
                            validateField("seguros", field.state.value);
                          }}
                        />
                      </div>
                    )}
                  </form.Field>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">
                    A cuenta (Anticipo)
                  </label>
                  <form.Field name="anticipo">
                    {(field) => (
                      <div className="relative">
                        <span className="absolute left-2 top-1.5 text-xs text-slate-400">
                          $
                        </span>
                        <input
                          type="number"
                          aria-label="Anticipo"
                          className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-800 rounded-lg pl-5 pr-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-sky-500 text-rose-500 font-medium"
                          name={field.name}
                          value={field.state.value}
                          onChange={(event) => {
                            const nextValue = Number(event.target.value);
                            field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                            clearFieldErrors("anticipo");
                          }}
                          onBlur={() => {
                            field.handleBlur();
                            validateField("anticipo", field.state.value);
                          }}
                        />
                      </div>
                    )}
                  </form.Field>
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
                  <span className="text-slate-500">Moneda</span>
                  <div className="w-52">
                    <form.Field name="moneda">
                      {(field) => (
                        <FormSelect
                          className="px-2 py-1.5 text-xs bg-slate-100 dark:bg-white/10 rounded-lg"
                          aria-label="Moneda"
                          options={currencyOptions}
                          name={field.name}
                          value={field.state.value}
                          onChange={(event) => {
                            const nextValue = Number(event.target.value);
                            field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                            clearFieldErrors("moneda");
                          }}
                          onBlur={() => {
                            field.handleBlur();
                            validateField("moneda", field.state.value);
                          }}
                          error={getFieldError(getError("moneda"))}
                        />
                      )}
                    </form.Field>
                  </div>
                </div>
                <span className="font-medium font-mono text-slate-700 dark:text-slate-200" />
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">IVA</span>
                  <div className="w-20">
                    <form.Field name="iva">
                      {(field) => (
                        <FormSelect
                          className="px-2 py-1.5 text-xs bg-slate-100 dark:bg-white/10 rounded-lg"
                          aria-label="Tasa de IVA"
                          options={ivaOptions.map((option) => ({
                            value: option.value,
                            label: option.label,
                          }))}
                          name={field.name}
                          value={field.state.value}
                          onChange={(event) => {
                            const nextValue = Number(event.target.value);
                            field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                            clearFieldErrors("iva");
                          }}
                          onBlur={() => {
                            field.handleBlur();
                            validateField("iva", field.state.value);
                          }}
                        />
                      )}
                    </form.Field>
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
          loadingLabel="Guardando..."
        >
          Guardar Cotización
        </FormSubmitButton>
      </div>
    </form>
  );
}
