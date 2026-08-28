import { Metadata } from "next";
import RequestForm from "@/src/features/requests/components/RequestForm";

export const metadata: Metadata = {
  title: "Nueva Solicitud | ERP",
  description:
    "Crea una nueva solicitud con información de cliente, productos y montos en el ERP.",
  openGraph: {
    title: "Nueva Solicitud | ERP",
    description:
      "Crea una nueva solicitud con información de cliente, productos y montos en el ERP.",
    type: "website",
  },
};

export default function CrmRequestsNewPage() {
  return (
    <div className="w-full space-y-6 pt-2">
      <RequestForm />
    </div>
  );
}
