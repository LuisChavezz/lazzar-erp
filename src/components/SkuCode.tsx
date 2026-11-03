import type React from "react";
import { splitSku, type LineCodes } from "@/src/utils/sku";

/**
 * Identificador de un renglón, fácil de leer:
 *  - con SKU de variante (producto terminado): "1000 / 503 / CH" (modelo /
 *    color / talla, como Inditex), con el SKU crudo en el `title`;
 *  - sin variante (materia prima): el código del producto.
 * Debajo, en tenue, el código Proscai cuando existe.
 */
export function SkuCode({ linea }: { linea: LineCodes }) {
  const sku = linea.producto_variante_sku?.trim();
  const codigo = linea.producto_codigo?.trim();
  const proscai = linea.producto_cod_proscai?.trim();
  const parts = splitSku(sku);

  let main: React.ReactNode;
  if (parts) {
    const slash = <span className="mx-0.5 text-slate-300 dark:text-slate-600">/</span>;
    main = (
      <span title={`SKU ${sku} · modelo ${parts.modelo}, color ${parts.color}, talla ${parts.talla}`}>
        {parts.modelo}
        {slash}
        {parts.color}
        {slash}
        <span className="text-sky-700 dark:text-sky-300">{parts.talla}</span>
      </span>
    );
  } else if (sku) {
    main = <span title={`SKU ${sku}`}>{sku}</span>;
  } else if (codigo) {
    main = (
      <span title={`Código del producto ${codigo}`}>
        <span className="mr-1 font-sans text-[10px] font-normal text-slate-400 dark:text-slate-500">Cód.</span>
        {codigo}
      </span>
    );
  } else {
    main = "—";
  }

  return (
    <span className="inline-flex flex-col font-mono font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
      {main}
      {proscai && (
        <span
          className="font-sans text-[10px] font-normal text-slate-400 dark:text-slate-500"
          title={`Código Proscai ${proscai}`}
        >
          Proscai {proscai}
        </span>
      )}
    </span>
  );
}
