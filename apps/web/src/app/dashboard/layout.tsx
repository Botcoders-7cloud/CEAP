"use client";
/**
 * CEAP — Dashboard Layout
 * Sidebar + mobile hamburger menu + force-password-change.
 */
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Sidebar } from "@/components/sidebar";
import { startKeepAlive, stopKeepAlive } from "@/lib/keep_alive";
import { Shield, Menu, X } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading, mustChangePassword } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) router.push("/login");
    }, [isLoading, isAuthenticated, router]);

    useEffect(() => {
        if (mustChangePassword && pathname !== "/dashboard/settings") {
            router.push("/dashboard/settings");
        }
    }, [mustChangePassword, pathname, router]);

    useEffect(() => {
        if (isAuthenticated) {
            startKeepAlive();
            return () => stopKeepAlive();
        }
    }, [isAuthenticated]);

    // Close mobile sidebar on navigation
    useEffect(() => { setMobileOpen(false); }, [pathname]);

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
            {/* Mobile hamburger */}
            <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {/* Mobile overlay */}
            {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}

            {/* Sidebar wrapper — mobile-open class slides it in */}
            <div className={mobileOpen ? "mobile-open" : ""} style={{ display: "contents" }}>
                <Sidebar />
            </div>

            <main className="flex-1 ml-[250px] overflow-y-auto" style={{ background: "var(--bg-dark)" }}>
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
