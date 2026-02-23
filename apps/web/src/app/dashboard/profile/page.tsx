"use client";
/**
 * CEAP — Student Profile Page
 * Shows personal stats, submission history, certificates, badges, and MCQ results.
 */
import { useAuthStore } from "@/store/auth";
import { useQuery } from "@tanstack/react-query";
import { analyticsAPI, submissionAPI, certificateAPI } from "@/lib/api";
import {
    User, Trophy, Code2, Award, Calendar, Clock,
    TrendingUp, Target, Zap, Star, Loader2, BookOpen,
} from "lucide-react";
import Link from "next/link";

// Badge definitions
const BADGES = [
    { id: "first_submit", label: "First Solve", icon: Zap, desc: "Submitted your first solution", color: "#f59e0b", check: (s: any) => s.submissions_count >= 1 },
    { id: "five_events", label: "Event Explorer", icon: Calendar, desc: "Joined 5+ events", color: "#7c3aed", check: (s: any) => s.events_registered >= 5 },
    { id: "ten_subs", label: "Code Warrior", icon: Code2, desc: "10+ submissions", color: "#06b6d4", check: (s: any) => s.submissions_count >= 10 },
    { id: "top5", label: "Top 5", icon: Trophy, desc: "Ranked in top 5", color: "#10b981", check: (s: any) => s.best_rank && s.best_rank <= 5 },
    { id: "cert_earned", label: "Certified", icon: Award, desc: "Earned a certificate", color: "#ec4899", check: (s: any) => s.certificates_count >= 1 },
    { id: "mcq_ace", label: "MCQ Ace", icon: Target, desc: "Scored 80%+ on an MCQ exam", color: "#f97316", check: (s: any) => s.avg_mcq_score >= 80 },
    { id: "fifty_subs", label: "Legend", icon: Star, desc: "50+ submissions", color: "#eab308", check: (s: any) => s.submissions_count >= 50 },
];

export default function ProfilePage() {
    const user = useAuthStore((s) => s.user);

    const { data: stats, isLoading } = useQuery({
        queryKey: ["my-stats"],
        queryFn: async () => {
            const { data } = await analyticsAPI.myStats();
            return data;
        },
    });

    const { data: certificates } = useQuery({
        queryKey: ["my-certificates"],
        queryFn: async () => {
            const { data } = await certificateAPI.my();
            return data;
        },
    });

    const earnedBadges = stats ? BADGES.filter((b) => b.check(stats)) : [];
    const lockedBadges = stats ? BADGES.filter((b) => !b.check(stats)) : BADGES;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 size={24} className="animate-spin" style={{ color: "var(--primary)" }} />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            {/* ── Profile Header ── */}
            <div className="card p-6">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold"
                        style={{ background: "rgba(200,149,108,0.1)", color: "var(--primary)" }}>
                        {user?.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold">{user?.full_name}</h1>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{user?.email}</p>
                        <div className="flex gap-3 mt-2 text-xs">
                            {user?.role && (
                                <span className="px-2 py-0.5 rounded-md font-semibold"
                                    style={{ background: "rgba(200,149,108,0.1)", color: "var(--primary)" }}>
                                    {user.role}
                                </span>
                            )}
                            {user?.department && (
                                <span className="px-2 py-0.5 rounded-md"
                                    style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                                    {user.department}
                                </span>
                            )}
                            {user?.roll_number && (
                                <span className="px-2 py-0.5 rounded-md"
                                    style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                                    {user.roll_number}
                                </span>
                            )}
                        </div>
                    </div>
                    <Link href="/dashboard/settings"
                        className="text-xs px-3 py-1.5 rounded-lg"
                        style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                        Edit Profile
                    </Link>
                </div>
            </div>

            {/* ── Stats Grid ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Events", value: stats?.events_registered ?? 0, icon: Calendar, color: "#7c3aed" },
                    { label: "Submissions", value: stats?.submissions_count ?? 0, icon: Code2, color: "#06b6d4" },
                    { label: "Best Rank", value: stats?.best_rank ? `#${stats.best_rank}` : "—", icon: Trophy, color: "#f59e0b" },
                    { label: "Certificates", value: stats?.certificates_count ?? 0, icon: Award, color: "#10b981" },
                ].map((s) => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className="card p-4 text-center">
                            <Icon size={16} className="mx-auto mb-2" style={{ color: s.color }} />
                            <p className="text-lg font-bold">{s.value}</p>
                            <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* ── MCQ Performance ── */}
            {stats?.mcq_exams_taken > 0 && (
                <div className="card p-5 space-y-3">
                    <h2 className="text-sm font-bold flex items-center gap-2">
                        <BookOpen size={14} style={{ color: "var(--primary)" }} />
                        MCQ Performance
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg text-center" style={{ background: "var(--surface-2)" }}>
                            <p className="text-lg font-bold">{stats.mcq_exams_taken}</p>
                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Exams Taken</p>
                        </div>
                        <div className="p-3 rounded-lg text-center" style={{ background: "var(--surface-2)" }}>
                            <p className="text-lg font-bold" style={{
                                color: stats.avg_mcq_score >= 70 ? "var(--success)" : stats.avg_mcq_score >= 40 ? "var(--warning)" : "var(--danger)"
                            }}>
                                {stats.avg_mcq_score}%
                            </p>
                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Avg Score</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Badges ── */}
            <div className="card p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold flex items-center gap-2">
                        <Star size={14} style={{ color: "#eab308" }} />
                        Badges
                    </h2>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {earnedBadges.length}/{BADGES.length} earned
                    </span>
                </div>

                {/* Earned */}
                {earnedBadges.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {earnedBadges.map((b) => {
                            const Icon = b.icon;
                            return (
                                <div key={b.id} className="p-3 rounded-xl flex items-center gap-3"
                                    style={{ background: `${b.color}08`, border: `1px solid ${b.color}25` }}>
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                        style={{ background: `${b.color}15` }}>
                                        <Icon size={14} style={{ color: b.color }} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold">{b.label}</p>
                                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{b.desc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Locked */}
                {lockedBadges.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {lockedBadges.map((b) => {
                            const Icon = b.icon;
                            return (
                                <div key={b.id} className="p-3 rounded-xl flex items-center gap-3 opacity-40"
                                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                        style={{ background: "var(--surface-3)" }}>
                                        <Icon size={14} style={{ color: "var(--text-muted)" }} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold">{b.label}</p>
                                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{b.desc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Certificates ── */}
            {certificates && certificates.length > 0 && (
                <div className="card p-5 space-y-3">
                    <h2 className="text-sm font-bold flex items-center gap-2">
                        <Award size={14} style={{ color: "var(--success)" }} />
                        Certificates ({certificates.length})
                    </h2>
                    <div className="space-y-2">
                        {certificates.map((cert: any) => (
                            <div key={cert.id} className="flex items-center justify-between p-3 rounded-lg"
                                style={{ background: "var(--surface-2)" }}>
                                <div className="flex items-center gap-3">
                                    <Award size={14} style={{ color: cert.certificate_type === "winner" ? "#eab308" : "var(--success)" }} />
                                    <div>
                                        <p className="text-xs font-medium">{cert.event_title || "Event Certificate"}</p>
                                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                            {cert.certificate_type} {cert.rank ? `• Rank #${cert.rank}` : ""}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                    {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : ""}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Recent Activity ── */}
            {stats?.recent_activity?.length > 0 && (
                <div className="card p-5 space-y-3">
                    <h2 className="text-sm font-bold flex items-center gap-2">
                        <TrendingUp size={14} style={{ color: "var(--primary)" }} />
                        Recent Activity
                    </h2>
                    <div className="space-y-2">
                        {stats.recent_activity.map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg"
                                style={{ background: "var(--surface-2)" }}>
                                <div className="w-6 h-6 rounded-md flex items-center justify-center"
                                    style={{ background: item.type === "certificate" ? "rgba(16,185,129,0.1)" : "rgba(124,58,237,0.08)" }}>
                                    {item.type === "certificate"
                                        ? <Award size={11} style={{ color: "var(--success)" }} />
                                        : <Calendar size={11} style={{ color: "#7c3aed" }} />}
                                </div>
                                <p className="text-xs flex-1 truncate">{item.text}</p>
                                <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>
                                    <Clock size={9} className="inline mr-1" />
                                    {item.time ? new Date(item.time).toLocaleDateString() : ""}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
