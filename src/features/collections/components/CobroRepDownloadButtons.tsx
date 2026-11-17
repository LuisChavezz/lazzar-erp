"use client";

import { Button } from "@/src/components/Button";
import { DownloadIcon, LoadingSpinnerIcon } from "@/src/components/Icons";
import type { CfdiFileFormat } from "@/src/utils/officialCfdiFile";
import type { Cobro } from "../interfaces/collection.interface";
import { useDownloadCobroRep } from "../hooks/useDownloadCobroRep";

type CobroRepFileSource = Pick<Cobro, "id" | "folio" | "rep_uuid" | "rep_facturama_id">;

const FORMAT_LABELS: Record<CfdiFileFormat, string> = {
  pdf: "Descargar PDF",
  xml: "Descargar XML",
};

function CobroRepDownloadButton({ cobro, format }: { cobro: CobroRepFileSource; format: CfdiFileFormat }) {
  const { download, isDownloading } = useDownloadCobroRep(cobro, format);
  const Icon = isDownloading ? LoadingSpinnerIcon : DownloadIcon;

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={download}
      disabled={isDownloading}
      aria-busy={isDownloading}
      // El encabezado del diálogo tiene su propio "Descargar PDF" (el del cobro,
      // EC-859): el nombre accesible dice que este es el del REP.
      aria-label={`${FORMAT_LABELS[format]} del REP`}
    >
      <Icon className={`w-4 h-4${isDownloading ? " animate-spin" : ""}`} aria-hidden="true" />
      {FORMAT_LABELS[format]}
    </Button>
  );
}

/**
 * "Descargar PDF" y "Descargar XML" del REP timbrado. Cada botón tiene su propio
 * candado y su propio estado de carga. Quien lo monta ya comprobó
 * `hasCobroRepFile`.
 */
export function CobroRepDownloadButtons({ cobro }: { cobro: CobroRepFileSource }) {
  return (
    <div className="flex flex-wrap gap-2 mb-2">
      <CobroRepDownloadButton cobro={cobro} format="pdf" />
      <CobroRepDownloadButton cobro={cobro} format="xml" />
    </div>
  );
}
