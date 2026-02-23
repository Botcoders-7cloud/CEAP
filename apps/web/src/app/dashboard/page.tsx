"use client";
/**
 * CEAP — Dashboard Home
 * Real-time stats from API, quick actions, and activity feed.
 */
import { useAuthStore } from "@/store/auth";
import { useQuery } from "@tanstack/react-query";
import { analyticsAPI } from "@/lib/api";
import {
    Calendar, Code2, Trophy, Award, ArrowUpRight, Activity,
    Clock, TrendingUp, BookOpen, Loader2,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
    const user = useAuthStore((s) => s.user);
    const isFaculty = user?.role === "admin" || user?.role === "faculty" || user?.role === "super_admin";

    // Student stats
    const { data: myStats, isLoading: loadingMyStats } = useQuery({
        queryKey: ["my-stats"],
        queryFn: async () => {
            const { data } = await analyticsAPI.myStats();
            return data;
        },
    });

    // Faculty analytics
    const { data: adminStats, isLoading: loadingAdmin } = useQuery({
        queryKey: ["admin-analytics"],
        queryFn: async () => {
            const { data } = await analyticsAPI.dashboard();
            return data;
        },
        enabled: isFaculty,
    });

    const isLoading = loadingMyStats || (isFaculty && loadingAdmin);

    // Build stat cards based on role
    const stats = isFaculty
        ? [
            { label: "Total Events", value: adminStats?.stats?.total_events ?? "—", icon: Calendar, accent: "#7c3aed", change: `${adminStats?.events_by_status?.published ?? 0} published` },
            { label: "Total Users", value: adminStats?.stats?.total_users ?? "—", icon: Trophy, accent: "#06b6d4", change: `${adminStats?.users_by_role?.student ?? 0} students` },
            { label: "Submissions", value: adminStats?.stats?.total_submissions ?? "—", icon: Code2, accent: "#f59e0b", change: `${adminStats?.stats?.total_registrations ?? 0} registrations` },
            { label: "Certificates", value: adminStats?.stats?.total_certificates ?? "—", icon: Award, accent: "#10b981", change: "issued" },
        ]
        : [
            { label: "Events Joined", value: myStats?.events_registered ?? "—", icon: Calendar, accent: "#7c3aed", change: "registered" },
            { label: "Submissions", value: myStats?.submissions_count ?? "—", icon: Code2, accent: "#06b6d4", change: `${myStats?.mcq_exams_taken ?? 0} MCQ exams` },
            { label: "Best Rank", value: myStats?.best_rank ? `#${myStats.best_rank}` : "—", icon: Trophy, accent: "#f59e0b", change: myStats?.best_rank ? "across all events" : "no ranking yet" },
            { label: "Certificates", value: myStats?.certificates_count ?? "—", icon: Award, accent: "#10b981", change: "earned" },
        ];

    const QUICK_ACTIONS = [
        { label: "Browse Events", href: "/dashboard/events", icon: Calendar, desc: "Find hackathons & contests", accent: "#7c3aed" },
        { label: "Practice Coding", href: "/dashboard/arena", icon: Code2, desc: "Solve problems", accent: "#06b6d4" },
        { label: "View Rankings", href: "/dashboard/leaderboard", icon: Trophy, desc: "See leaderboards", accent: "#f59e0b" },
        { label: "Certificates", href: "/dashboard/certificates", icon: Award, desc: "Download certs", accent: "#10b981" },
    ];

    const activity = myStats?.recent_activity || [];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* ── Welcome Header ── */}
            <div className="flex items-end justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                        {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                    </p>
                    <h1 className="text-3xl font-extrabold tracking-tight">
                        Welcome back, <span className="gradient-text">{user?.full_name?.split(" ")[0]}</span>
                    </h1>
                </div>
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                    style={{ background: "rgba(16,185,129,0.08)", color: "var(--success)", border: "1px solid rgba(16,185,129,0.12)" }}>
                    <Activity size={12} />
                    All systems operational
                </div>
            </div>

            {/* ── Stats Grid ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="card card-glow p-5 group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                                    style={{ background: `${stat.accent}10` }}>
                                    <Icon size={18} style={{ color: stat.accent }} />
                                </div>
                                <ArrowUpRight size={14} style={{ color: "var(--text-muted)" }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-2xl font-extrabold tracking-tight mb-1">
                                {isLoading ? <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} /> : stat.value}
                            </p>
                            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
                            <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{stat.change}</p>
                        </div>
                    );
                })}
            </div>

            {/* ── Quick Actions ── */}
            <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
                    Quick Actions
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {QUICK_ACTIONS.map((action) => {
                        const ActionIcon = action.icon;
                        return (
                            <Link key={action.label} href={action.href}
                                className="card p-4 group flex items-center gap-3.5 transition-all duration-200 hover:translate-y-[-1px]">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
                                    style={{ background: `${action.accent}12` }}>
                                    <ActionIcon size={16} style={{ color: action.accent }} />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">{action.label}</p>
                                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{action.desc}</p>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* ── Recent Activity ── */}
            <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
                    Recent Activity
                </h2>
                <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
                    {activity.length === 0 && !isLoading && (
                        <div className="p-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                            No recent activity yet. Start by joining an event!
                        </div>
                    )}
                    {isLoading && (
                        <div className="p-8 flex justify-center">
                            <Loader2 size={20} className="animate-spin" style={{ color: "var(--primary)" }} />
                        </div>
                    )}
                    {activity.map((item: { text: string; time: string; type: string }, i: number) => (
                        <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                style={{
                                    background: item.type === "certificate"
                                        ? "rgba(16,185,129,0.1)"
                                        : "rgba(124,58,237,0.08)",
                                }}>
                                {item.type === "certificate"
                                    ? <Award size={13} style={{ color: "var(--success)" }} />
                                    : <Calendar size={13} style={{ color: "#7c3aed" }} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{item.text}</p>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>
                                <Clock size={10} />
                                {item.time ? new Date(item.time).toLocaleDateString() : "recently"}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
