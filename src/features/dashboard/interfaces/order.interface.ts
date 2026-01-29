export interface Order {
  id: string;
  status: "Completado" | "En Proceso" | "Pendiente Pago" | "Retrasado";
  folio: string;
  client: {
    name: string;
    initials: string;
    colorClass: string; // For the avatar background/text
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
