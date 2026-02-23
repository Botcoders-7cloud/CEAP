"use client";
/**
 * CEAP — Dashboard Layout
 * Wraps all dashboard pages with sidebar. Handles collapsed state.
 * Forces password change on first login.
 */
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Sidebar } from "@/components/sidebar";
import { startKeepAlive, stopKeepAlive } from "@/lib/keep_alive";
import { Shield } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading, mustChangePassword } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) router.push("/login");
    }, [isLoading, isAuthenticated, router]);

    // Force password change redirect
    useEffect(() => {
        if (mustChangePassword && pathname !== "/dashboard/settings") {
            router.push("/dashboard/settings");
        }
    }, [mustChangePassword, pathname, router]);

    // Keep Render backend warm while user is logged in
    useEffect(() => {
        if (isAuthenticated) {
            startKeepAlive();
            return () => stopKeepAlive();
        }
    }, [isAuthenticated]);

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
                    {mustChangePassword && (
                        <div className="mb-6 p-4 rounded-xl flex items-center gap-3"
                            style={{ background: "rgba(212,149,106,0.1)", border: "1px solid rgba(212,149,106,0.3)" }}>
                            <Shield size={18} style={{ color: "var(--warning)", flexShrink: 0 }} />
                            <div>
                                <p className="text-sm font-semibold" style={{ color: "var(--warning)" }}>
                                    Password change required
                                </p>
                                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                    Please change your temporary password before accessing the platform.
                                </p>
                            </div>
                        </div>
                    )}
                    {children}
                </div>
            </main>
        </div>
    );
}

