export interface ProductionOrder {
  estatusOp: "En Proceso" | "Planificado" | "Control Calidad" | "Terminado";
  pedido: string;
  fechaIngreso: string;
  fechaEntrega: string;
  op: string;
  fechaOp: string;
  modelo: string;
  producto: string;
  color: string;
  categoria: string;
  cantidad: number;
  centroConfeccion: string;
}
