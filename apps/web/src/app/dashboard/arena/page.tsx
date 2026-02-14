"use client";
/**
 * CEAP — Coding Arena (Full Feature)
 * Split view: problem description | Monaco code editor + results.
 * Students select an event → see linked problems → write and submit code.
 */
import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
    ChevronDown,
    FileText,
    Zap,
    Trophy,
    AlertTriangle,
    List,
} from "lucide-react";

const LANGUAGES = [
    { id: "python", label: "Python 3", monaco: "python", default_code: '# Write your solution here\n\ndef solve():\n    n = int(input())\n    print(n)\n\nsolve()\n' },
    { id: "cpp", label: "C++ (GCC)", monaco: "cpp", default_code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    cout << n << endl;\n    return 0;\n}\n' },
    { id: "java", label: "Java", monaco: "java", default_code: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        System.out.println(n);\n    }\n}\n' },
    { id: "javascript", label: "JavaScript", monaco: "javascript", default_code: "// Write your solution here\nconst readline = require('readline');\nconst rl = readline.createInterface({ input: process.stdin });\n\nrl.on('line', (line) => {\n    console.log(line);\n});\n" },
];

export default function ArenaPage() {
    const user = useAuthStore((s) => s.user);
    const [selectedEventId, setSelectedEventId] = useState("");
    const [selectedProblemId, setSelectedProblemId] = useState("");
    const [language, setLanguage] = useState(LANGUAGES[0]);
    const [code, setCode] = useState(LANGUAGES[0].default_code);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [showSubmissions, setShowSubmissions] = useState(false);

    // Fetch events
    const { data: eventsData } = useQuery({
        queryKey: ["events-for-arena"],
        queryFn: () => eventAPI.list({ status: "ongoing", page_size: 50 }),
        select: (res) => res.data,
    });

    // Also include published events as fallback
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
    const { data: mySubmissions } = useQuery({
        queryKey: ["my-submissions", selectedEventId],
        queryFn: () => submissionAPI.mySubmissions(selectedEventId),
        select: (res) => res.data,
        enabled: !!selectedEventId,
    });

    // Selected problem details
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

    const handleSubmit = async () => {
        if (!selectedEventId || !selectedProblemId) return;
        setSubmitting(true);
        setResult(null);

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
                        setResult(sub);
                        setSubmitting(false);
                    }
                } catch {
                    // continue polling
                }
                if (attempts > 30) {
                    clearInterval(poll);
                    setSubmitting(false);
                    setResult({ status: "timeout", score: 0 });
                }
            }, 2000);
        } catch (err: any) {
            setResult({ status: "error", message: err.response?.data?.detail || "Submission failed" });
            setSubmitting(false);
        }
    };

    const handleReset = () => {
        setCode(language.default_code);
        setResult(null);
    };

    const getStatusBadge = (status: string) => {
        const map: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
            accepted: { color: "#10b981", bg: "rgba(16,185,129,0.12)", icon: <CheckCircle size={14} /> },
            wrong_answer: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", icon: <XCircle size={14} /> },
            tle: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: <Clock size={14} /> },
            mle: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: <Cpu size={14} /> },
            runtime_error: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", icon: <XCircle size={14} /> },
            compile_error: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", icon: <XCircle size={14} /> },
            pending: { color: "#6366f1", bg: "rgba(99,102,241,0.12)", icon: <Loader2 size={14} className="animate-spin" /> },
        };
        const s = map[status] || { color: "var(--text-muted)", bg: "rgba(100,116,139,0.12)", icon: null };
        return (
            <span className="px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1" style={{ color: s.color, background: s.bg }}>
                {s.icon}
                {status.replace("_", " ").toUpperCase()}
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

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col gap-3 animate-fade-in">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between glass-card px-4 py-2.5 shrink-0">
                <div className="flex items-center gap-3">
                    <Code2 size={20} style={{ color: "var(--primary)" }} />
                    <h1 className="text-sm font-bold">Coding Arena</h1>

                    {/* Event Selector */}
                    <select
                        value={selectedEventId}
                        onChange={(e) => { setSelectedEventId(e.target.value); setSelectedProblemId(""); }}
                        className="input-field py-1.5 px-3 w-48 text-xs"
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
                            className="input-field py-1.5 px-3 w-52 text-xs"
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
                        className="input-field py-1.5 px-3 w-36 text-xs"
                    >
                        {LANGUAGES.map((l) => (
                            <option key={l.id} value={l.id}>{l.label}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowSubmissions(!showSubmissions)}
                        className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
                    >
                        <List size={12} />
                        History
                    </button>
                    <button onClick={handleReset} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5">
                        <RotateCcw size={12} />
                        Reset
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !selectedEventId || !selectedProblemId}
                        className="btn-primary py-1.5 px-4 text-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                        {submitting ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                        {submitting ? "Judging..." : "Submit"}
                    </button>
                </div>
            </div>

            {/* Main Split View */}
            <div className="flex-1 flex gap-3 min-h-0">
                {/* Problem Description Panel */}
                <div className="w-[380px] shrink-0 glass-card p-5 overflow-y-auto">
                    {selectedProblem ? (
                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    {diffBadge(selectedProblem.difficulty)}
                                    <span className="text-[10px] uppercase px-2 py-0.5 rounded-full" style={{ background: "var(--bg-card-hover)", color: "var(--text-muted)" }}>
                                        {selectedProblem.problem_type}
                                    </span>
                                </div>
                                <h2 className="text-lg font-bold">{selectedProblem.title}</h2>
                            </div>

                            {/* Description */}
                            <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Description</h4>
                                <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                                    {selectedProblem.description}
                                </div>
                            </div>

                            {/* Input Format */}
                            {selectedProblem.input_format && (
                                <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Input Format</h4>
                                    <div className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                                        {selectedProblem.input_format}
                                    </div>
                                </div>
                            )}

                            {/* Output Format */}
                            {selectedProblem.output_format && (
                                <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Output Format</h4>
                                    <div className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                                        {selectedProblem.output_format}
                                    </div>
                                </div>
                            )}

                            {/* Constraints */}
                            {selectedProblem.constraints && (
                                <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Constraints</h4>
                                    <div className="text-sm font-mono p-3 rounded-lg whitespace-pre-wrap"
                                        style={{ background: "var(--bg-dark)", color: "var(--text-secondary)" }}>
                                        {selectedProblem.constraints}
                                    </div>
                                </div>
                            )}

                            {/* Sample I/O */}
                            {selectedProblem.sample_input && (
                                <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Sample Input</h4>
                                    <pre className="text-sm font-mono p-3 rounded-lg overflow-x-auto"
                                        style={{ background: "var(--bg-dark)", color: "var(--text-secondary)" }}>
                                        {selectedProblem.sample_input}
                                    </pre>
                                </div>
                            )}
                            {selectedProblem.sample_output && (
                                <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Sample Output</h4>
                                    <pre className="text-sm font-mono p-3 rounded-lg overflow-x-auto"
                                        style={{ background: "var(--bg-dark)", color: "var(--text-secondary)" }}>
                                        {selectedProblem.sample_output}
                                    </pre>
                                </div>
                            )}

                            {/* Limits */}
                            <div className="flex gap-3 pt-2 border-t" style={{ borderColor: "var(--border-color)" }}>
                                <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                                    <Clock size={12} /> {selectedProblem.time_limit_ms}ms
                                </div>
                                <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                                    <Cpu size={12} /> {(selectedProblem.memory_limit_kb / 1024).toFixed(0)}MB
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <FileText size={40} className="mb-3" style={{ color: "var(--text-muted)" }} />
                            <p className="text-sm font-medium">Select a Problem</p>
                            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                                {!selectedEventId
                                    ? "Choose an event first, then select a problem"
                                    : problems?.length === 0
                                        ? "No problems linked to this event yet"
                                        : "Pick a problem from the dropdown"}
                            </p>
                        </div>
                    )}
                </div>

                {/* Code Editor */}
                <div className="flex-1 glass-card overflow-hidden" style={{ borderRadius: 12 }}>
                    <Editor
                        height="100%"
                        language={language.monaco}
                        theme="vs-dark"
                        value={code}
                        onChange={(val) => setCode(val || "")}
                        options={{
                            fontSize: 14,
                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            padding: { top: 16, bottom: 16 },
                            lineHeight: 22,
                            renderLineHighlight: "all" as const,
                            bracketPairColorization: { enabled: true },
                            smoothScrolling: true,
                            cursorBlinking: "smooth" as const,
                            cursorSmoothCaretAnimation: "on" as const,
                        }}
                    />
                </div>

                {/* Right Panel: Result or Submissions History */}
                {(result || showSubmissions) && (
                    <div className="w-[320px] shrink-0 glass-card p-5 overflow-y-auto animate-fade-in">
                        {showSubmissions && !result ? (
                            <>
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <List size={14} /> Submission History
                                </h3>
                                {!mySubmissions || mySubmissions.length === 0 ? (
                                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>No submissions yet</p>
                                ) : (
                                    <div className="space-y-2">
                                        {mySubmissions.map((sub: any) => (
                                            <div key={sub.id} className="p-3 rounded-lg" style={{ background: "var(--bg-dark)" }}>
                                                <div className="flex items-center justify-between mb-1">
                                                    {getStatusBadge(sub.status)}
                                                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                                        {sub.score !== null ? `${sub.score}/100` : "—"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
                                                    <span>{sub.language}</span>
                                                    <span>{new Date(sub.submitted_at).toLocaleTimeString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : result && (
                            <>
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Zap size={14} /> Submission Result
                                </h3>

                                <div className="mb-3">{getStatusBadge(result.status)}</div>

                                {result.score !== undefined && (
                                    <div className="mb-3">
                                        <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Score</p>
                                        <p className="text-3xl font-bold" style={{ color: result.score >= 100 ? "#10b981" : "var(--primary)" }}>
                                            {result.score}
                                            <span className="text-sm font-normal" style={{ color: "var(--text-muted)" }}>/100</span>
                                        </p>
                                    </div>
                                )}

                                {result.execution_time !== undefined && (
                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        <div className="p-2.5 rounded-lg" style={{ background: "var(--bg-dark)" }}>
                                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Time</p>
                                            <p className="text-sm font-semibold">{result.execution_time}ms</p>
                                        </div>
                                        <div className="p-2.5 rounded-lg" style={{ background: "var(--bg-dark)" }}>
                                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Memory</p>
                                            <p className="text-sm font-semibold">{result.memory_used}KB</p>
                                        </div>
                                    </div>
                                )}

                                {result.results && result.results.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Test Cases</p>
                                        <div className="space-y-1.5">
                                            {result.results.map((r: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between p-2 rounded-lg text-xs" style={{ background: "var(--bg-dark)" }}>
                                                    <span>Test #{i + 1}</span>
                                                    {r.passed ? (
                                                        <CheckCircle size={14} style={{ color: "#10b981" }} />
                                                    ) : (
                                                        <XCircle size={14} style={{ color: "#ef4444" }} />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {result.message && (
                                    <p className="text-xs mt-3" style={{ color: "#ef4444" }}>{result.message}</p>
                                )}

                                <button onClick={() => setResult(null)} className="btn-secondary w-full mt-3 text-xs py-2">
                                    Dismiss
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
