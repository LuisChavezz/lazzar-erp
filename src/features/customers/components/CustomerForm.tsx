"use client";

import { useMemo, useState } from "react";
import { Button } from "@/src/components/Button";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { ClientesIcon, TaxIcon } from "@/src/components/Icons";
import { Loader } from "@/src/components/Loader";
import { Customer } from "../interfaces/customer.interface";
import { useCustomerForm } from "../hooks/useCustomerForm";
import { useVerifyRfc } from "../hooks/useVerifyRfc";

interface CustomerFormProps {
  onSuccess?: () => void;
  onCreated?: (customer: Customer) => void;
  customerToEdit?: Customer | null;
  invalidateOrderOnboarding?: boolean;
}

const RFC_MIN_LENGTH = 12;

type RfcValidationTone = "success" | "error";

const normalizeRfc = (value: string) => value.trim().toUpperCase();

export default function CustomerForm({
  onSuccess,
  onCreated,
  customerToEdit,
  invalidateOrderOnboarding = false,
}: CustomerFormProps) {
  const [isRfcVerified, setIsRfcVerified] = useState(false);
  const [verifiedRfc, setVerifiedRfc] = useState<string | null>(null);
  const [rfcValidationMessage, setRfcValidationMessage] = useState<string | null>(null);
  const [rfcValidationTone, setRfcValidationTone] = useState<RfcValidationTone | null>(null);
  const { verifyRfcAsync, isVerifyingRfc, resetVerifyRfc } = useVerifyRfc();

  // El custom hook concentra estado, validación Zod, submit y reset del formulario.
  const {
    form,
    formRef,
    formKey,
    isEditing,
    isPending,
    isSatInfoLoading,
    regimenesFiscales,
    usosCfdi,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useCustomerForm({
    onSuccess,
    onCreated,
    customerToEdit,
    invalidateOrderOnboarding,
    isRfcVerified,
  });

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

  const handleResetRfcValidation = () => {
    setIsRfcVerified(false);
    setVerifiedRfc(null);
    setRfcValidationMessage(null);
    setRfcValidationTone(null);
    resetVerifyRfc();
  };

  if (isSatInfoLoading) {
    return (
      <div className="w-full pt-2">
        <Loader title="Cargando catálogos SAT" message="Obteniendo régimen fiscal y uso de CFDI..." />
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      key={formKey}
      onSubmit={handleFormSubmit}
      className="w-full"
    >
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <ClientesIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Información General
              </h3>
              <p className="text-xs text-slate-500">Datos principales del cliente</p>
            </div>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Cada form.Field conecta un input visual con el estado interno de TanStack Form. */}
              <form.Field name="razon_social">
                {(field) => (
                  <FormInput
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
                    label="Razón social"
                    placeholder="Razón social"
                    error={getError("razon_social")}
                  />
                )}
              </form.Field>
              <form.Field name="nombre">
                {(field) => (
                  <FormInput
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
                    label="Nombre"
                    placeholder="Nombre de cliente"
                    error={getError("nombre")}
                  />
                )}
              </form.Field>
              <form.Field name="telefono">
                {(field) => (
                  <FormInput
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("telefono");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("telefono", field.state.value);
                    }}
                    label="Teléfono"
                    placeholder="Teléfono"
                    error={getError("telefono")}
                  />
                )}
              </form.Field>
              <form.Field name="correo">
                {(field) => (
                  <FormInput
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("correo");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("correo", field.state.value);
                    }}
                    label="Correo"
                    placeholder="correo@empresa.com"
                    error={getError("correo")}
                  />
                )}
              </form.Field>
              <form.Field name="giro_empresarial">
                {(field) => (
                  <FormInput
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("giro_empresarial");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("giro_empresarial", field.state.value);
                    }}
                    label="Giro empresarial"
                    placeholder="Giro de la empresa"
                    error={getError("giro_empresarial")}
                  />
                )}
              </form.Field>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <TaxIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Datos Fiscales
              </h3>
              <p className="text-xs text-slate-500">Información fiscal del cliente</p>
            </div>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <form.Field name="rfc">
                {(field) => {
                  const normalizedFieldRfc = normalizeRfc(field.state.value ?? "");
                  const canVerifyRfc =
                    normalizedFieldRfc.length >= RFC_MIN_LENGTH && !isRfcVerified && !isPending;

                  return (
                    <div className="space-y-2">
                      <FormInput
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
                        label="RFC"
                        placeholder="RFC"
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
              <form.Field name="sat_regimen_fiscal">
                {(field) => (
                  <FormSelect
                    name={field.name}
                    value={String(field.state.value)}
                    onChange={(event) => {
                      field.handleChange(Number(event.target.value));
                      clearFieldErrors("sat_regimen_fiscal");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("sat_regimen_fiscal", field.state.value);
                    }}
                    label="Régimen Fiscal"
                    error={getError("sat_regimen_fiscal")}
                  >
                    <option value={0} disabled>
                      Seleccionar...
                    </option>
                    {regimenesFiscales.map((item) => (
                      <option
                        key={item.id_sat_regimen_fiscal}
                        value={item.id_sat_regimen_fiscal}
                        className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                      >
                        {item.codigo} - {item.descripcion}
                      </option>
                    ))}
                  </FormSelect>
                )}
              </form.Field>
              <form.Field name="sat_uso_cfdi">
                {(field) => (
                  <FormSelect
                    name={field.name}
                    value={String(field.state.value)}
                    onChange={(event) => {
                      field.handleChange(Number(event.target.value));
                      clearFieldErrors("sat_uso_cfdi");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("sat_uso_cfdi", field.state.value);
                    }}
                    label="Uso de CFDI"
                    error={getError("sat_uso_cfdi")}
                  >
                    <option value={0} disabled>
                      Seleccionar...
                    </option>
                    {usosCfdi.map((item) => (
                      <option
                        key={item.id_sat_uso_cfdi}
                        value={item.id_sat_uso_cfdi}
                        className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                      >
                        {item.codigo} - {item.descripcion}
                      </option>
                    ))}
                  </FormSelect>
                )}
              </form.Field>
              <form.Field name="direccion_fiscal">
                {(field) => (
                  <FormInput
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("direccion_fiscal");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("direccion_fiscal", field.state.value);
                    }}
                    label="Dirección fiscal"
                    placeholder="Dirección fiscal"
                    error={getError("direccion_fiscal")}
                  />
                )}
              </form.Field>
              <form.Field name="colonia">
                {(field) => (
                  <FormInput
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("colonia");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("colonia", field.state.value);
                    }}
                    label="Colonia"
                    placeholder="Colonia"
                    error={getError("colonia")}
                  />
                )}
              </form.Field>
              <form.Field name="codigo_postal">
                {(field) => (
                  <FormInput
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("codigo_postal");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("codigo_postal", field.state.value);
                    }}
                    label="Código Postal"
                    placeholder="C.P."
                    error={getError("codigo_postal")}
                  />
                )}
              </form.Field>
              <form.Field name="ciudad">
                {(field) => (
                  <FormInput
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("ciudad");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("ciudad", field.state.value);
                    }}
                    label="Ciudad"
                    placeholder="Ciudad"
                    error={getError("ciudad")}
                  />
                )}
              </form.Field>
              <form.Field name="estado">
                {(field) => (
                  <FormInput
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("estado");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("estado", field.state.value);
                    }}
                    label="Estado"
                    placeholder="Estado"
                    error={getError("estado")}
                  />
                )}
              </form.Field>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pb-8">
          <FormCancelButton
            onClick={() => {
              handleReset();
              handleResetRfcValidation();
            }}
            disabled={isPending}
          />
          <FormSubmitButton
            isPending={isPending}
            loadingLabel={isEditing ? "Actualizando..." : "Guardando..."}
          >
            {isEditing ? "Actualizar Cliente" : "Registrar Cliente"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
