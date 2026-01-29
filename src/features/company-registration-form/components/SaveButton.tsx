"use client";

import { useIsMutating } from "@tanstack/react-query";
import { LoadingSpinnerIcon, SaveIcon } from "../../../components/Icons";

export const SaveButton = () => {
  const isMutating = useIsMutating({ mutationKey: ["register-company"] });
  const isPending = isMutating > 0;

  return (
    <button
      type="submit"
      form="company-registration-form"
      disabled={isPending}
      className={`group relative inline-flex items-center justify-center p-3 sm:px-6 sm:py-2.5 text-sm font-semibold cursor-pointer text-white transition-all duration-200 bg-slate-900 dark:bg-white dark:text-black rounded-xl hover:bg-brand-600 dark:hover:bg-brand-400 dark:hover:text-white shadow-lg shadow-slate-900/20 hover:shadow-brand-500/30 hover:-translate-y-0.5 active:translate-y-0 ${
        isPending ? "opacity-75 cursor-wait" : ""
      }`}
    >
      {isPending ? (
        <LoadingSpinnerIcon className="animate-spin -ml-1 mr-2 h-4 w-4 text-white dark:text-black" />
      ) : (
        <SaveIcon className="w-6 h-6 sm:w-4 sm:h-4 sm:mr-2" />
      )}
      <span className="hidden sm:inline">{isPending ? "Guardando..." : "Guardar Empresa"}</span>
    </button>
  );
};
