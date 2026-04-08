import axios from "axios";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { verifyRfcWithFacturama } from "@/src/features/customers/services/verifyRfc.server";
import { authOptions } from "@/src/lib/auth";

export const runtime = "nodejs";

const getUpstreamErrorMessage = (payload: unknown) => {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  if ("message" in payload && typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  if ("Message" in payload && typeof payload.Message === "string" && payload.Message.trim()) {
    return payload.Message;
  }

  return undefined;
};

/**
 * Proxy interno para verificar RFCs sin exponer las credenciales de Facturama al cliente.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.accessToken) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rfc = searchParams.get("rfc")?.trim();

    if (!rfc) {
      return NextResponse.json({ error: "El RFC es requerido." }, { status: 400 });
    }

    const response = await verifyRfcWithFacturama(rfc);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error al verificar RFC con Facturama:", error);

    if (axios.isAxiosError(error)) {
      const message = getUpstreamErrorMessage(error.response?.data) ?? "No se pudo validar el RFC con Facturama.";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const message = error instanceof Error ? error.message : "No se pudo validar el RFC con Facturama.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}