import { z } from "zod";

/**
 * `moneda_codigo` del body de `POST /api/quotes/[quoteId]/send-email`: código
 * ISO de la moneda de la cotización, resuelto en el cliente
 * (`loadQuoteForDocument`) porque el retrieve solo trae `moneda` como id y
 * este Route Handler no puede consultar el catálogo (las cookies del backend
 * solo viajan desde el navegador).
 *
 * Opcional y nullable: sin código (o con `null`) los importes del correo se
 * pintan sin símbolo, nunca en MXN. Un valor de otro tipo es un payload
 * malformado (400).
 */
export const quoteEmailMonedaCodigoSchema = z.string().nullable().optional();
