import { useQuery } from "@tanstack/react-query";
import { GoogleStatusResponse } from "../interfaces/google.interface";
import { googleStatus } from "../services/actions";

/* Consulta el estado de conexión OAuth de Google del usuario autenticado */
export const useGoogleStatus = () =>
  useQuery<GoogleStatusResponse>({
    queryKey: ["google", "oauth", "status"],
    queryFn: googleStatus,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
