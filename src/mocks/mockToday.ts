// Solo servidor: lo importan únicamente las fixtures `mocks/` de los módulos,
// que también son server-only (EC-773).
import "server-only";

/**
 * "Hoy" fijo para las fechas que faker calcula relativas al momento actual
 * (`faker.date.soon/past` sin `refDate`): con la semilla de cada mock, los
 * datos salen idénticos en cada build (EC-773).
 */
export const MOCK_HOY = new Date("2025-05-01T00:00:00.000Z");
