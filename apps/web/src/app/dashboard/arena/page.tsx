"use client";
/**
 * CEAP — Code Editor Page (Monaco)
 * Students write and submit code here during contests.
 */
import { useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { submissionAPI } from "@/lib/api";
import { Play, RotateCcw, Clock, Cpu, CheckCircle, XCircle, Loader2 } from "lucide-react";

const LANGUAGES = [
    { id: "python", label: "Python 3", default_code: '# Write your solution here\n\ndef solve():\n    n = int(input())\n    print(n)\n\nsolve()\n' },
    { id: "cpp", label: "C++ (GCC)", default_code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    cout << n << endl;\n    return 0;\n}\n' },
    { id: "java", label: "Java", default_code: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        System.out.println(n);\n    }\n}\n' },
    { id: "javascript", label: "JavaScript", default_code: "// Write your solution here\nconst readline = require('readline');\nconst rl = readline.createInterface({ input: process.stdin });\n\nrl.on('line', (line) => {\n    console.log(line);\n});\n" },
];

interface CodeEditorPageProps {
    eventId?: string;
    problemId?: string;
    problemTitle?: string;
    problemDescription?: string;
}

export default function CodeEditorPage({ eventId, problemId, problemTitle, problemDescription }: CodeEditorPageProps) {
    const [language, setLanguage] = useState(LANGUAGES[0]);
    const [code, setCode] = useState(LANGUAGES[0].default_code);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleLanguageChange = useCallback((langId: string) => {
        const lang = LANGUAGES.find((l) => l.id === langId)!;
        setLanguage(lang);
        setCode(lang.default_code);
    }, []);

    const handleSubmit = async () => {
        if (!eventId || !problemId) return;
        setSubmitting(true);
        setResult(null);

        try {
            const { data } = await submissionAPI.create({
                event_id: eventId,
                problem_id: problemId,
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
            accepted: { color: "var(--success)", bg: "rgba(16,185,129,0.12)", icon: <CheckCircle size={14} /> },
            wrong_answer: { color: "var(--danger)", bg: "rgba(239,68,68,0.12)", icon: <XCircle size={14} /> },
            tle: { color: "var(--warning)", bg: "rgba(245,158,11,0.12)", icon: <Clock size={14} /> },
            mle: { color: "var(--warning)", bg: "rgba(245,158,11,0.12)", icon: <Cpu size={14} /> },
            runtime_error: { color: "var(--danger)", bg: "rgba(239,68,68,0.12)", icon: <XCircle size={14} /> },
            compile_error: { color: "var(--danger)", bg: "rgba(239,68,68,0.12)", icon: <XCircle size={14} /> },
        };
        const s = map[status] || { color: "var(--text-muted)", bg: "rgba(100,116,139,0.12)", icon: null };
        return (
            <span className="badge flex items-center gap-1.5" style={{ color: s.color, background: s.bg }}>
                {s.icon}
                {status.replace("_", " ").toUpperCase()}
            </span>
        );
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-4">
            {/* Problem Title */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">
                    {problemTitle || "Code Editor"}
                </h1>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between glass-card px-4 py-2.5">
                <div className="flex items-center gap-3">
                    <select
                        value={language.id}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="input-field py-1.5 px-3 w-40 text-sm"
                    >
                        {LANGUAGES.map((l) => (
                            <option key={l.id} value={l.id}>
                                {l.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={handleReset} className="btn-secondary py-1.5 px-3 text-sm flex items-center gap-1.5">
                        <RotateCcw size={14} />
                        Reset
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !eventId}
                        className="btn-primary py-1.5 px-4 text-sm flex items-center gap-1.5 disabled:opacity-50"
                    >
                        {submitting ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Play size={14} />
                        )}
                        {submitting ? "Judging..." : "Submit"}
                    </button>
                </div>
            </div>

            {/* Editor + Result split */}
            <div className="flex-1 flex gap-4 min-h-0">
                {/* Monaco Editor */}
                <div className="flex-1 glass-card overflow-hidden" style={{ borderRadius: 12 }}>
                    <Editor
                        height="100%"
                        language={language.id === "cpp" ? "cpp" : language.id}
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

                {/* Result Panel */}
                {result && (
                    <div className="w-[340px] glass-card p-5 overflow-y-auto animate-fade-in">
                        <h3 className="text-sm font-semibold mb-4">Submission Result</h3>

                        <div className="mb-4">{getStatusBadge(result.status)}</div>

                        {result.score !== undefined && (
                            <div className="mb-4">
                                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Score</p>
                                <p className="text-3xl font-bold" style={{ color: result.score >= 100 ? "var(--success)" : "var(--primary)" }}>
                                    {result.score}
                                    <span className="text-sm font-normal" style={{ color: "var(--text-muted)" }}>/100</span>
                                </p>
                            </div>
                        )}

                        {result.execution_time !== undefined && (
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="p-3 rounded-lg" style={{ background: "var(--bg-dark)" }}>
                                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Time</p>
                                    <p className="text-sm font-semibold">{result.execution_time}ms</p>
                                </div>
                                <div className="p-3 rounded-lg" style={{ background: "var(--bg-dark)" }}>
                                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Memory</p>
                                    <p className="text-sm font-semibold">{result.memory_used}KB</p>
                                </div>
                            </div>
                        )}

                        {result.results && result.results.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Test Cases</p>
                                <div className="space-y-2">
                                    {result.results.map((r: any, i: number) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between p-2.5 rounded-lg text-sm"
                                            style={{ background: "var(--bg-dark)" }}
                                        >
                                            <span>Test #{i + 1}</span>
                                            {r.passed ? (
                                                <CheckCircle size={16} style={{ color: "var(--success)" }} />
                                            ) : (
                                                <XCircle size={16} style={{ color: "var(--danger)" }} />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {result.message && (
                            <p className="text-sm mt-3" style={{ color: "var(--danger)" }}>
                                {result.message}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
