"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { StockItem } from "@/src/features/stock/interfaces/stock.interface";

type MovementType = "entrada" | "salida" | "ajuste";

interface StockMovement {
  id: string;
  type: MovementType;
  title: string;
  quantityLine: string;
  detailLine: string;
  dateLabel: string;
}

interface WmsStockHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockItem: StockItem;
}

const movementStyles: Record<
  MovementType,
  {
    dotClassName: string;
    titleClassName: string;
  }
> = {
  entrada: {
    dotClassName: "bg-emerald-500",
    titleClassName: "text-emerald-600 dark:text-emerald-300",
  },
  salida: {
    dotClassName: "bg-rose-500",
    titleClassName: "text-rose-600 dark:text-rose-300",
  },
  ajuste: {
    dotClassName: "bg-amber-500",
    titleClassName: "text-amber-600 dark:text-amber-300",
  },
};

const getLocationName = (stockItem: StockItem) => {
  const location = stockItem.ubicacion_info as StockItem["ubicacion_info"] & {
    nombre_completo?: string;
    nombre?: string;
  };
  return location?.nombre_completo ?? location?.nombre ?? "Sin ubicación";
};

const buildMockMovements = (stockItem: StockItem): StockMovement[] => {
  const almacenNombre = stockItem.almacen_info?.nombre ?? "ALM-01";
  const ubicacionNombre = getLocationName(stockItem);

  return [
    {
      id: "entrada-1",
      type: "entrada",
      title: "Entrada",
      quantityLine: "+25 pz",
      detailLine: `${almacenNombre} / ${ubicacionNombre} • Ref: OC-000123`,
      dateLabel: "Hoy, 10:12",
    },
    {
      id: "salida-1",
      type: "salida",
      title: "Salida",
      quantityLine: "-10 pz",
      detailLine: `${almacenNombre} / ${ubicacionNombre} • Ref: PED-000245`,
      dateLabel: "Ayer, 16:41",
    },
    {
      id: "ajuste-1",
      type: "ajuste",
      title: "Ajuste",
      quantityLine: "Δ -2 pz",
      detailLine: "Motivo: Conteo físico",
      dateLabel: "Mar 03, 09:05",
    },
    {
      id: "entrada-2",
      type: "entrada",
      title: "Entrada",
      quantityLine: "+8 pz",
      detailLine: `${almacenNombre} / ${ubicacionNombre} • Ref: OC-000128`,
      dateLabel: "Feb 27, 13:22",
    },
    {
      id: "salida-2",
      type: "salida",
      title: "Salida",
      quantityLine: "-4 pz",
      detailLine: `${almacenNombre} / ${ubicacionNombre} • Ref: PED-000231`,
      dateLabel: "Feb 25, 11:08",
    },
    {
      id: "ajuste-2",
      type: "ajuste",
      title: "Ajuste",
      quantityLine: "Δ +3 pz",
      detailLine: "Motivo: Diferencia de auditoría",
      dateLabel: "Feb 24, 18:19",
    },
    {
      id: "entrada-3",
      type: "entrada",
      title: "Entrada",
      quantityLine: "+15 pz",
      detailLine: `${almacenNombre} / ${ubicacionNombre} • Ref: OC-000119`,
      dateLabel: "Feb 21, 09:47",
    },
    {
      id: "salida-3",
      type: "salida",
      title: "Salida",
      quantityLine: "-6 pz",
      detailLine: `${almacenNombre} / ${ubicacionNombre} • Ref: PED-000218`,
      dateLabel: "Feb 20, 14:03",
    },
    {
      id: "ajuste-3",
      type: "ajuste",
      title: "Ajuste",
      quantityLine: "Δ -1 pz",
      detailLine: "Motivo: Producto dañado",
      dateLabel: "Feb 19, 12:26",
    },
    {
      id: "entrada-4",
      type: "entrada",
      title: "Entrada",
      quantityLine: "+12 pz",
      detailLine: `${almacenNombre} / ${ubicacionNombre} • Ref: OC-000111`,
      dateLabel: "Feb 18, 08:55",
    },
  ];
};

export const WmsStockHistoryDialog = ({
  open,
  onOpenChange,
  stockItem,
}: WmsStockHistoryDialogProps) => {
  const movements = buildMockMovements(stockItem);
  const productName = stockItem.producto_info?.nombre ?? "Producto sin nombre";

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="720px"
      title="Historial"
      description={productName}
    >
      <div className="max-h-90 overflow-y-auto px-2">
        <div className="relative pl-3 border-l border-slate-200 dark:border-slate-700 space-y-3">
        {movements.map((movement) => {
          const styles = movementStyles[movement.type];
          return (
            <div key={movement.id} className="relative">
              <div
                className={`absolute -left-4 top-1.5 w-2 h-2 rounded-full ${styles.dotClassName}`}
              />
              <div className="space-y-0.5">
                <p className={`text-sm leading-none font-semibold ${styles.titleClassName}`}>
                  {movement.title}
                </p>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {movement.quantityLine} • {movement.detailLine}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{movement.dateLabel}</p>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </MainDialog>
  );
};
