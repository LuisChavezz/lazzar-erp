"use client";

import QRCode from "react-qr-code";
import { QrCodeIcon } from "@/src/components/Icons";
import { Button } from "@/src/components/Button";
import type { MfaCreateResponse } from "../interfaces/auth.interface";

interface MfaQrSetupProps {
  mfaData: MfaCreateResponse;
  onContinue: () => void;
}

export default function MfaQrSetup({ mfaData, onContinue }: MfaQrSetupProps) {
  return (
    <section className="w-full rounded-4xl border border-slate-200/80 bg-white/75 p-6 shadow-xl shadow-sky-500/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 md:p-7">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
        <QrCodeIcon className="h-3.5 w-3.5" />
        Configurar autenticador
      </div>

      <div className="mt-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h3 className="brand-font text-3xl font-medium text-slate-900 transition-colors dark:text-white">
            Escanea el código QR
          </h3>
          <p className="text-sm leading-6 text-slate-500 transition-colors dark:text-slate-400">
            Escanea el código QR para configurar, almacenar y vincular tu cuenta con la autenticación multifactor.
          </p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center">
          <div className="flex h-48 w-48 items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10">
            {mfaData.setup_data.qr_link ? (
              <QRCode
                value={mfaData.setup_data.qr_link}
                size={160}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="M"
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-300">
                <QrCodeIcon className="h-16 w-16" />
                <span className="text-xs">Sin datos QR</span>
              </div>
            )}
          </div>
        </div>

        {/* Instrucción */}
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
          Una vez que hayas escaneado el código QR, haz clic en <span className="font-medium text-slate-700 dark:text-slate-200">Continuar</span>.
        </p>

        <Button
          variant="primary"
          rounded="full"
          onClick={onContinue}
          className="w-full py-3"
        >
          Continuar
        </Button>
      </div>
    </section>
  );
}

