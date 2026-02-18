"use client";
/**
 * CEAP — Dashboard Sidebar
 * Clean, tight sidebar with subtle glow on active items
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import {
    LayoutDashboard, Calendar, Code2, Trophy, Award, Settings,
    Users, BookOpen, LogOut, ChevronLeft, Menu, BarChart3,
} from "lucide-react";
import { useState } from "react";

const STUDENT_NAV = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Events", href: "/dashboard/events", icon: Calendar },
    { label: "Coding Arena", href: "/dashboard/arena", icon: Code2 },
    { label: "Leaderboard", href: "/dashboard/leaderboard", icon: Trophy },
    { label: "Certificates", href: "/dashboard/certificates", icon: Award },
];

const ADMIN_NAV = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Events", href: "/dashboard/events", icon: Calendar },
    { label: "Problems", href: "/dashboard/problems", icon: BookOpen },
    { label: "Users", href: "/dashboard/users", icon: Users },
    { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuthStore();
    const [collapsed, setCollapsed] = useState(false);

    const navItems =
        user?.role === "admin" || user?.role === "super_admin" || user?.role === "faculty"
            ? ADMIN_NAV
            : STUDENT_NAV;

    return (
        <aside
            className={`fixed left-0 top-0 h-screen z-40 flex flex-col transition-all duration-300 ${collapsed ? "w-[68px]" : "w-[250px]"}`}
            style={{
                background: "var(--surface-1)",
                borderRight: "1px solid var(--border)",
            }}
        >
            {/* ── Logo ──────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 h-[60px] shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
                {!collapsed && (
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                            style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
                            C
                        </div>
                        <span className="text-lg font-bold tracking-tight gradient-text">CEAP</span>
                    </Link>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: "var(--text-muted)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                    {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            {/* ── Section label ──────────────────────────────────── */}
            {!collapsed && (
                <div className="px-5 pt-5 pb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--text-muted)" }}>
                        Navigation
                    </p>
                </div>
            )}

            {/* ── Nav Items ─────────────────────────────────────── */}
            <nav className={`flex-1 ${collapsed ? "px-2 py-3" : "px-3 pb-4"} space-y-0.5 overflow-y-auto`}>
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 rounded-xl transition-all duration-200 ${collapsed ? "justify-center p-2.5" : "px-3 py-2.5"}`}
                            style={
                                isActive
                                    ? {
                                        background: "rgba(124,58,237,0.1)",
                                        color: "var(--primary-light)",
                                        boxShadow: "inset 3px 0 0 var(--primary)",
                                    }
                                    : {
                                        color: "var(--text-secondary)",
                                    }
                            }
                            onMouseEnter={e => {
                                if (!isActive) {
                                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                                    e.currentTarget.style.color = "var(--text-primary)";
                                }
                            }}
                            onMouseLeave={e => {
                                if (!isActive) {
                                    e.currentTarget.style.background = "transparent";
                                    e.currentTarget.style.color = "var(--text-secondary)";
                                }
                            }}
                        >
                            <Icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
                            {!collapsed && (
                                <span className={`text-[13px] ${isActive ? "font-semibold" : "font-medium"}`}>
                                    {item.label}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* ── User Info ─────────────────────────────────────── */}
            <div className="shrink-0 p-3" style={{ borderTop: "1px solid var(--border)" }}>
                {!collapsed && user && (
                    <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl mb-2" style={{ background: "rgba(255,255,255,0.02)" }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}>
                            {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate leading-tight">{user.full_name}</p>
                            <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </p>
                        </div>
                    </div>
                )}
                <button
                    onClick={logout}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg w-full text-[13px] font-medium transition-all ${collapsed ? "justify-center" : ""}`}
                    style={{ color: "var(--text-muted)" }}
                    onMouseEnter={e => {
                        e.currentTarget.style.color = "var(--danger)";
                        e.currentTarget.style.background = "rgba(239,68,68,0.06)";
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.color = "var(--text-muted)";
                        e.currentTarget.style.background = "transparent";
                    }}
                >
                    <LogOut size={16} />
                    {!collapsed && <span>Log out</span>}
                </button>
            </div>
        </aside>
    );
}
