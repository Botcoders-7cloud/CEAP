"use client";
/**
 * CEAP — Coding Arena (Full Feature)
 * Split view: problem description | Monaco code editor + output panel.
 * Two actions: Run (sample test) | Submit (full grading).
 */
import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Editor from "@monaco-editor/react";
import { eventAPI, submissionAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import {
    Play,
    RotateCcw,
    Clock,
    Cpu,
    CheckCircle,
    XCircle,
    Loader2,
    Code2,
    FileText,
    Zap,
    AlertTriangle,
    List,
    Send,
    Terminal,
    ChevronRight,
    Eye,
    EyeOff,
} from "lucide-react";

const LANGUAGES = [
    { id: "python", label: "Python 3", monaco: "python", default_code: '# Write your solution here\n\ndef solve():\n    n = int(input())\n    print(n)\n\nsolve()\n' },
    { id: "cpp", label: "C++ (GCC)", monaco: "cpp", default_code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    cout << n << endl;\n    return 0;\n}\n' },
    { id: "java", label: "Java", monaco: "java", default_code: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        System.out.println(n);\n    }\n}\n' },
    { id: "javascript", label: "JavaScript", monaco: "javascript", default_code: "// Write your solution here\nconst readline = require('readline');\nconst rl = readline.createInterface({ input: process.stdin });\n\nrl.on('line', (line) => {\n    console.log(line);\n});\n" },
];

type OutputTab = "output" | "testcases" | "history";

export default function ArenaPage() {
    const user = useAuthStore((s) => s.user);
    const [selectedEventId, setSelectedEventId] = useState("");
    const [selectedProblemId, setSelectedProblemId] = useState("");
    const [language, setLanguage] = useState(LANGUAGES[0]);
    const [code, setCode] = useState(LANGUAGES[0].default_code);

    // Run/Submit state
    const [running, setRunning] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [runResult, setRunResult] = useState<any>(null);
    const [submitResult, setSubmitResult] = useState<any>(null);
    const [customInput, setCustomInput] = useState("");
    const [useCustomInput, setUseCustomInput] = useState(false);
    const [outputTab, setOutputTab] = useState<OutputTab>("output");

    // Fetch events
    const { data: eventsData } = useQuery({
        queryKey: ["events-for-arena"],
        queryFn: () => eventAPI.list({ status: "ongoing", page_size: 50 }),
        select: (res) => res.data,
    });

    const { data: publishedData } = useQuery({
        queryKey: ["events-published-arena"],
        queryFn: () => eventAPI.list({ page_size: 50 }),
        select: (res) => res.data,
    });

    const events = publishedData?.events || eventsData?.events || [];

    // Fetch problems for selected event
    const { data: problems, isLoading: problemsLoading } = useQuery({
        queryKey: ["event-problems", selectedEventId],
        queryFn: () => eventAPI.problems(selectedEventId),
        select: (res) => res.data,
        enabled: !!selectedEventId,
    });

    // Fetch past submissions
    const { data: mySubmissions, refetch: refetchSubmissions } = useQuery({
        queryKey: ["my-submissions", selectedEventId],
        queryFn: () => submissionAPI.mySubmissions(selectedEventId),
        select: (res) => res.data,
        enabled: !!selectedEventId,
    });

    const selectedProblem = problems?.find((p: any) => p.id === selectedProblemId);

    // Auto-select first event and problem
    useEffect(() => {
        if (events.length > 0 && !selectedEventId) {
            setSelectedEventId(events[0].id);
        }
    }, [events, selectedEventId]);

    useEffect(() => {
        if (problems?.length > 0 && !selectedProblemId) {
            setSelectedProblemId(problems[0].id);
        }
    }, [problems, selectedProblemId]);

    const handleLanguageChange = useCallback((langId: string) => {
        const lang = LANGUAGES.find((l) => l.id === langId)!;
        setLanguage(lang);
        setCode(lang.default_code);
    }, []);

    // ── Run: test against sample cases ──────────────
    const handleRun = async () => {
        if (!selectedEventId || !selectedProblemId) return;
        setRunning(true);
        setRunResult(null);
        setSubmitResult(null);
        setOutputTab("output");

        try {
            const payload: any = {
                event_id: selectedEventId,
                problem_id: selectedProblemId,
                language: language.id,
                source_code: code,
            };
            if (useCustomInput) {
                payload.custom_input = customInput;
            }
            const { data } = await submissionAPI.run(payload);
            setRunResult(data);
        } catch (err: any) {
            setRunResult({
                status: "error",
                stderr: err.response?.data?.detail || "Run failed. Check your code.",
                stdout: "",
                compile_output: "",
                test_results: [],
            });
        } finally {
            setRunning(false);
        }
    };

    // ── Submit: full grading ────────────────────────
    const handleSubmit = async () => {
        if (!selectedEventId || !selectedProblemId) return;
        setSubmitting(true);
        setSubmitResult(null);
        setRunResult(null);
        setOutputTab("testcases");

        try {
            const { data } = await submissionAPI.create({
                event_id: selectedEventId,
                problem_id: selectedProblemId,
                language: language.id,
                source_code: code,
            });

            // Poll for result
            let attempts = 0;
            const poll = setInterval(async () => {
                attempts++;
                try {
                    const { data: sub } = await submissionAPI.get(data.id);
                    if (sub.status !== "pending" && sub.status !== "queued" && sub.status !== "running") {
                        clearInterval(poll);
                        setSubmitResult(sub);
                        setSubmitting(false);
                        refetchSubmissions();
                    }
                } catch {
                    // continue polling
                }
                if (attempts > 30) {
                    clearInterval(poll);
                    setSubmitting(false);
                    setSubmitResult({ status: "timeout", score: 0, results: [] });
                }
            }, 2000);
        } catch (err: any) {
            setSubmitResult({
                status: "error",
                message: err.response?.data?.detail || "Submission failed",
                results: [],
            });
            setSubmitting(false);
        }
    };

    const handleReset = () => {
        setCode(language.default_code);
        setRunResult(null);
        setSubmitResult(null);
    };

    // ── Status badges ───────────────────────────────
    const getStatusBadge = (status: string, size: "sm" | "md" = "sm") => {
        const map: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
            accepted: { color: "#10b981", bg: "rgba(16,185,129,0.12)", icon: <CheckCircle size={size === "sm" ? 12 : 14} /> },
            wrong_answer: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", icon: <XCircle size={size === "sm" ? 12 : 14} /> },
            tle: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: <Clock size={size === "sm" ? 12 : 14} /> },
            mle: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: <Cpu size={size === "sm" ? 12 : 14} /> },
            runtime_error: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", icon: <AlertTriangle size={size === "sm" ? 12 : 14} /> },
            compile_error: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", icon: <AlertTriangle size={size === "sm" ? 12 : 14} /> },
            pending: { color: "#6366f1", bg: "rgba(99,102,241,0.12)", icon: <Loader2 size={size === "sm" ? 12 : 14} className="animate-spin" /> },
            queued: { color: "#6366f1", bg: "rgba(99,102,241,0.12)", icon: <Loader2 size={size === "sm" ? 12 : 14} className="animate-spin" /> },
            running: { color: "#6366f1", bg: "rgba(99,102,241,0.12)", icon: <Loader2 size={size === "sm" ? 12 : 14} className="animate-spin" /> },
            error: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", icon: <XCircle size={size === "sm" ? 12 : 14} /> },
            timeout: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: <Clock size={size === "sm" ? 12 : 14} /> },
        };
        const s = map[status] || { color: "var(--text-muted)", bg: "rgba(100,116,139,0.12)", icon: null };
        return (
            <span className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${size === "sm" ? "text-[10px]" : "text-xs"}`} style={{ color: s.color, background: s.bg }}>
                {s.icon}
                {status.replace(/_/g, " ").toUpperCase()}
            </span>
        );
    };

    const diffBadge = (d: string) => {
        const m: Record<string, { c: string; b: string }> = {
            easy: { c: "#10b981", b: "rgba(16,185,129,0.12)" },
            medium: { c: "#f59e0b", b: "rgba(245,158,11,0.12)" },
            hard: { c: "#ef4444", b: "rgba(239,68,68,0.12)" },
        };
        const v = m[d] || m.medium;
        return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ color: v.c, background: v.b }}>
                {d}
            </span>
        );
    };

    // Current result to display
    const activeResult = runResult || submitResult;
    const isRunOutput = !!runResult;

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col gap-2 animate-fade-in">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between glass-card px-4 py-2 shrink-0">
                <div className="flex items-center gap-3">
                    <Code2 size={18} style={{ color: "var(--primary)" }} />
                    <h1 className="text-sm font-bold">Arena</h1>

                    {/* Event Selector */}
                    <select
                        value={selectedEventId}
                        onChange={(e) => { setSelectedEventId(e.target.value); setSelectedProblemId(""); }}
                        className="input-field py-1 px-2 w-44 text-xs"
                    >
                        <option value="">Select Event</option>
                        {events.map((e: any) => (
                            <option key={e.id} value={e.id}>{e.title}</option>
                        ))}
                    </select>

                    {/* Problem Selector */}
                    {selectedEventId && (
                        <select
                            value={selectedProblemId}
                            onChange={(e) => setSelectedProblemId(e.target.value)}
                            className="input-field py-1 px-2 w-48 text-xs"
                            disabled={problemsLoading}
                        >
                            <option value="">{problemsLoading ? "Loading..." : "Select Problem"}</option>
                            {problems?.map((p: any, i: number) => (
                                <option key={p.id} value={p.id}>#{i + 1} {p.title}</option>
                            ))}
                        </select>
                    )}

                    {/* Language Selector */}
                    <select
                        value={language.id}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="input-field py-1 px-2 w-32 text-xs"
                    >
                        {LANGUAGES.map((l) => (
                            <option key={l.id} value={l.id}>{l.label}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={handleReset} className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1">
                        <RotateCcw size={11} />
                        Reset
                    </button>

                    {/* ▶ Run Button (green) */}
                    <button
                        onClick={handleRun}
                        disabled={running || submitting || !selectedEventId || !selectedProblemId}
                        className="py-1 px-3 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-40"
                        style={{
                            background: running ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.12)",
                            color: "#10b981",
                            border: "1px solid rgba(16,185,129,0.3)",
                        }}
                        onMouseEnter={(e) => { if (!running) e.currentTarget.style.background = "rgba(16,185,129,0.25)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(16,185,129,0.12)"; }}
                    >
                        {running ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                        {running ? "Running..." : "Run"}
                    </button>

                    {/* 🚀 Submit Button (primary) */}
                    <button
                        onClick={handleSubmit}
                        disabled={running || submitting || !selectedEventId || !selectedProblemId}
                        className="btn-primary py-1 px-3.5 text-xs flex items-center gap-1.5 disabled:opacity-40"
                    >
                        {submitting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                        {submitting ? "Judging..." : "Submit"}
                    </button>
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex-1 flex gap-2 min-h-0">
                {/* Left: Problem Description */}
                <div className="w-[340px] shrink-0 glass-card p-4 overflow-y-auto">
                    {selectedProblem ? (
                        <div className="space-y-3">
                            <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                    {diffBadge(selectedProblem.difficulty)}
                                    <span className="text-[10px] uppercase px-2 py-0.5 rounded-full" style={{ background: "var(--bg-card-hover)", color: "var(--text-muted)" }}>
                                        {selectedProblem.problem_type}
                                    </span>
                                </div>
                                <h2 className="text-base font-bold">{selectedProblem.title}</h2>
                            </div>

                            <div>
                                <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Description</h4>
                                <div className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                                    {selectedProblem.description}
                                </div>
                            </div>

                            {selectedProblem.input_format && (
                                <div>
                                    <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Input Format</h4>
                                    <div className="text-xs whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                                        {selectedProblem.input_format}
                                    </div>
                                </div>
                            )}

                            {selectedProblem.output_format && (
                                <div>
                                    <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Output Format</h4>
                                    <div className="text-xs whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                                        {selectedProblem.output_format}
                                    </div>
                                </div>
                            )}

                            {selectedProblem.constraints && (
                                <div>
                                    <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Constraints</h4>
                                    <div className="text-xs font-mono p-2.5 rounded-lg whitespace-pre-wrap"
                                        style={{ background: "var(--bg-dark)", color: "var(--text-secondary)" }}>
                                        {selectedProblem.constraints}
                                    </div>
                                </div>
                            )}

                            {selectedProblem.sample_input && (
                                <div>
                                    <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Sample Input</h4>
                                    <pre className="text-xs font-mono p-2.5 rounded-lg overflow-x-auto"
                                        style={{ background: "var(--bg-dark)", color: "var(--text-secondary)" }}>
                                        {selectedProblem.sample_input}
                                    </pre>
                                </div>
                            )}
                            {selectedProblem.sample_output && (
                                <div>
                                    <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Expected Output</h4>
                                    <pre className="text-xs font-mono p-2.5 rounded-lg overflow-x-auto"
                                        style={{ background: "var(--bg-dark)", color: "var(--text-secondary)" }}>
                                        {selectedProblem.sample_output}
                                    </pre>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2 border-t" style={{ borderColor: "var(--border-color)" }}>
                                <div className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                                    <Clock size={10} /> {selectedProblem.time_limit_ms}ms
                                </div>
                                <div className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                                    <Cpu size={10} /> {(selectedProblem.memory_limit_kb / 1024).toFixed(0)}MB
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <FileText size={36} className="mb-2" style={{ color: "var(--text-muted)" }} />
                            <p className="text-sm font-medium">Select a Problem</p>
                            <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                                {!selectedEventId
                                    ? "Choose an event first"
                                    : problems?.length === 0
                                        ? "No problems linked yet"
                                        : "Pick a problem from the dropdown"}
                            </p>
                        </div>
                    )}
                </div>

                {/* Center: Code Editor + Bottom Output */}
                <div className="flex-1 flex flex-col gap-2 min-h-0">
                    {/* Editor */}
                    <div className="flex-1 glass-card overflow-hidden min-h-0" style={{ borderRadius: 10 }}>
                        <Editor
                            height="100%"
                            language={language.monaco}
                            theme="vs-dark"
                            value={code}
                            onChange={(val) => setCode(val || "")}
                            options={{
                                fontSize: 13,
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                padding: { top: 12, bottom: 12 },
                                lineHeight: 20,
                                renderLineHighlight: "all" as const,
                                bracketPairColorization: { enabled: true },
                                smoothScrolling: true,
                                cursorBlinking: "smooth" as const,
                                cursorSmoothCaretAnimation: "on" as const,
                            }}
                        />
                    </div>

                    {/* Bottom: Output / Test Cases / History Panel */}
                    <div className="h-[220px] shrink-0 glass-card flex flex-col overflow-hidden" style={{ borderRadius: 10 }}>
                        {/* Tabs */}
                        <div className="flex items-center gap-0 border-b px-1 shrink-0" style={{ borderColor: "var(--border-color)" }}>
                            {(["output", "testcases", "history"] as OutputTab[]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setOutputTab(tab)}
                                    className="px-3 py-2 text-[11px] font-medium transition-colors relative"
                                    style={{
                                        color: outputTab === tab ? "var(--primary)" : "var(--text-muted)",
                                    }}
                                >
                                    {tab === "output" ? "Output" : tab === "testcases" ? "Test Cases" : "History"}
                                    {outputTab === tab && (
                                        <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ background: "var(--primary)" }} />
                                    )}
                                </button>
                            ))}

                            {/* Custom Input Toggle */}
                            <div className="ml-auto flex items-center gap-1.5 pr-2">
                                <button
                                    onClick={() => setUseCustomInput(!useCustomInput)}
                                    className="text-[10px] flex items-center gap-1 px-2 py-1 rounded"
                                    style={{
                                        color: useCustomInput ? "var(--primary)" : "var(--text-muted)",
                                        background: useCustomInput ? "rgba(99,102,241,0.1)" : "transparent",
                                    }}
                                >
                                    <Terminal size={10} />
                                    Custom Input
                                </button>
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto p-3">
                            {/* OUTPUT TAB */}
                            {outputTab === "output" && (
                                <div className="h-full">
                                    {useCustomInput && !activeResult && (
                                        <div className="mb-2">
                                            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Custom Input (stdin)</label>
                                            <textarea
                                                value={customInput}
                                                onChange={(e) => setCustomInput(e.target.value)}
                                                className="w-full h-16 input-field text-xs font-mono resize-none"
                                                placeholder="Enter your test input here..."
                                            />
                                        </div>
                                    )}

                                    {running && (
                                        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                                            <Loader2 size={14} className="animate-spin" style={{ color: "var(--primary)" }} />
                                            Running your code against sample test cases...
                                        </div>
                                    )}

                                    {submitting && (
                                        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                                            <Loader2 size={14} className="animate-spin" style={{ color: "var(--primary)" }} />
                                            Judging against all test cases...
                                        </div>
                                    )}

                                    {activeResult && !running && !submitting && (
                                        <div className="space-y-2">
                                            {/* Status Line */}
                                            <div className="flex items-center gap-2">
                                                {getStatusBadge(activeResult.status, "md")}
                                                {isRunOutput && activeResult.passed_count !== undefined && (
                                                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                                        {activeResult.passed_count}/{activeResult.total_count} sample tests passed
                                                    </span>
                                                )}
                                                {!isRunOutput && activeResult.score !== undefined && (
                                                    <span className="text-xs font-bold" style={{
                                                        color: activeResult.score >= 100 ? "#10b981" : activeResult.score > 0 ? "#f59e0b" : "#ef4444"
                                                    }}>
                                                        Score: {activeResult.score}/100
                                                    </span>
                                                )}
                                                {activeResult.execution_time > 0 && (
                                                    <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                                                        <Clock size={9} /> {activeResult.execution_time}ms
                                                    </span>
                                                )}
                                                {activeResult.memory_used > 0 && (
                                                    <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                                                        <Cpu size={9} /> {activeResult.memory_used}KB
                                                    </span>
                                                )}
                                            </div>

                                            {/* Compile Error */}
                                            {activeResult.compile_output && (
                                                <div>
                                                    <p className="text-[10px] font-semibold mb-1" style={{ color: "#ef4444" }}>Compilation Error</p>
                                                    <pre className="text-[11px] font-mono p-2.5 rounded-lg overflow-x-auto whitespace-pre-wrap"
                                                        style={{ background: "rgba(239,68,68,0.08)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.2)" }}>
                                                        {activeResult.compile_output}
                                                    </pre>
                                                </div>
                                            )}

                                            {/* Stderr */}
                                            {activeResult.stderr && (
                                                <div>
                                                    <p className="text-[10px] font-semibold mb-1" style={{ color: "#f59e0b" }}>Stderr</p>
                                                    <pre className="text-[11px] font-mono p-2.5 rounded-lg overflow-x-auto whitespace-pre-wrap"
                                                        style={{ background: "rgba(245,158,11,0.08)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.2)" }}>
                                                        {activeResult.stderr}
                                                    </pre>
                                                </div>
                                            )}

                                            {/* Stdout */}
                                            {activeResult.stdout && (
                                                <div>
                                                    <p className="text-[10px] font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Output</p>
                                                    <pre className="text-[11px] font-mono p-2.5 rounded-lg overflow-x-auto whitespace-pre-wrap"
                                                        style={{ background: "var(--bg-dark)", color: "var(--text-secondary)" }}>
                                                        {activeResult.stdout}
                                                    </pre>
                                                </div>
                                            )}

                                            {/* Error message */}
                                            {activeResult.message && (
                                                <div className="text-xs p-2 rounded-lg" style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)" }}>
                                                    {activeResult.message}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {!activeResult && !running && !submitting && (
                                        <div className="flex flex-col items-center justify-center h-full text-center">
                                            <Terminal size={24} className="mb-2" style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                                            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                                                Click <strong>Run</strong> to test against sample cases,
                                                or <strong>Submit</strong> for full grading
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TEST CASES TAB */}
                            {outputTab === "testcases" && (
                                <div className="space-y-1.5">
                                    {/* Run results — show per-test-case from Run */}
                                    {isRunOutput && runResult?.test_results?.length > 0 && (
                                        runResult.test_results.map((tr: any, i: number) => (
                                            <div key={i} className="p-2.5 rounded-lg" style={{ background: "var(--bg-dark)" }}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-[11px] font-medium">Sample Test #{i + 1}</span>
                                                    <div className="flex items-center gap-2">
                                                        {tr.execution_time > 0 && (
                                                            <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{tr.execution_time}ms</span>
                                                        )}
                                                        {getStatusBadge(tr.status)}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-[10px]">
                                                    <div>
                                                        <p className="mb-0.5 font-medium" style={{ color: "var(--text-muted)" }}>Input</p>
                                                        <pre className="font-mono p-1.5 rounded" style={{ background: "var(--bg-card)", color: "var(--text-secondary)" }}>
                                                            {tr.input || "—"}
                                                        </pre>
                                                    </div>
                                                    <div>
                                                        <p className="mb-0.5 font-medium" style={{ color: "var(--text-muted)" }}>Expected</p>
                                                        <pre className="font-mono p-1.5 rounded" style={{ background: "var(--bg-card)", color: "var(--text-secondary)" }}>
                                                            {tr.expected_output || "—"}
                                                        </pre>
                                                    </div>
                                                    <div>
                                                        <p className="mb-0.5 font-medium" style={{ color: tr.passed ? "#10b981" : "#ef4444" }}>Your Output</p>
                                                        <pre className="font-mono p-1.5 rounded" style={{
                                                            background: "var(--bg-card)",
                                                            color: tr.passed ? "#10b981" : "#ef4444",
                                                        }}>
                                                            {tr.stdout || tr.stderr || "—"}
                                                        </pre>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}

                                    {/* Submit results — show per-test-case from Submit */}
                                    {!isRunOutput && submitResult?.results?.length > 0 && (
                                        submitResult.results.map((r: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: "var(--bg-dark)" }}>
                                                <div className="flex items-center gap-2">
                                                    {r.passed ? (
                                                        <CheckCircle size={13} style={{ color: "#10b981" }} />
                                                    ) : (
                                                        <XCircle size={13} style={{ color: "#ef4444" }} />
                                                    )}
                                                    <span className="text-[11px] font-medium">Test Case #{i + 1}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {r.execution_time > 0 && (
                                                        <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{r.execution_time}ms</span>
                                                    )}
                                                    {r.memory_used > 0 && (
                                                        <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{r.memory_used}KB</span>
                                                    )}
                                                    {getStatusBadge(r.status || (r.passed ? "accepted" : "wrong_answer"))}
                                                </div>
                                            </div>
                                        ))
                                    )}

                                    {submitting && (
                                        <div className="flex items-center gap-2 p-3 text-xs" style={{ color: "var(--text-muted)" }}>
                                            <Loader2 size={14} className="animate-spin" />
                                            Judging in progress...
                                        </div>
                                    )}

                                    {!isRunOutput && !submitResult && !submitting && (
                                        <p className="text-[11px] text-center py-6" style={{ color: "var(--text-muted)" }}>
                                            Submit your solution to see test case results
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* HISTORY TAB */}
                            {outputTab === "history" && (
                                <div className="space-y-1.5">
                                    {!mySubmissions || mySubmissions.length === 0 ? (
                                        <p className="text-[11px] text-center py-6" style={{ color: "var(--text-muted)" }}>No submissions yet</p>
                                    ) : (
                                        mySubmissions.map((sub: any) => (
                                            <div key={sub.id} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: "var(--bg-dark)" }}>
                                                <div className="flex items-center gap-2">
                                                    {getStatusBadge(sub.status)}
                                                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{sub.language}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-semibold" style={{
                                                        color: sub.score >= 100 ? "#10b981" : sub.score > 0 ? "#f59e0b" : "var(--text-muted)"
                                                    }}>
                                                        {sub.score !== null ? `${sub.score}/100` : "—"}
                                                    </span>
                                                    <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                                                        {new Date(sub.submitted_at).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
