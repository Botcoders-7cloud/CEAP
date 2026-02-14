"use client";
/**
 * CEAP — Problems Management Page (Admin/Faculty)
 * Manage coding problems, MCQs, and test cases.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { problemAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import {
    BookOpen,
    Plus,
    Search,
    Code2,
    CheckCircle,
    Clock,
    HardDrive,
    Tag,
    ChevronRight,
    Filter,
    Edit,
    Trash2,
    Eye,
    X,
} from "lucide-react";

export default function ProblemsPage() {
    const user = useAuthStore((s) => s.user);
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [diffFilter, setDiffFilter] = useState("");
    const [showCreate, setShowCreate] = useState(false);

    // Form state for new problem
    const [form, setForm] = useState({
        title: "",
        slug: "",
        problem_type: "coding",
        difficulty: "medium",
        description: "",
        input_format: "",
        output_format: "",
        constraints: "",
        sample_input: "",
        sample_output: "",
        time_limit_ms: 2000,
        memory_limit_kb: 262144,
        allowed_languages: ["python", "cpp", "java", "javascript"],
        tags: [] as string[],
    });
    const [tagInput, setTagInput] = useState("");

    const { data, isLoading } = useQuery({
        queryKey: ["problems", diffFilter],
        queryFn: () => problemAPI.list({ difficulty: diffFilter || undefined }),
        select: (res) => res.data,
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => problemAPI.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["problems"] });
            setShowCreate(false);
            setForm({
                title: "", slug: "", problem_type: "coding", difficulty: "medium",
                description: "", input_format: "", output_format: "", constraints: "",
                sample_input: "", sample_output: "", time_limit_ms: 2000,
                memory_limit_kb: 262144, allowed_languages: ["python", "cpp", "java", "javascript"],
                tags: [],
            });
        },
    });

    const problems = (data || []).filter((p: any) =>
        !search || p.title.toLowerCase().includes(search.toLowerCase())
    );

    const difficultyBadge = (d: string) => {
        const map: Record<string, { color: string; bg: string }> = {
            easy: { color: "#10b981", bg: "rgba(16,185,129,0.12)" },
            medium: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
            hard: { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
        };
        return map[d] || map.medium;
    };

    const handleCreate = () => {
        const slug = form.slug || form.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        createMutation.mutate({ ...form, slug });
    };

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <BookOpen size={24} style={{ color: "var(--primary)" }} />
                        Problems
                    </h1>
                    <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                        Manage coding problems, test cases, and MCQs
                    </p>
                </div>
                <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm">
                    <Plus size={16} />
                    New Problem
                </button>
            </div>

            {/* Filters */}
            <div className="glass-card p-4 flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                    <input
                        className="input-field pl-9"
                        placeholder="Search problems..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    {["", "easy", "medium", "hard"].map((d) => (
                        <button
                            key={d}
                            onClick={() => setDiffFilter(d)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${diffFilter === d ? "text-white" : ""}`}
                            style={{
                                background: diffFilter === d ? "var(--primary)" : "var(--bg-card-hover)",
                                color: diffFilter === d ? "white" : "var(--text-secondary)",
                            }}
                        >
                            {d || "All"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Problems List */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="glass-card p-5 animate-pulse h-24" style={{ background: "var(--bg-card-hover)" }} />
                    ))}
                </div>
            ) : problems.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Code2 size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
                    <h3 className="text-lg font-semibold mb-1">No problems found</h3>
                    <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                        Create your first coding problem to get started.
                    </p>
                    <button onClick={() => setShowCreate(true)} className="btn-primary inline-flex items-center gap-2 text-sm">
                        <Plus size={16} /> Create Problem
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {problems.map((p: any) => {
                        const badge = difficultyBadge(p.difficulty);
                        return (
                            <div key={p.id} className="glass-card p-5 flex items-center gap-4 hover:bg-white/[0.02] transition-all cursor-pointer group">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ background: badge.bg }}>
                                    <Code2 size={18} style={{ color: badge.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold">{p.title}</h3>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                                            style={{ color: badge.color, background: badge.bg }}>
                                            {p.difficulty}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                                            style={{ color: "var(--text-muted)", background: "var(--bg-card-hover)" }}>
                                            {p.problem_type}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                                        <span className="flex items-center gap-1"><Clock size={12} />{p.time_limit_ms}ms</span>
                                        <span className="flex items-center gap-1"><HardDrive size={12} />{(p.memory_limit_kb / 1024).toFixed(0)}MB</span>
                                        {p.tags?.length > 0 && (
                                            <span className="flex items-center gap-1"><Tag size={12} />{p.tags.join(", ")}</span>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-muted)" }} />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Problem Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowCreate(false)}>
                    <div className="glass-card w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold">Create New Problem</h2>
                            <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-white/10"><X size={18} /></button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Title</label>
                                <input className="input-field" placeholder="Two Sum" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Difficulty</label>
                                <select className="input-field" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Description (Markdown)</label>
                            <textarea className="input-field min-h-[120px]" placeholder="Given an array of integers..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Input Format</label>
                                <textarea className="input-field min-h-[60px]" value={form.input_format} onChange={(e) => setForm({ ...form, input_format: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Output Format</label>
                                <textarea className="input-field min-h-[60px]" value={form.output_format} onChange={(e) => setForm({ ...form, output_format: e.target.value })} />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Constraints</label>
                            <textarea className="input-field" value={form.constraints} onChange={(e) => setForm({ ...form, constraints: e.target.value })} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Sample Input</label>
                                <textarea className="input-field font-mono text-sm" value={form.sample_input} onChange={(e) => setForm({ ...form, sample_input: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Sample Output</label>
                                <textarea className="input-field font-mono text-sm" value={form.sample_output} onChange={(e) => setForm({ ...form, sample_output: e.target.value })} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Time Limit (ms)</label>
                                <input type="number" className="input-field" value={form.time_limit_ms} onChange={(e) => setForm({ ...form, time_limit_ms: +e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Memory Limit (KB)</label>
                                <input type="number" className="input-field" value={form.memory_limit_kb} onChange={(e) => setForm({ ...form, memory_limit_kb: +e.target.value })} />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Tags</label>
                            <div className="flex gap-2 flex-wrap mb-2">
                                {form.tags.map((tag) => (
                                    <span key={tag} className="px-2 py-1 rounded-full text-xs flex items-center gap-1"
                                        style={{ background: "rgba(99,102,241,0.15)", color: "var(--primary-light)" }}>
                                        {tag}
                                        <button onClick={() => setForm({ ...form, tags: form.tags.filter((t) => t !== tag) })}><X size={10} /></button>
                                    </span>
                                ))}
                            </div>
                            <input className="input-field" placeholder="Type and press Enter" value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && tagInput.trim()) {
                                        e.preventDefault();
                                        setForm({ ...form, tags: [...form.tags, tagInput.trim()] });
                                        setTagInput("");
                                    }
                                }} />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1 text-sm py-2.5">Cancel</button>
                            <button onClick={handleCreate} disabled={!form.title || !form.description || createMutation.isPending}
                                className="btn-primary flex-1 text-sm py-2.5 disabled:opacity-50">
                                {createMutation.isPending ? "Creating..." : "Create Problem"}
                            </button>
                        </div>

                        {createMutation.isError && (
                            <p className="text-xs text-center" style={{ color: "var(--danger)" }}>
                                {(createMutation.error as any)?.response?.data?.detail || "Failed to create problem"}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
