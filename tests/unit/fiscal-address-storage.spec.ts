import { expect, test } from "@playwright/test";
import {
  claimLegacyFiscalAddressState,
  fiscalAddressForCompany,
  migrateFiscalAddressStorage,
} from "@/src/features/sat/utils/fiscalAddressStorage";
import type { FiscalAddress } from "@/src/features/sat/interfaces/fiscal-address.interface";

/**
 * EC-847: la Dirección fiscal va por empresa. La guardada antes (una sola) no
 * se pierde: la migración la aparta y la primera empresa que el servidor
 * confirma la reclama.
 */

const address = (calle: string): FiscalAddress => ({
  calle,
  numero_exterior: "1",
  colonia: "Centro",
  municipio: "Guadalajara",
  estado: "Jalisco",
  pais: "México",
  codigo_postal: "44100",
});

test("v0 → v1 aparta la dirección única sin borrarla", () => {
  expect(migrateFiscalAddressStorage({ fiscalAddress: address("A") }, 0)).toEqual({
    addressesByCompany: {},
    legacyAddress: address("A"),
  });
});

test("v0 sin dirección o sin estado migra vacío", () => {
  const empty = { addressesByCompany: {}, legacyAddress: null };
  expect(migrateFiscalAddressStorage({ fiscalAddress: null }, 0)).toEqual(empty);
  expect(migrateFiscalAddressStorage(undefined, 0)).toEqual(empty);
});

test("v1 se conserva tal cual", () => {
  const state = { addressesByCompany: { "1": address("A") }, legacyAddress: null };
  expect(migrateFiscalAddressStorage(state, 1)).toEqual(state);
});

test("la empresa confirmada reclama la dirección anterior una sola vez", () => {
  const migrated = { addressesByCompany: {}, legacyAddress: address("A") };
  const claimed = claimLegacyFiscalAddressState(migrated, 1);
  expect(claimed).toEqual({ addressesByCompany: { "1": address("A") }, legacyAddress: null });
  // Una confirmación posterior (otra empresa tras un cambio) ya no la mueve.
  expect(claimLegacyFiscalAddressState(claimed, 55)).toBe(claimed);
});

test("no pisa la dirección propia de la empresa ni pierde la anterior", () => {
  const state = { addressesByCompany: { "1": address("B") }, legacyAddress: address("A") };
  expect(claimLegacyFiscalAddressState(state, 1)).toBe(state);
});

test("cada empresa ve solo la suya; sin empresa, ninguna", () => {
  const byCompany = { "1": address("A"), "55": address("B") };
  expect(fiscalAddressForCompany(byCompany, 1)).toEqual(address("A"));
  expect(fiscalAddressForCompany(byCompany, 55)).toEqual(address("B"));
  expect(fiscalAddressForCompany(byCompany, 7)).toBeNull();
  expect(fiscalAddressForCompany(byCompany, null)).toBeNull();
});
