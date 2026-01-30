'use client';

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "react-hot-toast";
import { SessionProvider } from "next-auth/react";
import { Session } from "next-auth";

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: { // Set default options for queries
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})


export const Provider = ({ children, session }: { children: React.ReactNode, session?: Session | null }) => {
  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={ false } />
        <Toaster position="top-right" />
      </QueryClientProvider>
    </SessionProvider>
  )
}