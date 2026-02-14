"use client";
/**
 * CEAP — Problems Management Page
 * Lists all problems with filters, links to detail, and a polished Create modal.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { problemAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";
import {
    BookOpen,
    Plus,
    Search,
    Code2,
    Clock,
    HardDrive,
    Tag,
    ChevronRight,
    X,
    Loader2,
    CheckCircle,
    AlertTriangle,
} from "lucide-react";

export default function ProblemsPage() {
    const user = useAuthStore((s) => s.user);
    const queryClient = useQueryClient();
    const isAdmin =
        user?.role === "admin" ||
        user?.role === "super_admin" ||
        user?.role === "faculty";
    const [search, setSearch] = useState("");
    const [diffFilter, setDiffFilter] = useState("");
    const [showCreate, setShowCreate] = useState(false);

    // Form state
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
            resetForm();
        },
    });

    const resetForm = () =>
        setForm({
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
            tags: [],
        });

    const handleCreate = () => {
        const slug =
            form.slug ||
            form.title
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9-]/g, "");
        createMutation.mutate({ ...form, slug });
    };

    const problems = (data || []).filter(
        (p: any) =>
            !search || p.title.toLowerCase().includes(search.toLowerCase())
    );

    const diffBadge = (d: string) => {
        const m: Record<string, { color: string; bg: string }> = {
            easy: { color: "#10b981", bg: "rgba(16,185,129,0.12)" },
            medium: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
            hard: { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
        };
        return m[d] || m.medium;
    };

    const stats = {
        total: data?.length || 0,
        easy: (data || []).filter((p: any) => p.difficulty === "easy").length,
        medium: (data || []).filter((p: any) => p.difficulty === "medium").length,
        hard: (data || []).filter((p: any) => p.difficulty === "hard").length,
    };

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <BookOpen size={24} style={{ color: "var(--primary)" }} />
                        Problem Bank
                    </h1>
                    <p
                        className="text-sm mt-1"
                        style={{ color: "var(--text-secondary)" }}
                    >
                        {stats.total} problems — {stats.easy} easy, {stats.medium} medium,{" "}
                        {stats.hard} hard
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setShowCreate(true)}
                        className="btn-primary flex items-center gap-2 text-sm"
                    >
                        <Plus size={16} />
                        New Problem
                    </button>
                )}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: "Total", value: stats.total, color: "var(--primary)", icon: Code2 },
                    { label: "Easy", value: stats.easy, color: "#10b981", icon: CheckCircle },
                    { label: "Medium", value: stats.medium, color: "#f59e0b", icon: Clock },
                    { label: "Hard", value: stats.hard, color: "#ef4444", icon: AlertTriangle },
                ].map((s) => (
                    <div key={s.label} className="glass-card p-4">
                        <div className="flex items-center gap-1.5 mb-1">
                            <s.icon size={12} style={{ color: s.color }} />
                            <span
                                className="text-[10px] uppercase tracking-wider font-semibold"
                                style={{ color: "var(--text-muted)" }}
                            >
                                {s.label}
                            </span>
                        </div>
                        <p className="text-xl font-bold" style={{ color: s.color }}>
                            {s.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="glass-card p-4 flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: "var(--text-muted)" }}
                    />
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
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={{
                                background:
                                    diffFilter === d ? "var(--primary)" : "var(--bg-card-hover)",
                                color: diffFilter === d ? "white" : "var(--text-secondary)",
                                boxShadow:
                                    diffFilter === d ? "0 2px 8px rgba(99,102,241,0.3)" : "none",
                            }}
                        >
                            {d ? d.charAt(0).toUpperCase() + d.slice(1) : "All"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Problem List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2
                        size={28}
                        className="animate-spin"
                        style={{ color: "var(--primary)" }}
                    />
                </div>
            ) : problems.length === 0 ? (
                <div className="glass-card p-16 text-center">
                    <Code2
                        size={48}
                        className="mx-auto mb-4"
                        style={{ color: "var(--text-muted)" }}
                    />
                    <h3 className="text-lg font-semibold mb-1">No problems found</h3>
                    <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                        {search
                            ? "Try a different search term"
                            : "Create your first coding problem to get started."}
                    </p>
                    {isAdmin && !search && (
                        <button
                            onClick={() => setShowCreate(true)}
                            className="btn-primary inline-flex items-center gap-2 text-sm"
                        >
                            <Plus size={16} /> Create Problem
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {problems.map((p: any, i: number) => {
                        const badge = diffBadge(p.difficulty);
                        return (
                            <Link
                                key={p.id}
                                href={`/dashboard/problems/${p.id}`}
                                className="glass-card p-5 flex items-center gap-4 hover:bg-white/[0.03] transition-all group block"
                                style={{ textDecoration: "none" }}
                            >
                                {/* Number badge */}
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                                    style={{ background: badge.bg, color: badge.color }}
                                >
                                    {i + 1}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-sm font-semibold">{p.title}</h3>
                                        <span
                                            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                                            style={{ color: badge.color, background: badge.bg }}
                                        >
                                            {p.difficulty}
                                        </span>
                                        <span
                                            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                                            style={{
                                                color: "var(--text-muted)",
                                                background: "var(--bg-card-hover)",
                                            }}
                                        >
                                            {p.problem_type}
                                        </span>
                                    </div>
                                    <div
                                        className="flex items-center gap-4 mt-1 text-xs"
                                        style={{ color: "var(--text-muted)" }}
                                    >
                                        <span className="flex items-center gap-1">
                                            <Clock size={11} />
                                            {p.time_limit_ms}ms
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <HardDrive size={11} />
                                            {(p.memory_limit_kb / 1024).toFixed(0)}MB
                                        </span>
                                        {p.tags?.length > 0 && (
                                            <span className="flex items-center gap-1">
                                                <Tag size={11} />
                                                {p.tags.join(", ")}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Arrow */}
                                <ChevronRight
                                    size={16}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                    style={{ color: "var(--text-muted)" }}
                                />
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* ─── Create Problem Modal ─── */}
            {showCreate && (
                <div
                    className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-8 px-4"
                    onClick={() => setShowCreate(false)}
                >
                    <div
                        className="w-full max-w-2xl rounded-2xl border shadow-2xl p-6 space-y-5"
                        style={{
                            background: "var(--bg-card)",
                            borderColor: "var(--border-color)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--border-color)" }}>
                            <div>
                                <h2 className="text-lg font-bold">Create New Problem</h2>
                                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                    Fill in the details to create a coding problem
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCreate(false)}
                                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Title + Difficulty */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <label
                                    className="text-xs font-semibold mb-1.5 block uppercase tracking-wider"
                                    style={{ color: "var(--text-muted)" }}
                                >
                                    Title *
                                </label>
                                <input
                                    className="input-field"
                                    placeholder="e.g. Two Sum"
                                    value={form.title}
                                    onChange={(e) =>
                                        setForm({ ...form, title: e.target.value })
                                    }
                                />
                            </div>
                            <div>
                                <label
                                    className="text-xs font-semibold mb-1.5 block uppercase tracking-wider"
                                    style={{ color: "var(--text-muted)" }}
                                >
                                    Difficulty *
                                </label>
                                <select
                                    className="input-field"
                                    value={form.difficulty}
                                    onChange={(e) =>
                                        setForm({ ...form, difficulty: e.target.value })
                                    }
                                >
                                    <option value="easy">🟢 Easy</option>
                                    <option value="medium">🟡 Medium</option>
                                    <option value="hard">🔴 Hard</option>
                                </select>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label
                                className="text-xs font-semibold mb-1.5 block uppercase tracking-wider"
                                style={{ color: "var(--text-muted)" }}
                            >
                                Description *
                            </label>
                            <textarea
                                className="input-field min-h-[120px] font-mono text-sm"
                                placeholder="Describe the problem statement in detail..."
                                value={form.description}
                                onChange={(e) =>
                                    setForm({ ...form, description: e.target.value })
                                }
                            />
                        </div>

                        {/* I/O Format */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label
                                    className="text-xs font-semibold mb-1.5 block uppercase tracking-wider"
                                    style={{ color: "var(--text-muted)" }}
                                >
                                    Input Format
                                </label>
                                <textarea
                                    className="input-field min-h-[70px] text-sm"
                                    placeholder="Describe input format..."
                                    value={form.input_format}
                                    onChange={(e) =>
                                        setForm({ ...form, input_format: e.target.value })
                                    }
                                />
                            </div>
                            <div>
                                <label
                                    className="text-xs font-semibold mb-1.5 block uppercase tracking-wider"
                                    style={{ color: "var(--text-muted)" }}
                                >
                                    Output Format
                                </label>
                                <textarea
                                    className="input-field min-h-[70px] text-sm"
                                    placeholder="Describe output format..."
                                    value={form.output_format}
                                    onChange={(e) =>
                                        setForm({ ...form, output_format: e.target.value })
                                    }
                                />
                            </div>
                        </div>

                        {/* Constraints */}
                        <div>
                            <label
                                className="text-xs font-semibold mb-1.5 block uppercase tracking-wider"
                                style={{ color: "var(--text-muted)" }}
                            >
                                Constraints
                            </label>
                            <textarea
                                className="input-field min-h-[50px] font-mono text-sm"
                                placeholder="e.g. 1 ≤ n ≤ 10^5"
                                value={form.constraints}
                                onChange={(e) =>
                                    setForm({ ...form, constraints: e.target.value })
                                }
                            />
                        </div>

                        {/* Sample I/O */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label
                                    className="text-xs font-semibold mb-1.5 block uppercase tracking-wider"
                                    style={{ color: "var(--text-muted)" }}
                                >
                                    Sample Input
                                </label>
                                <textarea
                                    className="input-field font-mono text-sm min-h-[60px]"
                                    placeholder="4&#10;2 7 11 15&#10;9"
                                    value={form.sample_input}
                                    onChange={(e) =>
                                        setForm({ ...form, sample_input: e.target.value })
                                    }
                                />
                            </div>
                            <div>
                                <label
                                    className="text-xs font-semibold mb-1.5 block uppercase tracking-wider"
                                    style={{ color: "var(--text-muted)" }}
                                >
                                    Sample Output
                                </label>
                                <textarea
                                    className="input-field font-mono text-sm min-h-[60px]"
                                    placeholder="0 1"
                                    value={form.sample_output}
                                    onChange={(e) =>
                                        setForm({ ...form, sample_output: e.target.value })
                                    }
                                />
                            </div>
                        </div>

                        {/* Limits */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label
                                    className="text-xs font-semibold mb-1.5 block uppercase tracking-wider"
                                    style={{ color: "var(--text-muted)" }}
                                >
                                    Time Limit (ms)
                                </label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={form.time_limit_ms}
                                    onChange={(e) =>
                                        setForm({ ...form, time_limit_ms: +e.target.value })
                                    }
                                />
                            </div>
                            <div>
                                <label
                                    className="text-xs font-semibold mb-1.5 block uppercase tracking-wider"
                                    style={{ color: "var(--text-muted)" }}
                                >
                                    Memory Limit (KB)
                                </label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={form.memory_limit_kb}
                                    onChange={(e) =>
                                        setForm({ ...form, memory_limit_kb: +e.target.value })
                                    }
                                />
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <label
                                className="text-xs font-semibold mb-1.5 block uppercase tracking-wider"
                                style={{ color: "var(--text-muted)" }}
                            >
                                Tags
                            </label>
                            {form.tags.length > 0 && (
                                <div className="flex gap-2 flex-wrap mb-2">
                                    {form.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 font-medium"
                                            style={{
                                                background: "rgba(99,102,241,0.15)",
                                                color: "var(--primary-light)",
                                            }}
                                        >
                                            {tag}
                                            <button
                                                onClick={() =>
                                                    setForm({
                                                        ...form,
                                                        tags: form.tags.filter((t) => t !== tag),
                                                    })
                                                }
                                                className="hover:text-white transition-colors"
                                            >
                                                <X size={10} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <input
                                className="input-field"
                                placeholder="Type a tag and press Enter"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && tagInput.trim()) {
                                        e.preventDefault();
                                        if (!form.tags.includes(tagInput.trim())) {
                                            setForm({
                                                ...form,
                                                tags: [...form.tags, tagInput.trim()],
                                            });
                                        }
                                        setTagInput("");
                                    }
                                }}
                            />
                        </div>

                        {/* Error message */}
                        {createMutation.isError && (
                            <div
                                className="p-3 rounded-lg flex items-center gap-2 text-xs"
                                style={{
                                    background: "rgba(239,68,68,0.1)",
                                    color: "#ef4444",
                                }}
                            >
                                <AlertTriangle size={14} />
                                {(createMutation.error as any)?.response?.data?.detail ||
                                    "Failed to create problem"}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-2 border-t" style={{ borderColor: "var(--border-color)" }}>
                            <button
                                onClick={() => {
                                    setShowCreate(false);
                                    resetForm();
                                }}
                                className="btn-secondary flex-1 text-sm py-2.5"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={
                                    !form.title ||
                                    !form.description ||
                                    createMutation.isPending
                                }
                                className="btn-primary flex-1 text-sm py-2.5 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {createMutation.isPending ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={14} />
                                        Create Problem
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
