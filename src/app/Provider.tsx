'use client';

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "react-hot-toast";
import { SessionProvider } from "next-auth/react";
import { Session } from "next-auth";
import { Theme } from "@radix-ui/themes";
import { useState } from "react";

export const Provider = ({ children, session }: { children: React.ReactNode, session?: Session | null }) => {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { // Set default options for queries
      queries: {
        retry: 1,
        staleTime: 15 * 60 * 1000, // 15 minutes
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        <Theme>
          {children}
          <ReactQueryDevtools initialIsOpen={ false } />
          <Toaster position="top-right" />
        </Theme>
      </QueryClientProvider>
    </SessionProvider>
  )
}