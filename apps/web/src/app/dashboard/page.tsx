"use client";
/**
 * CEAP — Dashboard Home Page
 */
import { useAuthStore } from "@/store/auth";
import { Calendar, Code2, Trophy, Award, Users, ArrowUpRight } from "lucide-react";
import Link from "next/link";

const STATS = [
    { label: "Active Events", value: "3", icon: Calendar, color: "var(--primary)", change: "+2 this week" },
    { label: "Submissions", value: "47", icon: Code2, color: "var(--accent)", change: "12 today" },
    { label: "Best Rank", value: "#5", icon: Trophy, color: "var(--warning)", change: "↑ 3 positions" },
    { label: "Certificates", value: "2", icon: Award, color: "var(--success)", change: "1 pending" },
];

const QUICK_ACTIONS = [
    { label: "Browse Events", href: "/dashboard/events", icon: Calendar, desc: "Find hackathons & contests" },
    { label: "Practice Coding", href: "/dashboard/arena", icon: Code2, desc: "Solve problems" },
    { label: "View Rankings", href: "/dashboard/leaderboard", icon: Trophy, desc: "See leaderboards" },
    { label: "My Certificates", href: "/dashboard/certificates", icon: Award, desc: "Download certs" },
];

export default function DashboardPage() {
    const user = useAuthStore((s) => s.user);

    return (
        <div className="animate-fade-in space-y-8">
            {/* Welcome */}
            <div>
                <h1 className="text-3xl font-bold">
                    Welcome back, <span className="gradient-text">{user?.full_name?.split(" ")[0]}</span>
                </h1>
                <p className="mt-1" style={{ color: "var(--text-secondary)" }}>
                    Here&apos;s what&apos;s happening in your campus today.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {STATS.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="glass-card p-5 transition-all duration-200">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}15` }}>
                                    <Icon size={20} style={{ color: stat.color }} />
                                </div>
                                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                                    {stat.change}
                                </span>
                            </div>
                            <p className="text-2xl font-bold">{stat.value}</p>
                            <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                                {stat.label}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {QUICK_ACTIONS.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Link
                                key={action.href}
                                href={action.href}
                                className="glass-card p-5 group transition-all duration-200 flex flex-col"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <Icon size={22} style={{ color: "var(--primary)" }} />
                                    <ArrowUpRight
                                        size={16}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
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

            {/* Recent Activity */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                <div className="glass-card divide-y" style={{ borderColor: "var(--border-color)" }}>
                    {[
                        { text: "Submitted solution for Two Sum", time: "2 min ago", status: "accepted" },
                        { text: "Registered for CodeBlitz 2026", time: "1 hour ago", status: "info" },
                        { text: "Earned certificate for DSA Contest", time: "2 days ago", status: "success" },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-4" style={{ borderColor: "var(--border-color)" }}>
                            <span className="text-sm">{item.text}</span>
                            <div className="flex items-center gap-3">
                                <span className={`badge badge-${item.status}`}>{item.status}</span>
                                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
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
