import { expect, test } from "@playwright/test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { getLiveQuoteDetailQueryOptions } from "@/src/features/quotes/hooks/useLiveQuoteStatus";
import { resolveLiveQuoteStatus } from "@/src/features/quotes/utils/quoteLiveStatus";
import type { QuoteById } from "@/src/features/quotes/interfaces/quote.interface";
import type { QuoteResourceRead } from "@/src/features/quotes/utils/quoteResource";

/**
 * EC-809, hallazgo de revisión: el observador del estatus vivo está montado
 * siempre, así que lo que relee el detalle al abrir Autorizar/Rechazar es que
 * la consulta pase a habilitada con datos vencidos. Con el `staleTime` global
 * de la app (15 min) un detalle en caché de hace minutos no se volvía a pedir.
 */

const FIFTEEN_MIN = 15 * 60 * 1000;
// Solo el `estatus` importa al estatus vivo.
const detail = (estatus: number) =>
  ({ data: { estatus }, resource: "cotizaciones" }) as unknown as QuoteResourceRead<QuoteById>;

test("un detalle en caché más viejo que la apertura se vuelve a pedir y su respuesta manda", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: FIFTEEN_MIN, retry: false } } });
  const options = getLiveQuoteDetailQueryOptions(7, true);
  // "Ver detalle" lo dejó en caché hace un minuto, aún dentro de los 15 min.
  client.setQueryData(options.queryKey, detail(2), { updatedAt: Date.now() - 60_000 });
  const openedAt = Date.now();

  let calls = 0;
  const observer = new QueryObserver(client, {
    ...getLiveQuoteDetailQueryOptions(7, false),
    queryFn: async () => (calls++, detail(4)),
  });
  const unsubscribe = observer.subscribe(() => {});
  expect(calls).toBe(0);

  // El diálogo se abre: la consulta se habilita.
  observer.setOptions({ ...options, queryFn: async () => (calls++, detail(4)) });
  await expect.poll(() => client.getQueryState(options.queryKey)?.dataUpdatedAt ?? 0).toBeGreaterThanOrEqual(openedAt);
  expect(calls).toBe(1);

  // Lo leído después de abrir dice Rechazada: el diálogo avisa.
  const state = client.getQueryState(options.queryKey)!;
  expect(
    resolveLiveQuoteStatus({
      snapshotEstatus: 2,
      openedAt,
      detail: { estatus: state.data!.data.estatus, updatedAt: state.dataUpdatedAt },
    }),
  ).toEqual({ estatus: 4 });
  unsubscribe();
});

test("con el staleTime global (sin la corrección) el mismo caso no pedía nada", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: FIFTEEN_MIN, retry: false } } });
  const { staleTime: _ignored, ...withoutFix } = getLiveQuoteDetailQueryOptions(7, true);
  void _ignored;
  client.setQueryData(withoutFix.queryKey, detail(2), { updatedAt: Date.now() - 60_000 });
  let calls = 0;
  const observer = new QueryObserver(client, { ...withoutFix, enabled: false, queryFn: async () => (calls++, detail(4)) });
  const unsubscribe = observer.subscribe(() => {});
  observer.setOptions({ ...withoutFix, queryFn: async () => (calls++, detail(4)) });
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(calls).toBe(0);
  unsubscribe();
});
