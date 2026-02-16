export interface Order {
  id: string;
  folio: string;
  status: "Completado" | "En Proceso" | "Pendiente Pago" | "Retrasado";
  client: {
    name: string;
    initials: string;
    colorClass: string;
  };
  pieces: number;
  seller: string;
  date: string;
  classification: string;
  amount: string;
  partiality: string;
  deliveryDate: string;
  newDate: string;
  zip: string;
}
