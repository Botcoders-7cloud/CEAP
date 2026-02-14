"use client";
/**
 * CEAP — Users Management Page (Admin)
 * View, search, filter, and manage platform users.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import api from "@/lib/api";
import {
    Users as UsersIcon,
    Search,
    Shield,
    GraduationCap,
    BookOpen,
    UserCog,
    Star,
    MoreVertical,
    Mail,
    Calendar,
    ChevronDown,
    Download,
    Filter,
} from "lucide-react";

export default function UsersPage() {
    const user = useAuthStore((s) => s.user);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [page, setPage] = useState(1);

    // Fetch users (using custom endpoint — falls back to empty for now)
    const { data, isLoading } = useQuery({
        queryKey: ["users", roleFilter, page],
        queryFn: async () => {
            try {
                const res = await api.get("/users", {
                    params: { role: roleFilter || undefined, page, page_size: 20 },
                });
                return res.data;
            } catch {
                // Endpoint might not exist yet — return demo data
                return { users: DEMO_USERS, total: DEMO_USERS.length };
            }
        },
    });

    const users = (data?.users || []).filter(
        (u: any) =>
            !search ||
            u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase())
    );

    const roleIcon = (role: string) => {
        const map: Record<string, any> = {
            admin: { icon: Shield, color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
            super_admin: { icon: Star, color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
            faculty: { icon: BookOpen, color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
            judge: { icon: UserCog, color: "#06b6d4", bg: "rgba(6,182,212,0.12)" },
            student: { icon: GraduationCap, color: "#10b981", bg: "rgba(16,185,129,0.12)" },
        };
        return map[role] || map.student;
    };

    const roleStats = {
        total: DEMO_USERS.length,
        admins: DEMO_USERS.filter((u) => u.role === "admin").length,
        faculty: DEMO_USERS.filter((u) => u.role === "faculty").length,
        students: DEMO_USERS.filter((u) => u.role === "student").length,
    };

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <UsersIcon size={24} style={{ color: "var(--primary)" }} />
                        Users
                    </h1>
                    <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                        Manage platform users and their roles
                    </p>
                </div>
                <button className="btn-secondary flex items-center gap-2 text-sm">
                    <Download size={14} />
                    Export CSV
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: "Total Users", value: roleStats.total, icon: UsersIcon, color: "var(--primary)", bg: "rgba(99,102,241,0.12)" },
                    { label: "Admins", value: roleStats.admins, icon: Shield, color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
                    { label: "Faculty", value: roleStats.faculty, icon: BookOpen, color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
                    { label: "Students", value: roleStats.students, icon: GraduationCap, color: "#10b981", bg: "rgba(16,185,129,0.12)" },
                ].map((stat) => (
                    <div key={stat.label} className="glass-card p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: stat.bg }}>
                            <stat.icon size={20} style={{ color: stat.color }} />
                        </div>
                        <div>
                            <p className="text-xl font-bold">{stat.value}</p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="glass-card p-4 flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                    <input className="input-field pl-9" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="flex gap-2">
                    {["", "admin", "faculty", "student"].map((r) => (
                        <button key={r} onClick={() => setRoleFilter(r)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            style={{
                                background: roleFilter === r ? "var(--primary)" : "var(--bg-card-hover)",
                                color: roleFilter === r ? "white" : "var(--text-secondary)",
                            }}>
                            {r || "All"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Users Table */}
            <div className="glass-card overflow-hidden">
                <div className="grid grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b"
                    style={{ color: "var(--text-muted)", borderColor: "var(--border-color)" }}>
                    <div className="col-span-4">User</div>
                    <div className="col-span-2">Role</div>
                    <div className="col-span-2">Department</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2 text-right">Joined</div>
                </div>

                <div className="divide-y" style={{ borderColor: "var(--border-color)" }}>
                    {users.map((u: any) => {
                        const role = roleIcon(u.role);
                        const RoleIcon = role.icon;
                        return (
                            <div key={u.id} className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center hover:bg-white/[0.02] transition-colors">
                                <div className="col-span-4 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                        style={{ background: role.bg, color: role.color }}>
                                        {u.full_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{u.full_name}</p>
                                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{u.email}</p>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 w-fit"
                                        style={{ background: role.bg, color: role.color }}>
                                        <RoleIcon size={10} />
                                        {u.role}
                                    </span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{u.department || "-"}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="flex items-center gap-1 text-xs">
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: u.is_active ? "#10b981" : "#ef4444" }} />
                                        {u.is_active ? "Active" : "Inactive"}
                                    </span>
                                </div>
                                <div className="col-span-2 text-right">
                                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                                        {new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// Demo users until the /users API endpoint is built
const DEMO_USERS = [
    { id: "1", full_name: "Admin User", email: "admin@demo.edu", role: "admin", department: "Computer Science", is_active: true, created_at: "2026-01-01T00:00:00Z" },
    { id: "2", full_name: "Dr. Sarah Johnson", email: "faculty@demo.edu", role: "faculty", department: "Computer Science", is_active: true, created_at: "2026-01-05T00:00:00Z" },
    { id: "3", full_name: "Alex Kumar", email: "student@demo.edu", role: "student", department: "Computer Science", is_active: true, created_at: "2026-01-10T00:00:00Z" },
    { id: "4", full_name: "Priya Sharma", email: "student2@demo.edu", role: "student", department: "Computer Science", is_active: true, created_at: "2026-01-10T00:00:00Z" },
];
