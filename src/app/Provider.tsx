'use client';

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "react-hot-toast";
import { SessionProvider } from "next-auth/react";
import { Session } from "next-auth";
import { useState } from "react";
import { RadixThemeWrapper } from "@/src/components/RadixThemeWrapper";

export const Provider = ({ children, session }: { children: React.ReactNode, session?: Session | null }) => {
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
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        <RadixThemeWrapper>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </RadixThemeWrapper>

        <Toaster position="top-right" />
      </QueryClientProvider>
    </SessionProvider>
  );
};