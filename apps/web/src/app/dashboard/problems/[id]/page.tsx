"use client";
/**
 * CEAP — Problem Detail Page
 * View problem details, constraints, sample I/O, and test cases.
 * Admin/Faculty can manage test cases. Students see sample test cases only.
 */
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { problemAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";
import {
    ArrowLeft,
    Code2,
    Clock,
    Cpu,
    Tag,
    CheckCircle,
    XCircle,
    Plus,
    Loader2,
    AlertTriangle,
    Play,
    X,
} from "lucide-react";

export default function ProblemDetailPage() {
    const params = useParams();
    const router = useRouter();
    const problemId = params.id as string;
    const user = useAuthStore((s) => s.user);
    const queryClient = useQueryClient();
    const isAdmin = user?.role === "admin" || user?.role === "super_admin" || user?.role === "faculty";

    const [showAddTest, setShowAddTest] = useState(false);
    const [testForm, setTestForm] = useState({ input: "", expected_output: "", is_sample: false, weight: 1 });

    const { data: problem, isLoading, error } = useQuery({
        queryKey: ["problem", problemId],
        queryFn: () => problemAPI.get(problemId),
        select: (res) => res.data,
    });

    const { data: testCases } = useQuery({
        queryKey: ["test-cases", problemId],
        queryFn: () => problemAPI.testCases(problemId),
        select: (res) => res.data,
        enabled: !!problemId,
    });

    const addTestMutation = useMutation({
        mutationFn: (data: any) => problemAPI.addTestCase(problemId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["test-cases", problemId] });
            setShowAddTest(false);
            setTestForm({ input: "", expected_output: "", is_sample: false, weight: 1 });
        },
    });

    const diffBadge = (d: string) => {
        const m: Record<string, { c: string; b: string }> = {
            easy: { c: "#10b981", b: "rgba(16,185,129,0.12)" },
            medium: { c: "#f59e0b", b: "rgba(245,158,11,0.12)" },
            hard: { c: "#ef4444", b: "rgba(239,68,68,0.12)" },
        };
        const v = m[d] || m.medium;
        return (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase" style={{ color: v.c, background: v.b }}>
                {d}
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className="animate-fade-in flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin" style={{ color: "var(--primary)" }} />
            </div>
        );
    }

    if (error || !problem) {
        return (
            <div className="animate-fade-in text-center py-20">
                <AlertTriangle size={48} className="mx-auto mb-4" style={{ color: "var(--warning)" }} />
                <h2 className="text-xl font-bold mb-2">Problem Not Found</h2>
                <button onClick={() => router.push("/dashboard/problems")} className="btn-primary text-sm mt-4">
                    ← Back to Problems
                </button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6 max-w-4xl">
            {/* Back */}
            <button onClick={() => router.push("/dashboard/problems")}
                className="flex items-center gap-2 text-sm hover:text-white transition-colors" style={{ color: "var(--text-muted)" }}>
                <ArrowLeft size={16} /> Back to Problems
            </button>

            {/* Header */}
            <div className="glass-card p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            {diffBadge(problem.difficulty)}
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: "var(--bg-card-hover)", color: "var(--text-muted)" }}>
                                {problem.problem_type}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold">{problem.title}</h1>
                        <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                            <span className="flex items-center gap-1"><Clock size={12} />{problem.time_limit_ms}ms</span>
                            <span className="flex items-center gap-1"><Cpu size={12} />{(problem.memory_limit_kb / 1024).toFixed(0)}MB</span>
                            {problem.tags?.length > 0 && (
                                <span className="flex items-center gap-1"><Tag size={12} />{problem.tags.join(", ")}</span>
                            )}
                        </div>
                    </div>
                    <Link href="/dashboard/arena" className="btn-primary flex items-center gap-2 text-sm">
                        <Play size={14} /> Solve in Arena
                    </Link>
                </div>
            </div>

            {/* Description */}
            <div className="glass-card p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Description</h3>
                <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                    {problem.description}
                </div>
            </div>

            {/* I/O Format + Constraints */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {problem.input_format && (
                    <div className="glass-card p-5">
                        <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Input Format</h4>
                        <div className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{problem.input_format}</div>
                    </div>
                )}
                {problem.output_format && (
                    <div className="glass-card p-5">
                        <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Output Format</h4>
                        <div className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{problem.output_format}</div>
                    </div>
                )}
            </div>

            {problem.constraints && (
                <div className="glass-card p-5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Constraints</h4>
                    <div className="text-sm font-mono whitespace-pre-wrap p-3 rounded-lg" style={{ background: "var(--bg-dark)", color: "var(--text-secondary)" }}>
                        {problem.constraints}
                    </div>
                </div>
            )}

            {/* Sample I/O */}
            {(problem.sample_input || problem.sample_output) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {problem.sample_input && (
                        <div className="glass-card p-5">
                            <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Sample Input</h4>
                            <pre className="text-sm font-mono p-3 rounded-lg overflow-x-auto" style={{ background: "var(--bg-dark)" }}>{problem.sample_input}</pre>
                        </div>
                    )}
                    {problem.sample_output && (
                        <div className="glass-card p-5">
                            <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Sample Output</h4>
                            <pre className="text-sm font-mono p-3 rounded-lg overflow-x-auto" style={{ background: "var(--bg-dark)" }}>{problem.sample_output}</pre>
                        </div>
                    )}
                </div>
            )}

            {/* Test Cases */}
            <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Test Cases</h3>
                    {isAdmin && (
                        <button onClick={() => setShowAddTest(true)} className="btn-secondary flex items-center gap-1.5 text-xs">
                            <Plus size={12} /> Add Test Case
                        </button>
                    )}
                </div>

                {!testCases || testCases.length === 0 ? (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {isAdmin ? "No test cases yet. Add some to enable code judging." : "Sample test cases will appear here."}
                    </p>
                ) : (
                    <div className="space-y-2">
                        {testCases.map((tc: any, i: number) => (
                            <div key={tc.id} className="p-3 rounded-lg" style={{ background: "var(--bg-dark)" }}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold">Test #{i + 1}</span>
                                    <div className="flex items-center gap-2">
                                        {tc.is_sample && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.12)", color: "var(--primary-light)" }}>
                                                Sample
                                            </span>
                                        )}
                                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Weight: {tc.weight}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>Input</p>
                                        <pre className="text-xs font-mono p-2 rounded" style={{ background: "var(--bg-card)" }}>{tc.input}</pre>
                                    </div>
                                    <div>
                                        <p className="text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>Expected Output</p>
                                        <pre className="text-xs font-mono p-2 rounded" style={{ background: "var(--bg-card)" }}>{tc.expected_output}</pre>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Test Case Modal */}
            {showAddTest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowAddTest(false)}>
                    <div className="glass-card w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold">Add Test Case</h2>
                            <button onClick={() => setShowAddTest(false)} className="p-1 rounded-lg hover:bg-white/10"><X size={18} /></button>
                        </div>

                        <div>
                            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Input</label>
                            <textarea className="input-field font-mono text-sm min-h-[80px]" value={testForm.input}
                                onChange={(e) => setTestForm({ ...testForm, input: e.target.value })} placeholder="1 2 3" />
                        </div>
                        <div>
                            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Expected Output</label>
                            <textarea className="input-field font-mono text-sm min-h-[80px]" value={testForm.expected_output}
                                onChange={(e) => setTestForm({ ...testForm, expected_output: e.target.value })} placeholder="6" />
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={testForm.is_sample}
                                    onChange={(e) => setTestForm({ ...testForm, is_sample: e.target.checked })}
                                    className="w-4 h-4 rounded accent-[var(--primary)]" />
                                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Sample (visible to students)</span>
                            </label>
                            <div>
                                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Weight</label>
                                <input type="number" className="input-field w-20" value={testForm.weight}
                                    onChange={(e) => setTestForm({ ...testForm, weight: +e.target.value })} />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setShowAddTest(false)} className="btn-secondary flex-1 text-sm py-2.5">Cancel</button>
                            <button onClick={() => addTestMutation.mutate(testForm)}
                                disabled={!testForm.input || !testForm.expected_output || addTestMutation.isPending}
                                className="btn-primary flex-1 text-sm py-2.5 disabled:opacity-50">
                                {addTestMutation.isPending ? "Adding..." : "Add Test Case"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
