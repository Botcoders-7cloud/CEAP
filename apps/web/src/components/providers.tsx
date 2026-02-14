"use client";
/**
 * CEAP — Provider wrapper
 * Sets up React Query and loads user session.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30 * 1000,
            retry: 1,
        },
    },
});

export function Providers({ children }: { children: React.ReactNode }) {
    const loadUser = useAuthStore((s) => s.loadUser);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        loadUser();
        setMounted(true);
    }, [loadUser]);

    if (!mounted) return null;

    return (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
}
