"use client";
/**
 * CEAP — Dashboard Home
 * Premium stat cards, quick actions, and activity feed
 */
import { useAuthStore } from "@/store/auth";
import { Calendar, Code2, Trophy, Award, ArrowUpRight, Activity, Clock, TrendingUp } from "lucide-react";
import Link from "next/link";

const STATS = [
    { label: "Active Events", value: "3", icon: Calendar, accent: "#7c3aed", change: "+2 this week", up: true },
    { label: "Submissions", value: "47", icon: Code2, accent: "#06b6d4", change: "12 today", up: true },
    { label: "Best Rank", value: "#5", icon: Trophy, accent: "#f59e0b", change: "↑ 3 positions", up: true },
    { label: "Certificates", value: "2", icon: Award, accent: "#10b981", change: "1 pending", up: false },
];

const QUICK_ACTIONS = [
    { label: "Browse Events", href: "/dashboard/events", icon: Calendar, desc: "Find hackathons & contests", accent: "#7c3aed" },
    { label: "Practice Coding", href: "/dashboard/arena", icon: Code2, desc: "Solve problems", accent: "#06b6d4" },
    { label: "View Rankings", href: "/dashboard/leaderboard", icon: Trophy, desc: "See leaderboards", accent: "#f59e0b" },
    { label: "Certificates", href: "/dashboard/certificates", icon: Award, desc: "Download certs", accent: "#10b981" },
];

const ACTIVITY = [
    { text: "Submitted solution for Two Sum", time: "2 min ago", badge: "accepted", badgeClass: "badge-success" },
    { text: "Registered for CodeBlitz 2026", time: "1 hour ago", badge: "info", badgeClass: "badge-info" },
    { text: "Earned certificate for DSA Contest", time: "2 days ago", badge: "awarded", badgeClass: "badge-accent" },
];

export default function DashboardPage() {
    const user = useAuthStore((s) => s.user);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* ── Welcome Header ──────────────────────────────────── */}
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

            {/* ── Stats Grid ──────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
                {STATS.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="card card-glow p-5 group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                                    style={{ background: `${stat.accent}10` }}>
                                    <Icon size={19} style={{ color: stat.accent }} />
                                </div>
                                <div className="flex items-center gap-1 text-[11px] font-medium" style={{ color: stat.up ? "var(--success)" : "var(--text-muted)" }}>
                                    {stat.up && <TrendingUp size={11} />}
                                    {stat.change}
                                </div>
                            </div>
                            <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                            <p className="text-xs mt-1 font-medium" style={{ color: "var(--text-muted)" }}>
                                {stat.label}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* ── Quick Actions ────────────────────────────────────── */}
            <div>
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                    Quick Actions
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
                    {QUICK_ACTIONS.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Link
                                key={action.href}
                                href={action.href}
                                className="card p-5 group flex flex-col"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${action.accent}10` }}>
                                        <Icon size={17} style={{ color: action.accent }} />
                                    </div>
                                    <ArrowUpRight
                                        size={14}
                                        className="opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                                        style={{ color: "var(--text-muted)" }}
                                    />
                                </div>
                                <p className="font-semibold text-sm">{action.label}</p>
                                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                                    {action.desc}
                                </p>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* ── Recent Activity ──────────────────────────────────── */}
            <div>
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <Clock size={15} style={{ color: "var(--text-muted)" }} />
                    Recent Activity
                </h2>
                <div className="card overflow-hidden">
                    {ACTIVITY.map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between px-5 py-4 transition-colors"
                            style={{
                                borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.01)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                            <span className="text-sm">{item.text}</span>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className={`badge ${item.badgeClass}`}>{item.badge}</span>
                                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                                    {item.time}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
