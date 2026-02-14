"use client";
/**
 * CEAP — Create Event Page (Admin/Faculty)
 * Full event creation form with all configuration options.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { eventAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import {
    Calendar,
    ArrowLeft,
    Plus,
    Code2,
    Cpu,
    FileText,
    Users,
    Clock,
    Trophy,
    Save,
    CheckCircle,
    AlertTriangle,
} from "lucide-react";

const EVENT_TYPES = [
    { value: "coding_contest", label: "Coding Contest", icon: Code2, desc: "Algorithmic problems with auto-grading", color: "#6366f1" },
    { value: "hackathon", label: "Hackathon", icon: Cpu, desc: "Team-based project building", color: "#06b6d4" },
    { value: "mcq_exam", label: "MCQ Exam", icon: FileText, desc: "Multiple choice questions", color: "#f59e0b" },
    { value: "project", label: "Project", icon: Trophy, desc: "Long-form project submissions", color: "#10b981" },
];

export default function CreateEventPage() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);

    const [form, setForm] = useState({
        title: "",
        slug: "",
        description: "",
        event_type: "coding_contest",
        status: "draft",
        registration_start: "",
        registration_end: "",
        event_start: "",
        event_end: "",
        max_participants: 100,
        is_team_event: false,
        team_min_size: 1,
        team_max_size: 1,
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => eventAPI.create(data),
        onSuccess: () => {
            router.push("/dashboard/events");
        },
    });

    const handleSubmit = () => {
        const slug = form.slug || form.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const payload: any = { ...form, slug };

        // Convert dates
        if (payload.registration_start) payload.registration_start = new Date(payload.registration_start).toISOString();
        if (payload.registration_end) payload.registration_end = new Date(payload.registration_end).toISOString();
        if (payload.event_start) payload.event_start = new Date(payload.event_start).toISOString();
        if (payload.event_end) payload.event_end = new Date(payload.event_end).toISOString();

        // Remove empty string dates
        Object.keys(payload).forEach((k) => {
            if (payload[k] === "") delete payload[k];
        });

        createMutation.mutate(payload);
    };

    const selectedType = EVENT_TYPES.find((t) => t.value === form.event_type);

    return (
        <div className="animate-fade-in space-y-6 max-w-3xl">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold">Create Event</h1>
                    <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        Set up a new event for your campus
                    </p>
                </div>
            </div>

            {/* Event Type Selection */}
            <div className="glass-card p-6 space-y-4">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Event Type</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {EVENT_TYPES.map((type) => {
                        const isSelected = form.event_type === type.value;
                        return (
                            <div
                                key={type.value}
                                onClick={() => setForm({ ...form, event_type: type.value })}
                                className={`p-4 rounded-xl cursor-pointer text-center transition-all border ${isSelected ? "border-[var(--primary)]" : "border-transparent"}`}
                                style={{
                                    background: isSelected ? `${type.color}15` : "var(--bg-card-hover)",
                                    borderColor: isSelected ? type.color : "transparent",
                                }}
                            >
                                <type.icon size={24} className="mx-auto mb-2" style={{ color: isSelected ? type.color : "var(--text-muted)" }} />
                                <p className="text-xs font-semibold">{type.label}</p>
                                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{type.desc}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Basic Details */}
            <div className="glass-card p-6 space-y-4">
                <h3 className="text-sm font-semibold pb-3 border-b" style={{ color: "var(--text-secondary)", borderColor: "var(--border-color)" }}>
                    Event Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                        <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Event Title *</label>
                        <input className="input-field" placeholder="CodeBlitz 2026" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                    </div>

                    <div className="sm:col-span-2">
                        <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Description</label>
                        <textarea className="input-field min-h-[100px]" placeholder="Describe your event..."
                            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </div>
                </div>
            </div>

            {/* Schedule */}
            <div className="glass-card p-6 space-y-4">
                <h3 className="text-sm font-semibold pb-3 border-b flex items-center gap-2" style={{ color: "var(--text-secondary)", borderColor: "var(--border-color)" }}>
                    <Clock size={14} />
                    Schedule
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Registration Start</label>
                        <input type="datetime-local" className="input-field" value={form.registration_start}
                            onChange={(e) => setForm({ ...form, registration_start: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Registration End</label>
                        <input type="datetime-local" className="input-field" value={form.registration_end}
                            onChange={(e) => setForm({ ...form, registration_end: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Event Start</label>
                        <input type="datetime-local" className="input-field" value={form.event_start}
                            onChange={(e) => setForm({ ...form, event_start: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Event End</label>
                        <input type="datetime-local" className="input-field" value={form.event_end}
                            onChange={(e) => setForm({ ...form, event_end: e.target.value })} />
                    </div>
                </div>
            </div>

            {/* Participants */}
            <div className="glass-card p-6 space-y-4">
                <h3 className="text-sm font-semibold pb-3 border-b flex items-center gap-2" style={{ color: "var(--text-secondary)", borderColor: "var(--border-color)" }}>
                    <Users size={14} />
                    Participants
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Max Participants</label>
                        <input type="number" className="input-field" value={form.max_participants}
                            onChange={(e) => setForm({ ...form, max_participants: +e.target.value })} />
                    </div>
                    <div className="sm:col-span-2 flex items-end gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={form.is_team_event}
                                onChange={(e) => setForm({ ...form, is_team_event: e.target.checked, team_min_size: e.target.checked ? 2 : 1, team_max_size: e.target.checked ? 4 : 1 })}
                                className="w-4 h-4 rounded accent-[var(--primary)]" />
                            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Team Event</span>
                        </label>
                        {form.is_team_event && (
                            <>
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Min Size</label>
                                    <input type="number" className="input-field w-20" value={form.team_min_size}
                                        onChange={(e) => setForm({ ...form, team_min_size: +e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Max Size</label>
                                    <input type="number" className="input-field w-20" value={form.team_max_size}
                                        onChange={(e) => setForm({ ...form, team_max_size: +e.target.value })} />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="btn-secondary text-sm px-6 py-2.5">
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!form.title || createMutation.isPending}
                    className="btn-primary flex items-center gap-2 text-sm px-6 py-2.5 disabled:opacity-50"
                >
                    {createMutation.isPending ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Plus size={16} />
                    )}
                    {createMutation.isPending ? "Creating..." : "Create Event"}
                </button>
            </div>

            {createMutation.isError && (
                <div className="glass-card p-4 flex items-center gap-3" style={{ borderColor: "rgba(239,68,68,0.3)" }}>
                    <AlertTriangle size={16} style={{ color: "var(--danger)" }} />
                    <p className="text-sm" style={{ color: "var(--danger)" }}>
                        {(createMutation.error as any)?.response?.data?.detail || "Failed to create event. Please try again."}
                    </p>
                </div>
            )}
        </div>
    );
}
