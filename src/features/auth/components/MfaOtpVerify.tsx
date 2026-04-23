"use client";

import {
  useState,
  useRef,
  type KeyboardEvent,
  type ClipboardEvent,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { ArrowLeftIcon, LoadingSpinnerIcon, ShieldCheckIcon } from "@/src/components/Icons";
import { Button } from "@/src/components/Button";
import { useConfirmMfa } from "../hooks/useConfirmMfa";
import { useMfaLogin } from "../hooks/useMfaLogin";

const OTP_LENGTH = 6;

interface MfaOtpVerifyProps {
  onBack: () => void;
  onSuccess?: () => void;
  /** Indica si el usuario ya tenia MFA activo (flujo de login) o si acaba de configurar MFA por primera vez */
  mfaAlreadyEnabled?: boolean;
  /** Token efimero recibido en el login inicial; requerido cuando mfaAlreadyEnabled es true */
  ephemeralToken?: string;
}

export default function MfaOtpVerify({
  onBack,
  onSuccess,
  mfaAlreadyEnabled = false,
  ephemeralToken,
}: MfaOtpVerifyProps) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(OTP_LENGTH).fill(null));
  const confirmMfaMutation = useConfirmMfa();
  const mfaLoginMutation = useMfaLogin();
  const router = useRouter();
  /* Cubre el tiempo entre que la mutación termina y la sesión de NextAuth queda establecida */
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const otp = digits.join("");
  const isComplete = otp.length === OTP_LENGTH && digits.every((d) => d !== "");
  const isPending = mfaAlreadyEnabled
    ? mfaLoginMutation.isPending || isCreatingSession
    : confirmMfaMutation.isPending;

  /* Resetea los campos del codigo OTP */
  const resetDigits = () => setDigits(Array(OTP_LENGTH).fill(""));

  /* Envia el codigo OTP al servidor */
  const handleVerify = async () => {
    if (!isComplete) return;

    if (mfaAlreadyEnabled) {
      if (!ephemeralToken) return;
      
      try {
        const data = await mfaLoginMutation.mutateAsync({ ephemeral_token: ephemeralToken, code: otp });
        resetDigits();

        /* Crear sesión de NextAuth con los datos del usuario ya autenticado */
        setIsCreatingSession(true);
        const result = await signIn("credentials", {
          userData: JSON.stringify(data.user),
          redirect: false,
        });

        if (result?.error) {
          toast.error("No se pudo iniciar sesión. Inténtalo de nuevo.");
          setIsCreatingSession(false);
          return;
        }

        router.push("/select-branch");
        onSuccess?.();

      } catch {
        /* errores manejados por onError del mutation */
        setIsCreatingSession(false);
      }
      return;
    }

    try {
      await confirmMfaMutation.mutateAsync(otp);
      resetDigits();
      onSuccess?.();
    } catch {
      /* errores manejados por onError del mutation */
    }
  };

  /* Actualiza un dígito y avanza el foco al siguiente campo */
  const updateDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    updateDigit(index, event.target.value);
  };

  /* Retroceso: borra el campo actual o el anterior si ya está vacío */
  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits];
        next[index] = "";
        setDigits(next);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  /* Pegar un código completo rellena todos los campos de una vez */
  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((char, i) => {
      next[i] = char;
    });
    setDigits(next);
    const lastFilled = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[lastFilled]?.focus();
  };

  return (
    <section className="w-full rounded-4xl border border-slate-200/80 bg-white/75 p-6 shadow-xl shadow-sky-500/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 md:p-7">
      {/* Volver — solo en el flujo de configuración inicial */}
      {!mfaAlreadyEnabled && (
        <button
          type="button"
          onClick={onBack}
          className="group mb-6 inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Volver al código QR
        </button>
      )}
      {mfaAlreadyEnabled && <div className="mb-6" />}

      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h3 className="brand-font text-3xl font-medium text-slate-900 transition-colors dark:text-white">
            {mfaAlreadyEnabled ? "Verifica tu identidad" : "Ingresa el código"}
          </h3>
          <p className="text-sm leading-6 text-slate-500 transition-colors dark:text-slate-400">
            {mfaAlreadyEnabled
              ? "Ingresa el código de 6 dígitos de tu aplicación de autenticación."
              : "Ingresa el código de 6 dígitos para completar la configuración."}
          </p>
        </div>

        {/* OTP input */}
        <div
          className="flex items-center justify-between gap-2"
          role="group"
          aria-label="Código OTP de 6 dígitos"
        >
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              onFocus={(e) => e.target.select()}
              aria-label={`Dígito ${index + 1} de ${OTP_LENGTH}`}
              className={`h-12 w-12 rounded-2xl border text-center font-mono text-lg font-semibold text-slate-800 caret-sky-500 outline-none transition-all dark:text-white ${
                digit
                  ? "border-sky-400 bg-sky-50 shadow-sm shadow-sky-200/60 dark:border-sky-500/60 dark:bg-sky-500/10 dark:shadow-none"
                  : "border-slate-300 bg-white shadow-sm shadow-slate-200/80 dark:border-white/10 dark:bg-white/5 dark:shadow-none"
              } focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20`}
            />
          ))}
        </div>

        {/* Verificar */}
        <Button
          variant="primary"
          rounded="full"
          disabled={!isComplete || isPending}
          leftIcon={
            isPending
              ? <LoadingSpinnerIcon className="h-4 w-4 animate-spin" />
              : <ShieldCheckIcon className="h-4 w-4" />
          }
          className="w-full py-3"
          onClick={handleVerify}
        >
          {mfaLoginMutation.isPending
            ? "Verificando..."
            : isCreatingSession
              ? "Iniciando sesión..."
              : "Verificar código"}
        </Button>
      </div>
    </section>
  );
}
