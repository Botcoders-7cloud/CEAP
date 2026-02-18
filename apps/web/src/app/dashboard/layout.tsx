"use client";
/**
 * CEAP — Dashboard Layout
 * Wraps all dashboard pages with sidebar. Handles collapsed state.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) router.push("/login");
    }, [isLoading, isAuthenticated, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-dark)" }}>
                <div className="flex flex-col items-center gap-3">
                    <div className="w-9 h-9 border-2 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }} />
                    <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) return null;

    return (
        <div className="h-screen flex overflow-hidden">
            <Sidebar />
            <main className="flex-1 ml-[250px] overflow-y-auto mesh-gradient-2" style={{ background: "var(--bg-dark)" }}>
                <div className="p-6 lg:p-8 max-w-[1400px]">
                    {children}
                </div>
            </main>
        </div>
    );
}
