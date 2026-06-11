"use client";

import { useMemo, useState } from "react";
import { InfoIcon } from "../../../components/Icons";
import { Button } from "../../../components/Button";
import { FormInput } from "../../../components/FormInput";
import { FormSelect } from "../../../components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { Loader } from "../../../components/Loader";
import { Supplier } from "../interfaces/supplier.interface";
import { useSupplierForm } from "../hooks/useSupplierForm";
import { useVerifyRfc } from "../../facturama/hooks/useVerifyRfc";

interface SupplierFormProps {
  onSuccess: () => void;
  supplierToEdit?: Supplier | null;
}

const RFC_MIN_LENGTH = 12;

type RfcValidationTone = "success" | "error";

const normalizeRfc = (value: string) => value.trim().toUpperCase();

export default function SupplierForm({ onSuccess, supplierToEdit }: SupplierFormProps) {
  const isEditMode = Boolean(supplierToEdit?.id);
  const [isRfcVerified, setIsRfcVerified] = useState(isEditMode);
  const [verifiedRfc, setVerifiedRfc] = useState<string | null>(
    isEditMode && supplierToEdit?.rfc ? normalizeRfc(supplierToEdit.rfc) : null
  );
  const [rfcValidationMessage, setRfcValidationMessage] = useState<string | null>(
    isEditMode ? "RFC previamente validado" : null
  );
  const [rfcValidationTone, setRfcValidationTone] = useState<RfcValidationTone | null>(
    isEditMode ? "success" : null
  );
  const { verifyRfcAsync, isVerifyingRfc, resetVerifyRfc } = useVerifyRfc();

  const {
    form,
    formRef,
    formKey,
    isEditing,
    getError,
    clearFieldErrors,
    validateField,
    isPending,
    handleFormSubmit,
    handleReset,
    isLoadingCatalogs,
    // Catálogos dinámicos desde API
    regimenesFiscales,
    formasPago,
    metodosPago,
    availableCurrencies,
  } = useSupplierForm({ onSuccess, supplierToEdit, isRfcVerified });

  const rfcFeedbackClassName = useMemo(() => {
    if (rfcValidationTone === "success") {
      return "text-emerald-700 dark:text-emerald-300";
    }
    if (rfcValidationTone === "error") {
      return "text-rose-700 dark:text-rose-300";
    }
    return "text-slate-500 dark:text-slate-400";
  }, [rfcValidationTone]);

  const getInvalidRfcMessage = (status: {
    FormatoCorrecto: boolean;
    Activo: boolean;
    Localizado: boolean;
  }) => {
    const reasons: string[] = [];
    if (!status.FormatoCorrecto) reasons.push("formato incorrecto");
    if (!status.Activo) reasons.push("RFC inactivo");
    if (!status.Localizado) reasons.push("RFC no localizado");
    if (reasons.length === 0) return "No fue posible validar el RFC.";
    return `RFC inválido: ${reasons.join(", ")}.`;
  };

  // Función para resetear el estado de validación del RFC al cancelar o resetear el formulario
  const handleResetRfcValidation = () => {
    if (isEditMode && supplierToEdit) {
      // En edición, restaura el RFC original del proveedor.
      setIsRfcVerified(true);
      setVerifiedRfc(normalizeRfc(supplierToEdit.rfc));
      setRfcValidationMessage("RFC previamente validado");
      setRfcValidationTone("success");
    } else {
      setIsRfcVerified(false);
      setVerifiedRfc(null);
      setRfcValidationMessage(null);
      setRfcValidationTone(null);
    }
    resetVerifyRfc();
  };

  // Si los catálogos aún están cargando, mostramos un loader en lugar del formulario
  if (isLoadingCatalogs) {
    return (
      <div className="w-full pt-2">
        <Loader
          title="Cargando catálogos SAT"
          message="Obteniendo regímenes fiscales, formas de pago y monedas..."
        />
      </div>
    );
  }

  return (
    <form ref={formRef} key={formKey} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        {/* ─── Sección: Información General ─── */}
        <section className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none group hover:border-sky-200 dark:hover:border-sky-900 transition-colors duration-300 mb-8">
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          <div className="relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 w-full">
              <div className="md:col-span-2">
                <form.Field name="nombre">
                  {(field) => (
                    <FormInput
                      label="Nombre del Proveedor"
                      placeholder="Nombre comercial del proveedor"
                      variant="ghost"
                      className="text-2xl font-bold"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("nombre");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("nombre", field.state.value);
                      }}
                      error={getError("nombre")}
                    />
                  )}
                </form.Field>
              </div>

              <div>
                <form.Field name="codigo">
                  {(field) => (
                    <FormInput
                      label="Código"
                      placeholder="PROV-2026-001"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("codigo");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("codigo", field.state.value);
                      }}
                      error={getError("codigo")}
                    />
                  )}
                </form.Field>
              </div>

              <div>
                <form.Field name="razon_social">
                  {(field) => (
                    <FormInput
                      label="Razón Social"
                      placeholder="Razón social oficial"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("razon_social");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("razon_social", field.state.value);
                      }}
                      error={getError("razon_social")}
                    />
                  )}
                </form.Field>
              </div>

              <div>
                <form.Field name="rfc">
                  {(field) => {
                    const normalizedFieldRfc = normalizeRfc(field.state.value ?? "");
                    const canVerifyRfc =
                      normalizedFieldRfc.length >= RFC_MIN_LENGTH && !isRfcVerified && !isPending;

                    return (
                      <div className="space-y-2">
                        <FormInput
                          label="RFC"
                          placeholder="XXXX000000XXX"
                          forceUppercase
                          name={field.name}
                          value={field.state.value}
                          disabled={isRfcVerified}
                          onChange={(event) => {
                            const nextRfc = normalizeRfc(event.target.value);
                            field.handleChange(nextRfc);
                            clearFieldErrors("rfc");
                            resetVerifyRfc();
                            setRfcValidationMessage(null);
                            setRfcValidationTone(null);
                            if (verifiedRfc && nextRfc !== verifiedRfc) {
                              setVerifiedRfc(null);
                              setIsRfcVerified(false);
                            }
                            if (!verifiedRfc) {
                              setIsRfcVerified(false);
                            }
                          }}
                          onBlur={() => {
                            field.handleBlur();
                            validateField("rfc", field.state.value);
                          }}
                          error={getError("rfc")}
                        />
                        <div className="flex items-center gap-3">
                          {canVerifyRfc ? (
                            <Button
                              variant="secondary"
                              disabled={isVerifyingRfc}
                              onClick={async () => {
                                const rfcToVerify = normalizeRfc(field.state.value ?? "");
                                if (rfcToVerify.length < RFC_MIN_LENGTH) {
                                  return;
                                }

                                try {
                                  const response = await verifyRfcAsync(rfcToVerify);
                                  const isValid =
                                    response.FormatoCorrecto &&
                                    response.Activo &&
                                    response.Localizado;

                                  if (isValid) {
                                    setIsRfcVerified(true);
                                    setVerifiedRfc(rfcToVerify);
                                    setRfcValidationTone("success");
                                    setRfcValidationMessage(
                                      "RFC validado correctamente ante el servicio fiscal. Puedes continuar."
                                    );
                                    clearFieldErrors("rfc");
                                    return;
                                  }

                                  setIsRfcVerified(false);
                                  setVerifiedRfc(null);
                                  setRfcValidationTone("error");
                                  setRfcValidationMessage(getInvalidRfcMessage(response));
                                } catch {
                                  setIsRfcVerified(false);
                                  setVerifiedRfc(null);
                                  setRfcValidationTone("error");
                                  setRfcValidationMessage(
                                    "No se pudo validar el RFC en este momento. Intenta nuevamente."
                                  );
                                }
                              }}
                            >
                              {isVerifyingRfc ? "Verificando RFC..." : "Verificar RFC"}
                            </Button>
                          ) : null}
                          {isRfcVerified ? (
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setIsRfcVerified(false);
                                setVerifiedRfc(null);
                                setRfcValidationTone(null);
                                setRfcValidationMessage(null);
                                resetVerifyRfc();
                                clearFieldErrors("rfc");
                              }}
                            >
                              Cambiar RFC
                            </Button>
                          ) : null}
                        </div>
                        {rfcValidationMessage ? (
                          <p className={`text-xs font-medium ${rfcFeedbackClassName}`}>
                            {rfcValidationMessage}
                          </p>
                        ) : null}
                      </div>
                    );
                  }}
                </form.Field>
              </div>

              <div>
                <form.Field name="email">
                  {(field) => (
                    <FormInput
                      label="Email"
                      type="email"
                      placeholder="proveedor@empresa.com"
                      name={field.name}
                      value={field.state.value ?? ""}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("email");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("email", field.state.value);
                      }}
                      error={getError("email")}
                    />
                  )}
                </form.Field>
              </div>

              <div>
                <form.Field name="telefono">
                  {(field) => (
                    <FormInput
                      label="Teléfono"
                      type="tel"
                      placeholder="(555) 000-0000"
                      name={field.name}
                      value={field.state.value ?? ""}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("telefono");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("telefono", field.state.value);
                      }}
                      error={getError("telefono")}
                    />
                  )}
                </form.Field>
              </div>

              <div>
                <form.Field name="contacto_principal">
                  {(field) => (
                    <FormInput
                      label="Contacto Principal"
                      placeholder="Nombre del contacto"
                      name={field.name}
                      value={field.state.value ?? ""}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("contacto_principal");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("contacto_principal", field.state.value);
                      }}
                      error={getError("contacto_principal")}
                    />
                  )}
                </form.Field>
              </div>

              <div>
                <form.Field name="fax">
                  {(field) => (
                    <FormInput
                      label="Fax"
                      placeholder="Fax"
                      name={field.name}
                      value={field.state.value ?? ""}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("fax");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("fax", field.state.value);
                      }}
                      error={getError("fax")}
                    />
                  )}
                </form.Field>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Sección: Crédito y Facturación ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start mb-8">
          {/* Columna Izquierda: Crédito */}
          <div className="w-full">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
                  <InfoIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                    Crédito
                  </h3>
                  <p className="text-xs text-slate-500">Condiciones comerciales</p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <form.Field name="dias_credito">
                    {(field) => (
                      <FormInput
                        label="Días de Crédito"
                        type="number"
                        placeholder="0"
                        name={field.name}
                        value={field.state.value === 0 ? "" : field.state.value}
                        onChange={(event) => {
                          const value = event.target.value;
                          field.handleChange(value === "" ? 0 : Number(value));
                          clearFieldErrors("dias_credito");
                        }}
                        onBlur={() => {
                          field.handleBlur();
                          validateField("dias_credito", field.state.value);
                        }}
                        error={getError("dias_credito")}
                      />
                    )}
                  </form.Field>
                </div>
                <div>
                  <form.Field name="limite_credito">
                    {(field) => (
                      <FormInput
                        label="Límite de Crédito"
                        type="number"
                        step="0.01"
                        placeholder="150000.00"
                        name={field.name}
                        value={field.state.value}
                        onChange={(event) => {
                          field.handleChange(event.target.value);
                          clearFieldErrors("limite_credito");
                        }}
                        onBlur={() => {
                          field.handleBlur();
                          validateField("limite_credito", field.state.value);
                        }}
                        error={getError("limite_credito")}
                      />
                    )}
                  </form.Field>
                </div>
                <div>
                  <form.Field name="moneda">
                    {(field) => (
                      <FormSelect
                        label="Moneda"
                        name={field.name}
                        value={field.state.value}
                        onChange={(event) => {
                          const nextValue = Number(event.target.value);
                          field.handleChange(Number.isNaN(nextValue) ? 1 : nextValue);
                          clearFieldErrors("moneda");
                        }}
                        onBlur={() => {
                          field.handleBlur();
                          validateField("moneda", field.state.value);
                        }}
                        error={getError("moneda")}
                      >
                        <option value="" disabled className="bg-white dark:bg-zinc-900 text-slate-500">
                          {isLoadingCatalogs ? "Cargando..." : "Seleccionar..."}
                        </option>
                        {availableCurrencies.map((currency) => (
                          <option
                            key={currency.id}
                            value={currency.id}
                            className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                          >
                            {currency.codigo_iso} — {currency.nombre}
                          </option>
                        ))}
                      </FormSelect>
                    )}
                  </form.Field>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Información SAT / Fiscal */}
          <div className="w-full">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                  <InfoIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                    Información Fiscal
                  </h3>
                  <p className="text-xs text-slate-500">Datos SAT / CFDI</p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <form.Field name="sat_regimen_fiscal">
                    {(field) => (
                      <FormSelect
                        label="Régimen Fiscal"
                        name={field.name}
                        value={field.state.value}
                        onChange={(event) => {
                          const nextValue = Number(event.target.value);
                          field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                          clearFieldErrors("sat_regimen_fiscal");
                        }}
                        onBlur={() => {
                          field.handleBlur();
                          validateField("sat_regimen_fiscal", field.state.value);
                        }}
                        error={getError("sat_regimen_fiscal")}
                      >
                        <option value="0" disabled className="bg-white dark:bg-zinc-900 text-slate-500">
                          {isLoadingCatalogs ? "Cargando..." : "Seleccionar..."}
                        </option>
                        {regimenesFiscales.map((regimen) => (
                          <option
                            key={regimen.id_sat_regimen_fiscal}
                            value={regimen.id_sat_regimen_fiscal}
                            className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                          >
                            {regimen.codigo} — {regimen.descripcion}
                          </option>
                        ))}
                      </FormSelect>
                    )}
                  </form.Field>
                </div>
                <div>
                  <form.Field name="sat_forma_pago">
                    {(field) => (
                      <FormSelect
                        label="Forma de Pago"
                        name={field.name}
                        value={field.state.value}
                        onChange={(event) => {
                          const nextValue = Number(event.target.value);
                          field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                          clearFieldErrors("sat_forma_pago");
                        }}
                        onBlur={() => {
                          field.handleBlur();
                          validateField("sat_forma_pago", field.state.value);
                        }}
                        error={getError("sat_forma_pago")}
                      >
                        <option value="0" disabled className="bg-white dark:bg-zinc-900 text-slate-500">
                          {isLoadingCatalogs ? "Cargando..." : "Seleccionar..."}
                        </option>
                        {formasPago.map((fp) => (
                          <option
                            key={fp.id_sat_forma_pago}
                            value={fp.id_sat_forma_pago}
                            className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                          >
                            {fp.codigo} — {fp.descripcion}
                          </option>
                        ))}
                      </FormSelect>
                    )}
                  </form.Field>
                </div>
                <div>
                  <form.Field name="sat_metodo_pago">
                    {(field) => (
                      <FormSelect
                        label="Método de Pago"
                        name={field.name}
                        value={field.state.value}
                        onChange={(event) => {
                          const nextValue = Number(event.target.value);
                          field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                          clearFieldErrors("sat_metodo_pago");
                        }}
                        onBlur={() => {
                          field.handleBlur();
                          validateField("sat_metodo_pago", field.state.value);
                        }}
                        error={getError("sat_metodo_pago")}
                      >
                        <option value="0" disabled className="bg-white dark:bg-zinc-900 text-slate-500">
                          {isLoadingCatalogs ? "Cargando..." : "Seleccionar..."}
                        </option>
                        {metodosPago.map((mp) => (
                          <option
                            key={mp.id_sat_metodo_pago}
                            value={mp.id_sat_metodo_pago}
                            className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                          >
                            {mp.codigo} — {mp.descripcion}
                          </option>
                        ))}
                      </FormSelect>
                    )}
                  </form.Field>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Botones de Acción ─── */}
        <div className="flex justify-end gap-3 pb-8">
          <FormCancelButton
            onClick={() => {
              handleReset();
              handleResetRfcValidation();
            }}
            disabled={isPending}
          />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {isEditing ? "Actualizar Proveedor" : "Guardar Proveedor"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
