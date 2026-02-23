"use client";
/**
 * CEAP — MCQ Exam Page
 * Timed exam with question navigation, anti-cheat, auto-submit.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { mcqAPI, eventAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import {
    Clock, AlertTriangle, ChevronLeft, ChevronRight,
    Send, Loader2, CheckCircle, XCircle, Minus,
    BookOpen, Flag, Eye, ArrowLeft, Maximize, Minimize,
} from "lucide-react";
import Link from "next/link";

type Question = {
    id: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string | null;
    option_d: string | null;
    marks: number;
    negative_marks: number;
    difficulty: string;
    topic: string | null;
    order: number;
};

type ExamResult = {
    score: number;
    max_score: number;
    percentage: number;
    correct: number;
    wrong: number;
    skipped: number;
    total: number;
    results: Record<string, { status: string; correct: string; your_answer?: string }>;
    questions?: Array<Question & { your_answer: string | null; correct_answer: string; is_correct: boolean; explanation: string | null }>;
};

export default function ExamPage() {
    const params = useParams();
    const router = useRouter();
    const eventId = params.eventId as string;
    const user = useAuthStore((s) => s.user);

    // ── State ──
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [marked, setMarked] = useState<Set<string>>(new Set());
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [examStarted, setExamStarted] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState<ExamResult | null>(null);
    const [tabSwitches, setTabSwitches] = useState(0);
    const [tabWarning, setTabWarning] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Fetch event ──
    const { data: event } = useQuery({
        queryKey: ["event", eventId],
        queryFn: async () => {
            const { data } = await eventAPI.get(eventId);
            return data;
        },
    });

    // ── Fetch questions ──
    const { data: questions = [], isLoading: loadingQ } = useQuery<Question[]>({
        queryKey: ["mcq-questions", eventId],
        queryFn: async () => {
            const { data } = await mcqAPI.listQuestions(eventId);
            return data;
        },
        enabled: examStarted,
    });

    // ── Check existing result ──
    const { data: existingResult } = useQuery({
        queryKey: ["mcq-result", eventId],
        queryFn: async () => {
            try {
                const { data } = await mcqAPI.getResult(eventId);
                return data;
            } catch {
                return null;
            }
        },
    });

    // ── Start exam mutation ──
    const startMutation = useMutation({
        mutationFn: () => mcqAPI.startExam(eventId),
        onSuccess: (res) => {
            setExamStarted(true);
            // Default 60 min if no time limit
            const minutes = res.data.time_limit_minutes || 60;
            setTimeLeft(minutes * 60);
        },
    });

    // ── Submit mutation ──
    const submitMutation = useMutation({
        mutationFn: (ans: Record<string, string>) => mcqAPI.submitExam(eventId, ans),
        onSuccess: (res) => {
            setSubmitted(true);
            setResult(res.data);
            setShowConfirm(false);
            if (timerRef.current) clearInterval(timerRef.current);
        },
    });

    // ── Timer ──
    useEffect(() => {
        if (timeLeft === null || submitted) return;
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev === null || prev <= 1) {
                    // Auto-submit on timeout
                    submitMutation.mutate(answers);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [timeLeft !== null, submitted]);

    // ── Anti-cheat: tab switch detection ──
    useEffect(() => {
        if (!examStarted || submitted) return;
        const handleVisibility = () => {
            if (document.hidden) {
                setTabSwitches((prev) => {
                    const next = prev + 1;
                    if (next >= 3) {
                        submitMutation.mutate(answers);
                    } else {
                        setTabWarning(true);
                        setTimeout(() => setTabWarning(false), 4000);
                    }
                    return next;
                });
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);
        return () => document.removeEventListener("visibilitychange", handleVisibility);
    }, [examStarted, submitted, answers]);

    // ── Anti-cheat: disable copy/paste ──
    useEffect(() => {
        if (!examStarted || submitted) return;
        const prevent = (e: Event) => e.preventDefault();
        document.addEventListener("copy", prevent);
        document.addEventListener("paste", prevent);
        document.addEventListener("contextmenu", prevent);
        return () => {
            document.removeEventListener("copy", prevent);
            document.removeEventListener("paste", prevent);
            document.removeEventListener("contextmenu", prevent);
        };
    }, [examStarted, submitted]);

    // ── Fullscreen toggle ──
    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.();
            setIsFullscreen(false);
        }
    }, []);

    // ── Helpers ──
    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    const selectAnswer = (qId: string, option: string) => {
        setAnswers((prev) => ({ ...prev, [qId]: option }));
    };

    const toggleMark = (qId: string) => {
        setMarked((prev) => {
            const next = new Set(prev);
            if (next.has(qId)) next.delete(qId);
            else next.add(qId);
            return next;
        });
    };

    const clearAnswer = (qId: string) => {
        setAnswers((prev) => {
            const next = { ...prev };
            delete next[qId];
            return next;
        });
    };

    const answeredCount = Object.keys(answers).length;
    const totalQ = questions.length;
    const q = questions[currentQ];

    // ── Already submitted? Show result ──
    if (existingResult && existingResult.status === "submitted") {
        return <ResultView result={existingResult} eventTitle={event?.title} />;
    }

    // ── Submitted just now ──
    if (submitted && result) {
        return <ResultView result={result} eventTitle={event?.title} />;
    }

    // ── Pre-exam screen ──
    if (!examStarted) {
        return (
            <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
                <Link href="/dashboard/events" className="inline-flex items-center gap-1 text-xs hover:underline" style={{ color: "var(--text-muted)" }}>
                    <ArrowLeft size={12} /> Back to Events
                </Link>

                <div className="card p-8 text-center space-y-6">
                    <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center" style={{ background: "rgba(200,149,108,0.1)" }}>
                        <BookOpen size={28} style={{ color: "var(--primary)" }} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold mb-2">{event?.title || "MCQ Exam"}</h1>
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                            {event?.description || "Read each question carefully before answering."}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="card p-4 text-center">
                            <BookOpen size={16} className="mx-auto mb-1" style={{ color: "var(--text-muted)" }} />
                            <p className="text-lg font-bold">{event?.mcq_question_count || "—"}</p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Questions</p>
                        </div>
                        <div className="card p-4 text-center">
                            <Clock size={16} className="mx-auto mb-1" style={{ color: "var(--text-muted)" }} />
                            <p className="text-lg font-bold">60 min</p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Time Limit</p>
                        </div>
                    </div>

                    <div className="text-left space-y-2 p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Rules</p>
                        <ul className="text-xs space-y-1.5" style={{ color: "var(--text-secondary)" }}>
                            <li>• Do not switch tabs — <strong>3 tab switches = auto-submit</strong></li>
                            <li>• Copy/paste is disabled during the exam</li>
                            <li>• Exam auto-submits when the timer runs out</li>
                            <li>• You can mark questions for review and come back</li>
                            <li>• Negative marking applies for wrong answers</li>
                        </ul>
                    </div>

                    <button
                        onClick={() => startMutation.mutate()}
                        disabled={startMutation.isPending}
                        className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
                    >
                        {startMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
                        Start Exam
                    </button>
                    {startMutation.isError && (
                        <p className="text-xs text-center" style={{ color: "var(--danger)" }}>
                            {(startMutation.error as any)?.response?.data?.detail || "Failed to start exam"}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // ── Loading questions ──
    if (loadingQ || !q) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 size={24} className="animate-spin" style={{ color: "var(--primary)" }} />
            </div>
        );
    }

    // ── Exam in progress ──
    return (
        <div className="animate-fade-in" style={{ userSelect: "none" }}>
            {/* ── Tab Warning ── */}
            {tabWarning && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl text-sm font-semibold animate-fade-in"
                    style={{ background: "var(--danger)", color: "#fff" }}>
                    <AlertTriangle size={14} className="inline mr-2" />
                    Warning: Tab switch detected ({tabSwitches}/3). Your exam will auto-submit at 3 switches.
                </div>
            )}

            {/* ── Confirm Modal ── */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
                    <div className="card p-6 w-full max-w-sm mx-4 space-y-4">
                        <h3 className="text-lg font-bold">Submit Exam?</h3>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="p-3 rounded-lg" style={{ background: "var(--surface-2)" }}>
                                <p className="text-lg font-bold" style={{ color: "var(--success)" }}>{answeredCount}</p>
                                <p style={{ color: "var(--text-muted)" }}>Answered</p>
                            </div>
                            <div className="p-3 rounded-lg" style={{ background: "var(--surface-2)" }}>
                                <p className="text-lg font-bold" style={{ color: "var(--warning)" }}>{marked.size}</p>
                                <p style={{ color: "var(--text-muted)" }}>Marked</p>
                            </div>
                            <div className="p-3 rounded-lg" style={{ background: "var(--surface-2)" }}>
                                <p className="text-lg font-bold" style={{ color: "var(--text-muted)" }}>{totalQ - answeredCount}</p>
                                <p style={{ color: "var(--text-muted)" }}>Skipped</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 rounded-lg text-sm font-medium"
                                style={{ background: "var(--surface-2)", color: "var(--text-primary)" }}>
                                Go Back
                            </button>
                            <button onClick={() => submitMutation.mutate(answers)} disabled={submitMutation.isPending}
                                className="btn-primary flex-1 py-2 text-sm font-semibold flex items-center justify-center gap-1">
                                {submitMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Header Bar ── */}
            <div className="flex items-center justify-between mb-5 gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                    <BookOpen size={18} style={{ color: "var(--primary)", flexShrink: 0 }} />
                    <h1 className="text-base font-bold truncate">{event?.title || "MCQ Exam"}</h1>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button onClick={toggleFullscreen} className="p-2 rounded-lg transition-colors"
                        style={{ background: "var(--surface-2)" }} title="Toggle fullscreen">
                        {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                    </button>
                    {timeLeft !== null && (
                        <div className={`px-3 py-1.5 rounded-lg text-sm font-mono font-bold flex items-center gap-1.5 ${timeLeft < 300 ? "animate-pulse" : ""}`}
                            style={{
                                background: timeLeft < 300 ? "rgba(201,112,112,0.15)" : "var(--surface-2)",
                                color: timeLeft < 300 ? "var(--danger)" : "var(--text-primary)",
                                border: `1px solid ${timeLeft < 300 ? "rgba(201,112,112,0.3)" : "var(--border)"}`,
                            }}>
                            <Clock size={13} />
                            {formatTime(timeLeft)}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-5">
                {/* ── Question Card ── */}
                <div className="card p-6 space-y-5">
                    {/* Question header */}
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                                Question {currentQ + 1} of {totalQ}
                                {q.topic && <span className="ml-2 px-2 py-0.5 rounded" style={{ background: "var(--surface-2)", fontSize: "10px" }}>{q.topic}</span>}
                            </p>
                            <div className="flex gap-2 text-xs">
                                <span className="px-2 py-0.5 rounded" style={{
                                    background: q.marks > 1 ? "rgba(200,149,108,0.1)" : "var(--surface-2)",
                                    color: q.marks > 1 ? "var(--primary)" : "var(--text-muted)",
                                }}>
                                    +{q.marks} marks
                                </span>
                                {q.negative_marks > 0 && (
                                    <span className="px-2 py-0.5 rounded" style={{ background: "rgba(201,112,112,0.1)", color: "var(--danger)" }}>
                                        -{q.negative_marks}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button onClick={() => toggleMark(q.id)} className="p-1.5 rounded-lg transition-colors" title="Mark for review"
                            style={{ background: marked.has(q.id) ? "rgba(212,149,106,0.15)" : "var(--surface-2)", color: marked.has(q.id) ? "var(--warning)" : "var(--text-muted)" }}>
                            <Flag size={14} />
                        </button>
                    </div>

                    {/* Question text */}
                    <p className="text-sm leading-relaxed font-medium" style={{ color: "var(--text-primary)" }}>
                        {q.question_text}
                    </p>

                    {/* Options */}
                    <div className="space-y-2.5">
                        {(["a", "b", "c", "d"] as const).map((opt) => {
                            const text = q[`option_${opt}`];
                            if (!text) return null;
                            const selected = answers[q.id] === opt;
                            return (
                                <button key={opt} onClick={() => selectAnswer(q.id, opt)}
                                    className="w-full text-left p-3.5 rounded-xl text-sm transition-all duration-200 flex items-center gap-3"
                                    style={{
                                        background: selected ? "rgba(200,149,108,0.1)" : "var(--surface-2)",
                                        border: selected ? "1px solid rgba(200,149,108,0.4)" : "1px solid var(--border)",
                                        color: "var(--text-primary)",
                                    }}>
                                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                                        style={{
                                            background: selected ? "var(--primary)" : "var(--surface-3)",
                                            color: selected ? "#fff" : "var(--text-muted)",
                                        }}>
                                        {opt.toUpperCase()}
                                    </span>
                                    {text}
                                </button>
                            );
                        })}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2">
                        <button onClick={() => clearAnswer(q.id)} disabled={!answers[q.id]}
                            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                            style={{ background: "var(--surface-2)", color: answers[q.id] ? "var(--text-secondary)" : "var(--text-muted)", opacity: answers[q.id] ? 1 : 0.4 }}>
                            Clear Answer
                        </button>
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}
                                className="p-2 rounded-lg transition-colors"
                                style={{ background: "var(--surface-2)", opacity: currentQ === 0 ? 0.4 : 1 }}>
                                <ChevronLeft size={16} />
                            </button>
                            {currentQ < totalQ - 1 ? (
                                <button onClick={() => setCurrentQ(currentQ + 1)}
                                    className="btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-1">
                                    Next <ChevronRight size={14} />
                                </button>
                            ) : (
                                <button onClick={() => setShowConfirm(true)}
                                    className="btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-1">
                                    <Send size={14} /> Finish
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Question Navigation Sidebar ── */}
                <div className="space-y-4">
                    {/* Progress */}
                    <div className="card p-4 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Progress</p>
                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
                            <div className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${(answeredCount / totalQ) * 100}%`, background: "var(--primary)" }} />
                        </div>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{answeredCount}/{totalQ} answered</p>
                    </div>

                    {/* Question Grid */}
                    <div className="card p-4 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Questions</p>
                        <div className="grid grid-cols-5 gap-1.5">
                            {questions.map((ques, i) => {
                                const isActive = i === currentQ;
                                const isAnswered = !!answers[ques.id];
                                const isMarked = marked.has(ques.id);
                                return (
                                    <button key={ques.id} onClick={() => setCurrentQ(i)}
                                        className="w-full aspect-square rounded-lg text-xs font-bold flex items-center justify-center transition-all relative"
                                        style={{
                                            background: isActive ? "var(--primary)" : isAnswered ? "rgba(107,158,120,0.2)" : "var(--surface-2)",
                                            color: isActive ? "#fff" : isAnswered ? "var(--success)" : "var(--text-muted)",
                                            border: isActive ? "none" : `1px solid ${isMarked ? "rgba(212,149,106,0.4)" : "var(--border)"}`,
                                        }}>
                                        {i + 1}
                                        {isMarked && (
                                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: "var(--warning)" }} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="card p-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                            <span className="w-3 h-3 rounded" style={{ background: "rgba(107,158,120,0.2)", border: "1px solid var(--border)" }} />
                            <span style={{ color: "var(--text-muted)" }}>Answered</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="w-3 h-3 rounded" style={{ background: "var(--surface-2)", border: "1px solid rgba(212,149,106,0.4)" }} />
                            <span style={{ color: "var(--text-muted)" }}>Marked for review</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="w-3 h-3 rounded" style={{ background: "var(--primary)" }} />
                            <span style={{ color: "var(--text-muted)" }}>Current</span>
                        </div>
                    </div>

                    {/* Submit button */}
                    <button onClick={() => setShowConfirm(true)}
                        className="btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5">
                        <Send size={14} /> Submit Exam
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Result View ─────────────────────────────────────────
function ResultView({ result, eventTitle }: { result: ExamResult; eventTitle?: string }) {
    const percentage = result.percentage || 0;
    const scoreColor = percentage >= 70 ? "var(--success)" : percentage >= 40 ? "var(--warning)" : "var(--danger)";

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <Link href="/dashboard/events" className="inline-flex items-center gap-1 text-xs hover:underline" style={{ color: "var(--text-muted)" }}>
                <ArrowLeft size={12} /> Back to Events
            </Link>

            {/* Score Card */}
            <div className="card p-8 text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center" style={{ background: `${scoreColor}15` }}>
                    {percentage >= 70 ? <CheckCircle size={36} style={{ color: scoreColor }} /> : <BookOpen size={36} style={{ color: scoreColor }} />}
                </div>
                <h1 className="text-2xl font-bold">{eventTitle || "Exam"} — Results</h1>
                <p className="text-5xl font-extrabold" style={{ color: scoreColor }}>
                    {percentage}%
                </p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Score: {result.score} / {result.max_score}
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="card p-4 text-center">
                    <CheckCircle size={18} className="mx-auto mb-2" style={{ color: "var(--success)" }} />
                    <p className="text-xl font-bold" style={{ color: "var(--success)" }}>{result.correct}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Correct</p>
                </div>
                <div className="card p-4 text-center">
                    <XCircle size={18} className="mx-auto mb-2" style={{ color: "var(--danger)" }} />
                    <p className="text-xl font-bold" style={{ color: "var(--danger)" }}>{result.wrong}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Wrong</p>
                </div>
                <div className="card p-4 text-center">
                    <Minus size={18} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
                    <p className="text-xl font-bold">{result.skipped}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Skipped</p>
                </div>
            </div>

            {/* Question-by-question breakdown */}
            {result.questions && result.questions.length > 0 && (
                <div className="card p-5 space-y-4">
                    <h2 className="text-sm font-bold">Question Review</h2>
                    <div className="space-y-3">
                        {result.questions.map((q, i) => (
                            <div key={q.id} className="p-3 rounded-xl text-xs" style={{
                                background: "var(--surface-2)",
                                borderLeft: `3px solid ${q.is_correct ? "var(--success)" : q.your_answer ? "var(--danger)" : "var(--text-muted)"}`,
                            }}>
                                <p className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                                    Q{i + 1}. {q.question_text}
                                </p>
                                <div className="flex gap-4 mt-1.5" style={{ color: "var(--text-muted)" }}>
                                    {q.your_answer && (
                                        <span>Your answer: <strong style={{ color: q.is_correct ? "var(--success)" : "var(--danger)" }}>
                                            {q.your_answer.toUpperCase()}
                                        </strong></span>
                                    )}
                                    <span>Correct: <strong style={{ color: "var(--success)" }}>{q.correct_answer.toUpperCase()}</strong></span>
                                </div>
                                {q.explanation && (
                                    <p className="mt-2 pt-2" style={{ borderTop: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                                        💡 {q.explanation}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <Link href="/dashboard/events" className="btn-primary py-2.5 text-sm font-semibold text-center rounded-xl">
                    Back to Events
                </Link>
                <Link href="/dashboard/leaderboard" className="py-2.5 text-sm font-semibold text-center rounded-xl"
                    style={{ background: "var(--surface-2)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
                    View Leaderboard
                </Link>
            </div>
        </div>
    );
}
