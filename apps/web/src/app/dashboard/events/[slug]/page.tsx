"use client";
/**
 * CEAP — Event Detail Page (Enhanced)
 * Tabs: Overview, Problems, Registrations (admin), My Submissions (student)
 */
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eventAPI, submissionAPI, problemAPI, certificateAPI, analyticsAPI, mcqAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";
import {
    ArrowLeft,
    Calendar,
    Clock,
    Users,
    Code2,
    Trophy,
    CheckCircle,
    AlertTriangle,
    Globe,
    Loader2,
    UserPlus,
    Plus,
    Trash2,
    Play,
    X,
    Award,
    Upload,
    Target,
    FileText,
    Download,
} from "lucide-react";

export default function EventDetailPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const user = useAuthStore((s) => s.user);
    const queryClient = useQueryClient();
    const isAdmin = user?.role === "admin" || user?.role === "super_admin" || user?.role === "faculty";

    const [activeTab, setActiveTab] = useState("overview");
    const [showLinkProblem, setShowLinkProblem] = useState(false);
    const [showAddMCQ, setShowAddMCQ] = useState(false);
    const [mcqForm, setMcqForm] = useState({ question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "a", explanation: "", marks: 1, difficulty: "medium", topic: "" });
    const mcqFileRef = { current: null as HTMLInputElement | null };

    const { data: event, isLoading, error } = useQuery({
        queryKey: ["event", slug],
        queryFn: () => eventAPI.get(slug),
        select: (res) => res.data,
    });

    const isMCQ = event?.event_type === "mcq_exam";

    // Event problems (for coding events)
    const { data: eventProblems } = useQuery({
        queryKey: ["event-problems", event?.id],
        queryFn: () => eventAPI.problems(event!.id),
        select: (res) => res.data,
        enabled: !!event?.id && !isMCQ,
    });

    // MCQ questions (for MCQ events)
    const { data: mcqQuestions } = useQuery({
        queryKey: ["mcq-questions", event?.id],
        queryFn: () => mcqAPI.listQuestions(event!.id),
        select: (res) => res.data,
        enabled: !!event?.id && isMCQ,
    });

    const addMCQMutation = useMutation({
        mutationFn: (data: any) => mcqAPI.createQuestion(event!.id, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["mcq-questions", event!.id] }); setShowAddMCQ(false); setMcqForm({ question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "a", explanation: "", marks: 1, difficulty: "medium", topic: "" }); },
    });

    const deleteMCQMutation = useMutation({
        mutationFn: (qId: string) => mcqAPI.deleteQuestion(qId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mcq-questions", event!.id] }),
    });

    const importMCQMutation = useMutation({
        mutationFn: (file: File) => mcqAPI.importQuestions(event!.id, file),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mcq-questions", event!.id] }),
    });

    // All problems (for linking)
    const { data: allProblems } = useQuery({
        queryKey: ["all-problems"],
        queryFn: () => problemAPI.list(),
        select: (res) => res.data,
        enabled: showLinkProblem,
    });

    // Registrations (admin)
    const { data: registrations } = useQuery({
        queryKey: ["registrations", event?.id],
        queryFn: () => eventAPI.registrations(event!.id),
        select: (res) => res.data,
        enabled: !!event?.id && isAdmin,
    });

    // My submissions (student)
    const { data: mySubmissions } = useQuery({
        queryKey: ["my-submissions", event?.id],
        queryFn: () => submissionAPI.mySubmissions(event!.id),
        select: (res) => res.data,
        enabled: !!event?.id && user?.role === "student",
    });

    const registerMutation = useMutation({
        mutationFn: (eventId: string) => eventAPI.register(eventId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["event", slug] }),
    });

    const publishMutation = useMutation({
        mutationFn: (eventId: string) => eventAPI.publish(eventId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["event", slug] }),
    });

    const linkProblemMutation = useMutation({
        mutationFn: (problemId: string) => eventAPI.linkProblem(event!.id, problemId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["event-problems", event!.id] });
            setShowLinkProblem(false);
        },
    });

    const unlinkProblemMutation = useMutation({
        mutationFn: (problemId: string) => eventAPI.unlinkProblem(event!.id, problemId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["event-problems", event!.id] }),
    });

    const generateCertsMutation = useMutation({
        mutationFn: () => certificateAPI.generateForEvent(event!.id),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ["my-certificates"] });
        },
    });

    if (isLoading) {
        return (
            <div className="animate-fade-in flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin" style={{ color: "var(--primary)" }} />
            </div>
        );
    }

    if (error || !event) {
        return (
            <div className="animate-fade-in text-center py-20">
                <AlertTriangle size={48} className="mx-auto mb-4" style={{ color: "var(--warning)" }} />
                <h2 className="text-xl font-bold mb-2">Event Not Found</h2>
                <button onClick={() => router.push("/dashboard/events")} className="btn-primary text-sm mt-4">
                    ← Back to Events
                </button>
            </div>
        );
    }

    const statusColors: Record<string, { color: string; bg: string }> = {
        draft: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
        published: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
        ongoing: { color: "#10b981", bg: "rgba(16,185,129,0.12)" },
        completed: { color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
        archived: { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
    };
    const statusInfo = statusColors[event.status] || statusColors.draft;

    const fmt = (d: string | null) =>
        d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

    const diffBadge = (d: string) => {
        const m: Record<string, string> = { easy: "#10b981", medium: "#f59e0b", hard: "#ef4444" };
        return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                style={{ color: m[d] || m.medium, background: `${m[d] || m.medium}20` }}>{d}</span>
        );
    };

    const tabs = [
        { id: "overview", label: "Overview" },
        ...(isMCQ
            ? [{ id: "mcq_questions", label: `MCQ Questions (${mcqQuestions?.length || 0})` }]
            : [{ id: "problems", label: `Problems (${eventProblems?.length || 0})` }]),
        ...(isAdmin ? [{ id: "registrations", label: `Registrations (${registrations?.length || 0})` }] : []),
        ...(user?.role === "student" && !isMCQ ? [{ id: "submissions", label: `My Submissions (${mySubmissions?.length || 0})` }] : []),
    ];

    return (
        <div className="animate-fade-in space-y-5">
            {/* Back */}
            <button onClick={() => router.push("/dashboard/events")}
                className="flex items-center gap-2 text-sm hover:text-white transition-colors" style={{ color: "var(--text-muted)" }}>
                <ArrowLeft size={16} /> Back to Events
            </button>

            {/* Header */}
            <div className="glass-card p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase" style={{ color: statusInfo.color, background: statusInfo.bg }}>
                                {event.status}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-xs font-semibold" style={{ background: "rgba(99,102,241,0.1)", color: "var(--primary-light)" }}>
                                {event.event_type?.replace("_", " ")}
                            </span>
                            {event.is_team_event && (
                                <span className="px-2 py-0.5 rounded-md text-xs flex items-center gap-1" style={{ background: "rgba(6,182,212,0.1)", color: "#06b6d4" }}>
                                    <Users size={10} /> Teams
                                </span>
                            )}
                        </div>
                        <h1 className="text-2xl font-bold">{event.title}</h1>
                        {event.description && <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{event.description}</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                        {isAdmin && event.status === "draft" && (
                            <button onClick={() => publishMutation.mutate(event.id)} disabled={publishMutation.isPending}
                                className="btn-primary flex items-center gap-2 text-sm">
                                {publishMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
                                Publish
                            </button>
                        )}
                        {user?.role === "student" && ["published", "ongoing"].includes(event.status) && (
                            <button onClick={() => registerMutation.mutate(event.id)} disabled={registerMutation.isPending}
                                className="btn-primary flex items-center gap-2 text-sm">
                                {registerMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                                Register
                            </button>
                        )}
                        {event.status === "ongoing" && event.event_type === "mcq_exam" && (
                            <Link href={`/dashboard/exam/${event.id}`} className="btn-primary flex items-center gap-2 text-sm">
                                <Play size={14} /> Take Exam
                            </Link>
                        )}
                        {event.status === "ongoing" && event.event_type !== "mcq_exam" && (
                            <Link href="/dashboard/arena" className="btn-secondary flex items-center gap-2 text-sm">
                                <Code2 size={14} /> Arena
                            </Link>
                        )}
                        {isAdmin && ["ongoing", "completed"].includes(event.status) && (
                            <div className="flex gap-2">
                                <button onClick={() => generateCertsMutation.mutate()} disabled={generateCertsMutation.isPending}
                                    className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-semibold transition-all"
                                    style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
                                    {generateCertsMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
                                    🎓 Certificates
                                </button>
                                <button onClick={async () => {
                                    const r = await analyticsAPI.exportLeaderboard(event.id);
                                    const url = URL.createObjectURL(r.data);
                                    const a = document.createElement("a"); a.href = url; a.download = `leaderboard_${event.slug}.csv`; a.click();
                                }}
                                    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold transition-all"
                                    style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6" }}>
                                    <Download size={12} /> Leaderboard
                                </button>
                                <button onClick={async () => {
                                    const r = await analyticsAPI.exportParticipants(event.id);
                                    const url = URL.createObjectURL(r.data);
                                    const a = document.createElement("a"); a.href = url; a.download = `participants_${event.slug}.csv`; a.click();
                                }}
                                    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold transition-all"
                                    style={{ background: "rgba(124,58,237,0.12)", color: "#7c3aed" }}>
                                    <Download size={12} /> Participants
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Feedback messages */}
                {publishMutation.isSuccess && (
                    <div className="mt-3 p-3 rounded-lg flex items-center gap-2 text-xs" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
                        <CheckCircle size={12} /> Published!
                    </div>
                )}
                {registerMutation.isSuccess && (
                    <div className="mt-3 p-3 rounded-lg flex items-center gap-2 text-xs" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
                        <CheckCircle size={12} /> Registered!
                    </div>
                )}
                {(registerMutation.isError || publishMutation.isError) && (
                    <div className="mt-3 p-3 rounded-lg flex items-center gap-2 text-xs" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                        <AlertTriangle size={12} />
                        {(registerMutation.error as any)?.response?.data?.detail || (publishMutation.error as any)?.response?.data?.detail || "Action failed"}
                    </div>
                )}
                {generateCertsMutation.isSuccess && (
                    <div className="mt-3 p-3 rounded-lg flex items-center gap-2 text-xs" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
                        <CheckCircle size={12} />
                        🎓 Certificates generated! Created: {(generateCertsMutation.data as any)?.data?.created}, Already existed: {(generateCertsMutation.data as any)?.data?.already_existed}
                    </div>
                )}
                {generateCertsMutation.isError && (
                    <div className="mt-3 p-3 rounded-lg flex items-center gap-2 text-xs" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                        <AlertTriangle size={12} />
                        {(generateCertsMutation.error as any)?.response?.data?.detail || "Failed to generate certificates"}
                    </div>
                )}
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Event Start", value: fmt(event.event_start), icon: Calendar, color: "var(--primary)" },
                    { label: "Event End", value: fmt(event.event_end), icon: Clock, color: "var(--accent)" },
                    { label: "Max Participants", value: event.max_participants || "∞", icon: Users, color: "#10b981" },
                    { label: isMCQ ? "Questions" : "Problems", value: isMCQ ? (mcqQuestions?.length || 0) : (eventProblems?.length || 0), icon: isMCQ ? Target : Code2, color: "#f59e0b" },
                ].map((c) => (
                    <div key={c.label} className="glass-card p-4">
                        <div className="flex items-center gap-1.5 mb-1">
                            <c.icon size={12} style={{ color: c.color }} />
                            <span className="text-[10px] uppercase" style={{ color: "var(--text-muted)" }}>{c.label}</span>
                        </div>
                        <p className="text-sm font-semibold">{c.value}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b" style={{ borderColor: "var(--border-color)" }}>
                {tabs.map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className="px-4 py-2.5 text-sm font-medium transition-colors relative"
                        style={{ color: activeTab === tab.id ? "var(--primary-light)" : "var(--text-muted)" }}>
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "var(--primary)" }} />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && (
                <div className="glass-card p-5 space-y-4">
                    <h3 className="text-sm font-semibold">Event Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><span style={{ color: "var(--text-muted)" }}>Registration Opens:</span> <span className="ml-2 font-medium">{fmt(event.registration_start)}</span></div>
                        <div><span style={{ color: "var(--text-muted)" }}>Registration Closes:</span> <span className="ml-2 font-medium">{fmt(event.registration_end)}</span></div>
                        <div><span style={{ color: "var(--text-muted)" }}>Scoring:</span> <span className="ml-2 font-medium">{event.scoring_formula ? `Auto ${(event.scoring_formula.auto * 100)}% / Judge ${(event.scoring_formula.judge * 100)}%` : "Standard"}</span></div>
                        <div><span style={{ color: "var(--text-muted)" }}>Created:</span> <span className="ml-2 font-medium">{fmt(event.created_at)}</span></div>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Link href="/dashboard/leaderboard" className="btn-secondary flex items-center gap-2 text-xs">
                            <Trophy size={12} /> Leaderboard
                        </Link>
                    </div>
                </div>
            )}

            {activeTab === "problems" && (
                <div className="space-y-3">
                    {isAdmin && (
                        <div className="flex justify-end">
                            <button onClick={() => setShowLinkProblem(true)} className="btn-primary flex items-center gap-2 text-xs">
                                <Plus size={12} /> Link Problem
                            </button>
                        </div>
                    )}
                    {!eventProblems || eventProblems.length === 0 ? (
                        <div className="glass-card p-10 text-center">
                            <Code2 size={36} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
                            <p className="text-sm font-medium">No problems linked yet</p>
                            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                                {isAdmin ? "Link problems from the problem bank to this event" : "Problems will appear here when added by the organizer"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {eventProblems.map((p: any, i: number) => (
                                <div key={p.id} className="glass-card p-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                                        style={{ background: "rgba(99,102,241,0.12)", color: "var(--primary-light)" }}>
                                        {i + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <Link href={`/dashboard/problems/${p.id}`} className="text-sm font-semibold hover:text-[var(--primary-light)] transition-colors">
                                                {p.title}
                                            </Link>
                                            {diffBadge(p.difficulty)}
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                                            <span>{p.problem_type}</span>
                                            <span><Clock size={10} className="inline" /> {p.time_limit_ms}ms</span>
                                        </div>
                                    </div>
                                    {isAdmin && (
                                        <button onClick={() => unlinkProblemMutation.mutate(p.id)}
                                            className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" title="Remove">
                                            <Trash2 size={14} style={{ color: "#ef4444" }} />
                                        </button>
                                    )}
                                    <Link href="/dashboard/arena" className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1">
                                        <Play size={10} /> Solve
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* MCQ Questions Tab */}
            {activeTab === "mcq_questions" && isMCQ && (
                <div className="space-y-3">
                    {isAdmin && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowAddMCQ(true)}
                                className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5">
                                <Plus size={12} /> Add Question
                            </button>
                            <button onClick={() => mcqFileRef.current?.click()}
                                className="btn-secondary py-2 px-4 text-xs flex items-center gap-1.5">
                                <Upload size={12} /> Import CSV
                            </button>
                            <input ref={(el) => { mcqFileRef.current = el; }} type="file" accept=".csv" className="hidden"
                                onChange={(e) => { if (e.target.files?.[0]) importMCQMutation.mutate(e.target.files[0]); }} />
                            {importMCQMutation.isSuccess && <span className="text-xs" style={{ color: "var(--success)" }}>✅ Imported!</span>}
                            {importMCQMutation.isError && <span className="text-xs" style={{ color: "var(--danger)" }}>❌ Import failed</span>}
                        </div>
                    )}
                    {!mcqQuestions || mcqQuestions.length === 0 ? (
                        <div className="glass-card p-10 text-center">
                            <FileText size={36} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
                            <p className="text-sm font-medium">No MCQ questions yet</p>
                            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                                {isAdmin ? "Add questions manually or import from CSV" : "Questions will appear here when added"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {mcqQuestions.map((q: any, i: number) => (
                                <div key={q.id} className="glass-card p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex gap-3 flex-1">
                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                                                style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>{i + 1}</div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{q.question_text}</p>
                                                <div className="grid grid-cols-2 gap-1.5 mt-2">
                                                    {["a", "b", "c", "d"].map((opt) => {
                                                        const val = q[`option_${opt}`];
                                                        if (!val) return null;
                                                        const isCorrect = q.correct_option === opt;
                                                        return (
                                                            <div key={opt} className="text-xs px-2.5 py-1.5 rounded-md flex items-center gap-1.5" style={{
                                                                background: isCorrect ? "rgba(16,185,129,0.12)" : "var(--surface-2)",
                                                                color: isCorrect ? "#10b981" : "var(--text-secondary)",
                                                                border: isCorrect ? "1px solid rgba(16,185,129,0.3)" : "1px solid transparent",
                                                            }}>
                                                                <span className="font-bold uppercase">{opt}.</span> {val}
                                                                {isCorrect && <CheckCircle size={10} />}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div className="flex items-center gap-3 mt-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
                                                    {q.marks && <span>⭐ {q.marks} marks</span>}
                                                    {q.difficulty && <span>{diffBadge(q.difficulty)}</span>}
                                                    {q.topic && <span>📂 {q.topic}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        {isAdmin && (
                                            <button onClick={() => deleteMCQMutation.mutate(q.id)}
                                                className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" title="Delete">
                                                <Trash2 size={14} style={{ color: "#ef4444" }} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Add MCQ Question Modal */}
            {showAddMCQ && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowAddMCQ(false)}>
                    <div className="glass-card w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold">Add MCQ Question</h2>
                            <button onClick={() => setShowAddMCQ(false)} className="p-1 rounded-lg hover:bg-white/10"><X size={18} /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Question *</label>
                                <textarea className="input-field min-h-[80px]" value={mcqForm.question_text}
                                    onChange={(e) => setMcqForm({ ...mcqForm, question_text: e.target.value })} placeholder="Enter your question..." />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Option A *</label>
                                    <input className="input-field" value={mcqForm.option_a} onChange={(e) => setMcqForm({ ...mcqForm, option_a: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Option B *</label>
                                    <input className="input-field" value={mcqForm.option_b} onChange={(e) => setMcqForm({ ...mcqForm, option_b: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Option C</label>
                                    <input className="input-field" value={mcqForm.option_c} onChange={(e) => setMcqForm({ ...mcqForm, option_c: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Option D</label>
                                    <input className="input-field" value={mcqForm.option_d} onChange={(e) => setMcqForm({ ...mcqForm, option_d: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Correct Answer *</label>
                                    <select className="input-field" value={mcqForm.correct_option} onChange={(e) => setMcqForm({ ...mcqForm, correct_option: e.target.value })}>
                                        <option value="a">A</option>
                                        <option value="b">B</option>
                                        <option value="c">C</option>
                                        <option value="d">D</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Marks</label>
                                    <input type="number" className="input-field" value={mcqForm.marks} onChange={(e) => setMcqForm({ ...mcqForm, marks: +e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Difficulty</label>
                                    <select className="input-field" value={mcqForm.difficulty} onChange={(e) => setMcqForm({ ...mcqForm, difficulty: e.target.value })}>
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Topic</label>
                                <input className="input-field" value={mcqForm.topic} onChange={(e) => setMcqForm({ ...mcqForm, topic: e.target.value })} placeholder="e.g. Data Structures" />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Explanation (shown after exam)</label>
                                <textarea className="input-field min-h-[60px]" value={mcqForm.explanation}
                                    onChange={(e) => setMcqForm({ ...mcqForm, explanation: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={() => setShowAddMCQ(false)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
                            <button onClick={() => addMCQMutation.mutate(mcqForm)}
                                disabled={!mcqForm.question_text || !mcqForm.option_a || !mcqForm.option_b || addMCQMutation.isPending}
                                className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50">
                                {addMCQMutation.isPending ? "Adding..." : "Add Question"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "registrations" && isAdmin && (
                <div className="glass-card overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b"
                        style={{ color: "var(--text-muted)", borderColor: "var(--border-color)" }}>
                        <div className="col-span-4">User ID</div>
                        <div className="col-span-3">Status</div>
                        <div className="col-span-3">Team</div>
                        <div className="col-span-2 text-right">Registered At</div>
                    </div>
                    {!registrations || registrations.length === 0 ? (
                        <div className="p-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>No registrations yet</div>
                    ) : (
                        <div className="divide-y" style={{ borderColor: "var(--border-color)" }}>
                            {registrations.map((r: any) => (
                                <div key={r.id} className="grid grid-cols-12 gap-4 px-5 py-3 items-center text-sm">
                                    <div className="col-span-4 font-mono text-xs truncate">{r.user_id}</div>
                                    <div className="col-span-3">
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                            style={{ color: r.status === "approved" ? "#10b981" : "#f59e0b", background: r.status === "approved" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)" }}>
                                            {r.status}
                                        </span>
                                    </div>
                                    <div className="col-span-3 text-xs" style={{ color: "var(--text-muted)" }}>{r.team_id || "—"}</div>
                                    <div className="col-span-2 text-right text-xs" style={{ color: "var(--text-muted)" }}>{fmt(r.registered_at)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === "submissions" && user?.role === "student" && (
                <div className="space-y-2">
                    {!mySubmissions || mySubmissions.length === 0 ? (
                        <div className="glass-card p-10 text-center">
                            <Code2 size={36} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
                            <p className="text-sm">No submissions yet</p>
                            <Link href="/dashboard/arena" className="btn-primary inline-flex items-center gap-2 text-xs mt-3">
                                <Play size={12} /> Go to Arena
                            </Link>
                        </div>
                    ) : (
                        mySubmissions.map((s: any) => (
                            <div key={s.id} className="glass-card p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="px-2 py-1 rounded-md text-xs font-bold"
                                        style={{
                                            color: s.status === "accepted" ? "#10b981" : s.status === "pending" ? "#6366f1" : "#ef4444",
                                            background: s.status === "accepted" ? "rgba(16,185,129,0.12)" : s.status === "pending" ? "rgba(99,102,241,0.12)" : "rgba(239,68,68,0.12)",
                                        }}>
                                        {s.status?.replace("_", " ").toUpperCase()}
                                    </span>
                                    <span className="text-sm">{s.language}</span>
                                    {s.score !== null && <span className="text-xs font-bold">{s.score}/100</span>}
                                </div>
                                <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                                    {s.execution_time && <span><Clock size={10} className="inline" /> {s.execution_time}ms</span>}
                                    <span>{fmt(s.submitted_at)}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Link Problem Modal */}
            {showLinkProblem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowLinkProblem(false)}>
                    <div className="glass-card w-full max-w-lg max-h-[70vh] overflow-y-auto p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold">Link Problem to Event</h2>
                            <button onClick={() => setShowLinkProblem(false)} className="p-1 rounded-lg hover:bg-white/10"><X size={18} /></button>
                        </div>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Select a problem from the bank to link to this event</p>

                        {!allProblems || allProblems.length === 0 ? (
                            <p className="text-sm py-4 text-center" style={{ color: "var(--text-muted)" }}>No problems in the bank. Create problems first.</p>
                        ) : (
                            <div className="space-y-2">
                                {allProblems.filter((p: any) => !eventProblems?.find((ep: any) => ep.id === p.id)).map((p: any) => (
                                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.03] transition-colors"
                                        style={{ background: "var(--bg-dark)" }}>
                                        <div>
                                            <p className="text-sm font-medium">{p.title}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {diffBadge(p.difficulty)}
                                                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{p.problem_type}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => linkProblemMutation.mutate(p.id)}
                                            disabled={linkProblemMutation.isPending}
                                            className="btn-primary py-1 px-3 text-xs">
                                            Link
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
