"use client";
/**
 * CEAP — Analytics Page (Admin/Faculty)
 * Real platform-wide statistics from the API.
 */
import { useEffect, useState } from "react";
import { analyticsAPI } from "@/lib/api";
import {
    BarChart3,
    TrendingUp,
    Users,
    Calendar,
    Code2,
    Award,
    Clock,
    ArrowUp,
    Loader2,
} from "lucide-react";

interface AnalyticsData {
    stats: {
        total_events: number;
        total_users: number;
        total_submissions: number;
        total_certificates: number;
        total_registrations: number;
    };
    events_by_type: Record<string, number>;
    events_by_status: Record<string, number>;
    users_by_role: Record<string, number>;
    submissions_by_verdict: Record<string, number>;
    recent_activity: { action: string; time: string; type: string }[];
}

const TYPE_COLORS: Record<string, string> = {
    coding_contest: "#6366f1",
    hackathon: "#06b6d4",
    mcq_exam: "#f59e0b",
    project: "#10b981",
};

const TYPE_LABELS: Record<string, string> = {
    coding_contest: "Coding Contests",
    hackathon: "Hackathons",
    mcq_exam: "MCQ Exams",
    project: "Projects",
};

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        analyticsAPI
            .dashboard()
            .then((res) => setData(res.data))
            .catch((err) => setError(err.response?.data?.detail || "Failed to load analytics"))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="animate-fade-in text-center py-20">
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{error}</p>
            </div>
        );
    }

    if (!data) return null;

    const stats = [
        { label: "Total Events", value: data.stats.total_events, icon: Calendar, color: "#6366f1", bg: "var(--pastel-purple)" },
        { label: "Active Users", value: data.stats.total_users, icon: Users, color: "#10b981", bg: "var(--pastel-green)" },
        { label: "Submissions", value: data.stats.total_submissions, icon: Code2, color: "#f59e0b", bg: "var(--pastel-amber)" },
        { label: "Certificates", value: data.stats.total_certificates, icon: Award, color: "#8b5cf6", bg: "var(--pastel-lavender)" },
    ];

    const totalEvents = data.stats.total_events || 1;
    const eventBreakdown = ["coding_contest", "hackathon", "mcq_exam", "project"].map((type) => ({
        label: TYPE_LABELS[type] || type,
        count: data.events_by_type[type] || 0,
        pct: Math.round(((data.events_by_type[type] || 0) / totalEvents) * 100),
        color: TYPE_COLORS[type] || "#6366f1",
    }));

    const submissionStats = [
        { label: "Total", value: data.stats.total_submissions, color: "var(--text-primary)" },
        { label: "Accepted", value: data.submissions_by_verdict["accepted"] || 0, color: "#10b981" },
        { label: "Wrong Answer", value: data.submissions_by_verdict["wrong_answer"] || 0, color: "#ef4444" },
        { label: "TLE", value: data.submissions_by_verdict["time_limit_exceeded"] || 0, color: "#f59e0b" },
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
                            <span className="text-xs font-medium flex items-center gap-0.5 px-2 py-0.5 rounded-full"
                                style={{ color: "#10b981", background: "var(--pastel-green)" }}>
                                <ArrowUp size={10} />
                                {stat.value}
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
                                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
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
                        <Code2 size={16} style={{ color: "#10b981" }} />
                        Submission Overview
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        {submissionStats.map((item) => (
                            <div key={item.label} className="text-center p-3 rounded-xl" style={{ background: "var(--surface-3)" }}>
                                <p className="text-xl font-bold" style={{ color: item.color }}>{item.value}</p>
                                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{item.label}</p>
                            </div>
                        ))}
                    </div>
                    {data.stats.total_submissions === 0 && (
                        <p className="text-xs text-center mt-4" style={{ color: "var(--text-muted)" }}>
                            Submission data will populate as students submit solutions
                        </p>
                    )}
                </div>
            </div>

            {/* Recent Activity */}
            <div className="glass-card p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Clock size={16} style={{ color: "var(--primary)" }} />
                    Recent Activity
                </h3>
                <div className="space-y-3">
                    {data.recent_activity.length === 0 ? (
                        <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
                            No recent activity yet
                        </p>
                    ) : (
                        data.recent_activity.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/[0.02] transition-colors">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--pastel-purple)" }}>
                                    <TrendingUp size={16} style={{ color: "#6C4DB5" }} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm">{item.action}</p>
                                </div>
                                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                                    {new Date(item.time).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
