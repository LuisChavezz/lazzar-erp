"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RegisterSchema, RegisterSchemaType } from "../schemas/register.schema";
import { useRegisterForm } from "../hooks/useRegisterForm";
import { LoadingSpinnerIcon } from "../../../components/Icons";
import { STEPS } from "../constants/register.constants";
import { RegisterSteps } from "./RegisterSteps";

export default function RegisterForm() {
  const { currentStep, isLoading, handleNext, handleBack, onSubmit } = useRegisterForm();
  
  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<RegisterSchemaType>({
    resolver: zodResolver(RegisterSchema),
    mode: "onChange",
  });

  // Manejar el siguiente paso del formulario
  const onNextStep = () => handleNext(trigger);

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Registro de Cuenta</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Paso {currentStep} de 4: <span className="text-brand-500 font-medium">{STEPS[currentStep - 1].title}</span>
        </p>
        
        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mt-4 overflow-hidden">
          <div 
            className="h-full bg-brand-500 transition-all duration-300 ease-in-out"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>
      </div>

      <form key={currentStep} onSubmit={handleSubmit(onSubmit)} className="space-y-6" autoComplete="off">
        {/* Campos ocultos para engañar al autocompletado del navegador */}
        <input type="text" name="fake_username_hide" autoComplete="off" className="hidden" tabIndex={-1} />
        <input type="password" name="fake_password_hide" autoComplete="off" className="hidden" tabIndex={-1} />
        
        <RegisterSteps
          currentStep={currentStep}
          register={register}
          errors={errors}
          getValues={getValues}
        />

        <div className="flex items-center justify-between pt-4 gap-4">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Atrás
            </button>
          )}
          
          <div className="flex gap-2 ml-auto">
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={onNextStep}
                className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-full shadow-lg shadow-brand-500/30 transition-all cursor-pointer"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-full shadow-lg shadow-brand-500/30 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinnerIcon className="w-4 h-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  "Confirmar y Registrar"
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
