"use client";
/**
 * CEAP — Dashboard Sidebar
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import {
    LayoutDashboard,
    Calendar,
    Code2,
    Trophy,
    Award,
    Settings,
    Users,
    BookOpen,
    LogOut,
    ChevronLeft,
    Menu,
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
    { label: "Analytics", href: "/dashboard/analytics", icon: Trophy },
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
            className={`fixed left-0 top-0 h-screen z-40 flex flex-col transition-all duration-300 ${collapsed ? "w-[72px]" : "w-[260px]"
                }`}
            style={{
                background: "var(--bg-card)",
                borderRight: "1px solid var(--border-color)",
            }}
        >
            {/* Logo */}
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--border-color)" }}>
                {!collapsed && (
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                            style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
                        >
                            C
                        </div>
                        <span className="text-lg font-bold gradient-text">CEAP</span>
                    </Link>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                    {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive
                                    ? "text-white"
                                    : "text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
                                }`}
                            style={
                                isActive
                                    ? {
                                        background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.1))",
                                        borderLeft: "3px solid var(--primary)",
                                    }
                                    : {}
                            }
                        >
                            <Icon size={20} />
                            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* User Info */}
            <div className="p-4 border-t" style={{ borderColor: "var(--border-color)" }}>
                {!collapsed && user && (
                    <div className="flex items-center gap-3 mb-3">
                        <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ background: "var(--primary)" }}
                        >
                            {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.full_name}</p>
                            <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                                {user.role}
                            </p>
                        </div>
                    </div>
                )}
                <button
                    onClick={logout}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg w-full text-sm transition-colors ${collapsed ? "justify-center" : ""
                        }`}
                    style={{ color: "var(--danger)" }}
                >
                    <LogOut size={18} />
                    {!collapsed && <span>Logout</span>}
                </button>
            </div>
        </aside>
    );
}
