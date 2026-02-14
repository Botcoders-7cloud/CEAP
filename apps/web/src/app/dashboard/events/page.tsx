"use client";
/**
 * CEAP — Events List Page
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { eventAPI } from "@/lib/api";
import Link from "next/link";
import {
    Calendar,
    Users,
    Clock,
    Search,
    Filter,
    ArrowUpRight,
    Plus,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";

const EVENT_TYPE_LABELS: Record<string, string> = {
    hackathon: "Hackathon",
    coding_contest: "Coding Contest",
    mcq_exam: "MCQ Exam",
    project: "Project",
};

const STATUS_COLORS: Record<string, string> = {
    draft: "badge-warning",
    published: "badge-info",
    ongoing: "badge-success",
    completed: "badge-success",
    archived: "badge-danger",
};

export default function EventsPage() {
    const user = useAuthStore((s) => s.user);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const isAdmin = user?.role === "admin" || user?.role === "super_admin" || user?.role === "faculty";

    const { data, isLoading } = useQuery({
        queryKey: ["events", search, typeFilter],
        queryFn: () =>
            eventAPI.list({
                search: search || undefined,
                event_type: typeFilter || undefined,
                page_size: 20,
            }),
        select: (res) => res.data,
    });

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Events</h1>
                    <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                        Browse and join hackathons, coding contests, and more.
                    </p>
                </div>
                {isAdmin && (
                    <Link href="/dashboard/events/create" className="btn-primary flex items-center gap-2">
                        <Plus size={16} />
                        Create Event
                    </Link>
                )}
            </div>

            {/* Filters */}
            <div className="flex gap-3">
                <div className="flex-1 relative">
                    <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: "var(--text-muted)" }}
                    />
                    <input
                        type="text"
                        className="input-field pl-9"
                        placeholder="Search events..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="input-field w-48"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                >
                    <option value="">All Types</option>
                    {Object.entries(EVENT_TYPE_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>
                            {label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Events Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="glass-card p-5 h-48 animate-pulse"
                            style={{ background: "var(--bg-card)" }}
                        />
                    ))}
                </div>
            ) : data?.events?.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Calendar size={40} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
                    <p className="font-semibold">No events found</p>
                    <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                        {isAdmin ? "Create your first event to get started." : "Check back later for upcoming events."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data?.events?.map((event: any) => (
                        <Link
                            key={event.id}
                            href={`/dashboard/events/${event.slug}`}
                            className="glass-card p-5 group transition-all duration-200 flex flex-col"
                        >
                            {/* Event Type + Status */}
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: "rgba(99,102,241,0.1)", color: "var(--primary-light)" }}>
                                    {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                                </span>
                                <span className={`badge text-xs ${STATUS_COLORS[event.status] || ""}`}>
                                    {event.status}
                                </span>
                            </div>

                            {/* Title */}
                            <h3 className="font-semibold text-lg mb-2 group-hover:text-[var(--primary-light)] transition-colors">
                                {event.title}
                            </h3>

                            {/* Description */}
                            {event.description && (
                                <p
                                    className="text-sm line-clamp-2 mb-4 flex-1"
                                    style={{ color: "var(--text-secondary)" }}
                                >
                                    {event.description}
                                </p>
                            )}

                            {/* Footer */}
                            <div className="flex items-center justify-between mt-auto pt-3 border-t" style={{ borderColor: "var(--border-color)" }}>
                                <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                                    {event.event_start && (
                                        <span className="flex items-center gap-1">
                                            <Clock size={12} />
                                            {new Date(event.event_start).toLocaleDateString()}
                                        </span>
                                    )}
                                    {event.is_team_event && (
                                        <span className="flex items-center gap-1">
                                            <Users size={12} />
                                            Teams
                                        </span>
                                    )}
                                </div>
                                <ArrowUpRight
                                    size={14}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ color: "var(--primary)" }}
                                />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
