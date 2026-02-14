"use client";
/**
 * CEAP — Dashboard Layout
 * Wraps all dashboard pages with sidebar and top bar.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isLoading, isAuthenticated, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }} />
            </div>
        );
    }

    if (!isAuthenticated) return null;

    return (
        <div className="h-screen flex overflow-hidden">
            <Sidebar />
            <main className="flex-1 ml-[260px] p-6 lg:p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
