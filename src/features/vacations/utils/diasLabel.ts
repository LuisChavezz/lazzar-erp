/**
 * Cantidad de días con su plural: "1 día" / "5 días", o con `laborales`,
 * "1 día laboral" / "5 días laborales".
 */
export const diasLabel = (dias: number, { laborales = false }: { laborales?: boolean } = {}) => {
  if (laborales) {
    return dias === 1 ? "1 día laboral" : `${dias} días laborales`;
  }
  return dias === 1 ? "1 día" : `${dias} días`;
};
