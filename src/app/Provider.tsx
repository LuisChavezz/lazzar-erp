'use client';

import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { type ComponentType, useState } from "react";
import { SpeedInsights } from '@vercel/speed-insights/next';

type QueryDevtoolsProps = {
  initialIsOpen?: boolean;
};

// Carga dinámica de React Query Devtools solo en desarrollo para evitar sobrecarga en producción
const QueryDevtools: ComponentType<QueryDevtoolsProps> =
  process.env.NODE_ENV === "development"
    ? dynamic<QueryDevtoolsProps>(
        () => import("@tanstack/react-query-devtools").then((mod) => mod.ReactQueryDevtools),
        { ssr: false }
      )
    : () => null;

export const Provider = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { // Opciones por defecto para las queries
      queries: {
        retry: 1,
        staleTime: 15 * 60 * 1000, // 15 minutos
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>

      {/* Speed Insights sólo envía datos en producción; debug desactivado en desarrollo */}
      <SpeedInsights debug={false} />

      {children}
      <QueryDevtools initialIsOpen={false} />

      <Toaster position="top-right" />
      
    </QueryClientProvider>
  );
};