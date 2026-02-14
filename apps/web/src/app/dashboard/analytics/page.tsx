"use client";
/**
 * CEAP — Analytics Page (Admin/Faculty)
 * Platform-wide statistics and charts.
 */
import { useAuthStore } from "@/store/auth";
import {
    BarChart3,
    TrendingUp,
    Users,
    Calendar,
    Code2,
    Trophy,
    Award,
    Clock,
    ArrowUp,
    ArrowDown,
} from "lucide-react";

export default function AnalyticsPage() {
    const user = useAuthStore((s) => s.user);

    const stats = [
        { label: "Total Events", value: "3", change: "+2", up: true, icon: Calendar, color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
        { label: "Active Users", value: "4", change: "+4", up: true, icon: Users, color: "#10b981", bg: "rgba(16,185,129,0.12)" },
        { label: "Submissions", value: "0", change: "0", up: true, icon: Code2, color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
        { label: "Certificates", value: "0", change: "0", up: true, icon: Award, color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
    ];

    const eventBreakdown = [
        { label: "Coding Contests", count: 2, pct: 67, color: "#6366f1" },
        { label: "Hackathons", count: 1, pct: 33, color: "#06b6d4" },
        { label: "MCQ Exams", count: 0, pct: 0, color: "#f59e0b" },
        { label: "Projects", count: 0, pct: 0, color: "#10b981" },
    ];

    const recentActivity = [
        { action: "Database seeded with demo data", time: "Just now", icon: TrendingUp, color: "#10b981" },
        { action: "CodeBlitz 2026 is ongoing", time: "10 min ago", icon: Calendar, color: "#6366f1" },
        { action: "2 students registered for CodeBlitz", time: "10 min ago", icon: Users, color: "#06b6d4" },
        { action: "3 problems linked to CodeBlitz 2026", time: "10 min ago", icon: Code2, color: "#f59e0b" },
    ];

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <BarChart3 size={24} style={{ color: "var(--primary)" }} />
                    Analytics
                </h1>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    Platform overview and performance metrics
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="glass-card p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: stat.bg }}>
                                <stat.icon size={20} style={{ color: stat.color }} />
                            </div>
                            <span className={`text-xs font-medium flex items-center gap-0.5 px-2 py-0.5 rounded-full`}
                                style={{
                                    color: stat.up ? "#10b981" : "#ef4444",
                                    background: stat.up ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                                }}>
                                {stat.up ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                                {stat.change}
                            </span>
                        </div>
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Event Breakdown */}
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                        <Calendar size={16} style={{ color: "var(--primary)" }} />
                        Event Type Breakdown
                    </h3>
                    <div className="space-y-3">
                        {eventBreakdown.map((item) => (
                            <div key={item.label}>
                                <div className="flex items-center justify-between text-sm mb-1">
                                    <span style={{ color: "var(--text-secondary)" }}>{item.label}</span>
                                    <span className="font-medium">{item.count}</span>
                                </div>
                                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-card-hover)" }}>
                                    <div className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${item.pct}%`, background: item.color, minWidth: item.pct > 0 ? 8 : 0 }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Submission Stats */}
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                        <Code2 size={16} style={{ color: "var(--success)" }} />
                        Submission Overview
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: "Total", value: "0", color: "var(--text-primary)" },
                            { label: "Accepted", value: "0", color: "#10b981" },
                            { label: "Wrong Answer", value: "0", color: "#ef4444" },
                            { label: "TLE", value: "0", color: "#f59e0b" },
                        ].map((item) => (
                            <div key={item.label} className="text-center p-3 rounded-xl" style={{ background: "var(--bg-card-hover)" }}>
                                <p className="text-xl font-bold" style={{ color: item.color }}>{item.value}</p>
                                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{item.label}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-center mt-4" style={{ color: "var(--text-muted)" }}>
                        Submission data will populate as students submit solutions
                    </p>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="glass-card p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Clock size={16} style={{ color: "var(--accent)" }} />
                    Recent Activity
                </h3>
                <div className="space-y-3">
                    {recentActivity.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${item.color}15` }}>
                                <item.icon size={16} style={{ color: item.color }} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm">{item.action}</p>
                            </div>
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{item.time}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
