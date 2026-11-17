import type { Metadata } from "next";
import { SalidasMaquilaView } from "@/src/features/maquila-outputs/components/SalidasMaquilaView";

export const metadata: Metadata = {
  title: "Salidas a Maquila | Producción | ERP",
};

export default function SalidasMaquilaPage() {
  return <SalidasMaquilaView />;
}
