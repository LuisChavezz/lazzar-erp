"use client";

import { ColorPicker, useColor, type IColor } from "react-color-palette";

import { FormInput } from "../../../components/FormInput";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { ColorsIcon } from "../../../components/Icons";
import { Color } from "../interfaces/color.interface";
import { useColorForm } from "../hooks/useColorForm";

interface ColorFormProps {
  onSuccess: () => void;
  colorToEdit?: Color | null;
}

interface ColorPickerFieldProps {
  initialHex: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
}

function ColorPickerField({ initialHex, onChange, disabled }: ColorPickerFieldProps) {
  const [color, setColor] = useColor(`#${initialHex}`);

  const handleChangeComplete = (newColor: IColor) => {
    const hex = newColor.hex.replace("#", "").toUpperCase();
    onChange(hex);
  };

  return (
    <ColorPicker
      color={color}
      onChange={setColor}
      onChangeComplete={handleChangeComplete}
      hideAlpha
      hideInput={["rgb", "hsv"]}
      disabled={disabled}
    />
  );
}

export default function ColorForm({ onSuccess, colorToEdit }: ColorFormProps) {
  const {
    form,
    formRef,
    formKey,
    pickerKey,
    isPending,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useColorForm({
    onSuccess,
    colorToEdit,
  });

  return (
    <form ref={formRef} key={formKey} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <ColorsIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Información General
              </h3>
              <p className="text-xs text-slate-500">Datos base y vista previa del color</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field md:col-span-2">
                <form.Field name="nombre">
                  {(field) => (
                    <FormInput
                      label="Nombre del Color"
                      placeholder="Ej. Rojo Carmín"
                      variant="ghost"
                      className="text-3xl font-bold"
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

              <div className="group/field md:col-span-2">
                <form.Field name="codigo_hex">
                  {(field) => (
                    <ColorPickerField
                      key={pickerKey}
                      initialHex={field.state.value}
                      onChange={(hex) => {
                        field.handleChange(hex);
                        clearFieldErrors("codigo_hex");
                      }}
                      disabled={isPending}
                    />
                  )}
                </form.Field>
                {getError("codigo_hex") && (
                  <p className="mt-1 text-xs text-red-500">{getError("codigo_hex")?.message}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {colorToEdit ? "Actualizar Color" : "Registrar Color"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
