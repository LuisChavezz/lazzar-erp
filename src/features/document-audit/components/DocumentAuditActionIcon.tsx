import {
  BanIcon,
  DeleteIcon,
  HistoryIcon,
  PlusIcon,
  ReopenIcon,
  TraspasosIcon,
} from "@/src/components/Icons";

/** Ícono de la acción de un evento; una acción desconocida usa el de historial. */
export function DocumentAuditActionIcon({
  accion,
  className = "w-4 h-4",
}: {
  accion: string;
  className?: string;
}) {
  const props = { className, "aria-hidden": true } as const;
  switch (accion) {
    case "crear":
      return <PlusIcon {...props} />;
    case "estatus":
      return <TraspasosIcon {...props} />;
    case "baja":
      return <BanIcon {...props} />;
    case "restaurar":
      return <ReopenIcon {...props} />;
    case "eliminar":
      return <DeleteIcon {...props} />;
    default:
      return <HistoryIcon {...props} />;
  }
}
