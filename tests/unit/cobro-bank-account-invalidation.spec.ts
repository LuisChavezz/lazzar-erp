import { expect, test } from "@playwright/test";
import { QueryClient } from "@tanstack/react-query";
import {
  COBRO_BANK_ACCOUNT_QUERY_KEYS,
  invalidateCobroBankAccountData,
} from "@/src/features/collections/hooks/cobroQueryCache";

/**
 * EC-734: Cobros lleva la moneda y el estado de la cuenta bancaria embebidos en
 * cada cobro y en su resumen. Una mutación de cuentas bancarias debe invalidar
 * esas llaves, no solo `["bank-accounts"]`, o un borrador sobre una cuenta
 * desactivada seguiría pareciendo aplicable hasta que venza el staleTime.
 */

test("invalida el listado de cobros y su resumen, y nada más de Cobros", async () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(["cobros"], []);
  queryClient.setQueryData(["cobros-resumen"], { periodo: {}, por_moneda: [] });
  queryClient.setQueryData(["bank-accounts"], []);

  await invalidateCobroBankAccountData(queryClient);

  expect(queryClient.getQueryState(["cobros"])?.isInvalidated).toBe(true);
  expect(queryClient.getQueryState(["cobros-resumen"])?.isInvalidated).toBe(true);
  // `["bank-accounts"]` lo invalida la propia mutación; este helper no lo toca.
  expect(queryClient.getQueryState(["bank-accounts"])?.isInvalidated).toBe(false);
});

test("las llaves son las que usan `useCobros` y `useCobrosResumen`", () => {
  expect(COBRO_BANK_ACCOUNT_QUERY_KEYS).toEqual([["cobros"], ["cobros-resumen"]]);
});
