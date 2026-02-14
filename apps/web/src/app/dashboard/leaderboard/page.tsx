"use client";
/**
 * CEAP — Leaderboard Page
 * Shows event rankings with auto-refresh.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { eventAPI, submissionAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import {
    Trophy,
    Medal,
    Crown,
    Clock,
    Code2,
    ChevronDown,
    RefreshCw,
    Flame,
    Star,
} from "lucide-react";

export default function LeaderboardPage() {
    const user = useAuthStore((s) => s.user);
    const [selectedEventId, setSelectedEventId] = useState<string>("");

    // Fetch events to populate the selector
    const { data: eventsData } = useQuery({
        queryKey: ["events-for-leaderboard"],
        queryFn: () => eventAPI.list({ page_size: 50 }),
        select: (res) => res.data,
    });

    const events = eventsData?.events || [];

    // Auto-select first ongoing/completed event
    const activeEvent =
        selectedEventId ||
        events.find((e: any) => e.status === "ongoing")?.id ||
        events[0]?.id ||
        "";

    // Fetch leaderboard
    const {
        data: leaderboardData,
        isLoading,
        refetch,
        dataUpdatedAt,
    } = useQuery({
        queryKey: ["leaderboard", activeEvent],
        queryFn: () => submissionAPI.leaderboard(activeEvent),
        select: (res) => res.data,
        enabled: !!activeEvent,
        refetchInterval: 30000, // Auto-refresh every 30s
    });

    const entries = leaderboardData?.entries || [];
    const selectedEvent = events.find((e: any) => e.id === activeEvent);

    const getRankIcon = (rank: number) => {
        if (rank === 1)
            return (
                <Crown
                    size={20}
                    style={{ color: "#fbbf24" }}
                    className="drop-shadow-lg"
                />
            );
        if (rank === 2)
            return (
                <Medal
                    size={20}
                    style={{ color: "#94a3b8" }}
                    className="drop-shadow-lg"
                />
            );
        if (rank === 3)
            return (
                <Medal
                    size={20}
                    style={{ color: "#cd7f32" }}
                    className="drop-shadow-lg"
                />
            );
        return (
            <span
                className="text-sm font-bold w-5 text-center"
                style={{ color: "var(--text-muted)" }}
            >
                {rank}
            </span>
        );
    };

    const getRankBg = (rank: number) => {
        if (rank === 1)
            return "linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(245,158,11,0.06) 100%)";
        if (rank === 2)
            return "linear-gradient(135deg, rgba(148,163,184,0.12) 0%, rgba(100,116,139,0.06) 100%)";
        if (rank === 3)
            return "linear-gradient(135deg, rgba(205,127,50,0.12) 0%, rgba(180,83,9,0.06) 100%)";
        return "transparent";
    };

    const timeSinceUpdate = dataUpdatedAt
        ? `${Math.round((Date.now() - dataUpdatedAt) / 1000)}s ago`
        : "";

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Trophy size={24} style={{ color: "var(--warning)" }} />
                        Leaderboard
                    </h1>
                    <p
                        className="text-sm mt-1"
                        style={{ color: "var(--text-secondary)" }}
                    >
                        Live rankings updated every 30 seconds
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="btn-secondary flex items-center gap-2 text-sm"
                >
                    <RefreshCw size={14} />
                    Refresh
                </button>
            </div>

            {/* Event Selector */}
            <div className="glass-card p-4">
                <div className="flex items-center gap-4">
                    <label
                        className="text-sm font-medium"
                        style={{ color: "var(--text-secondary)" }}
                    >
                        Event:
                    </label>
                    <div className="relative flex-1 max-w-md">
                        <select
                            className="input-field pr-8 appearance-none cursor-pointer"
                            value={activeEvent}
                            onChange={(e) => setSelectedEventId(e.target.value)}
                        >
                            {events.map((event: any) => (
                                <option key={event.id} value={event.id}>
                                    {event.title}{" "}
                                    {event.status === "ongoing" ? "🔴 LIVE" : `(${event.status})`}
                                </option>
                            ))}
                            {events.length === 0 && (
                                <option value="">No events available</option>
                            )}
                        </select>
                        <ChevronDown
                            size={16}
                            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ color: "var(--text-muted)" }}
                        />
                    </div>
                    {timeSinceUpdate && (
                        <span
                            className="text-xs flex items-center gap-1"
                            style={{ color: "var(--text-muted)" }}
                        >
                            <Clock size={12} />
                            Updated {timeSinceUpdate}
                        </span>
                    )}
                </div>
            </div>

            {/* Leaderboard Table */}
            {isLoading ? (
                <div className="glass-card p-8">
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className="h-14 rounded-xl animate-pulse"
                                style={{ background: "var(--bg-card-hover)" }}
                            />
                        ))}
                    </div>
                </div>
            ) : entries.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Trophy
                        size={48}
                        className="mx-auto mb-4"
                        style={{ color: "var(--text-muted)" }}
                    />
                    <h3 className="text-lg font-semibold mb-1">No rankings yet</h3>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {selectedEvent
                            ? "Be the first to submit a solution!"
                            : "Select an event to view the leaderboard."}
                    </p>
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    {/* Table Header */}
                    <div
                        className="grid grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b"
                        style={{
                            color: "var(--text-muted)",
                            borderColor: "var(--border-color)",
                        }}
                    >
                        <div className="col-span-1 text-center">Rank</div>
                        <div className="col-span-4">Participant</div>
                        <div className="col-span-2 text-center">Score</div>
                        <div className="col-span-2 text-center">Solved</div>
                        <div className="col-span-2 text-center">Time</div>
                        <div className="col-span-1 text-center">Streak</div>
                    </div>

                    {/* Entries */}
                    <div className="divide-y" style={{ borderColor: "var(--border-color)" }}>
                        {entries.map((entry: any, index: number) => {
                            const rank = entry.rank || index + 1;
                            const isCurrentUser = entry.user_id === user?.id;

                            return (
                                <div
                                    key={entry.id || index}
                                    className={`grid grid-cols-12 gap-4 px-5 py-3.5 items-center transition-all duration-200 hover:bg-white/[0.02] ${isCurrentUser ? "ring-1 ring-inset" : ""
                                        }`}
                                    style={{
                                        background: isCurrentUser
                                            ? "rgba(99,102,241,0.08)"
                                            : getRankBg(rank),
                                        ringColor: isCurrentUser
                                            ? "var(--primary)"
                                            : "transparent",
                                    }}
                                >
                                    {/* Rank */}
                                    <div className="col-span-1 flex justify-center">
                                        {getRankIcon(rank)}
                                    </div>

                                    {/* Name */}
                                    <div className="col-span-4 flex items-center gap-3">
                                        <div
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                            style={{
                                                background:
                                                    rank <= 3
                                                        ? "linear-gradient(135deg, var(--primary), var(--accent))"
                                                        : "var(--bg-card-hover)",
                                                color:
                                                    rank <= 3
                                                        ? "white"
                                                        : "var(--text-secondary)",
                                            }}
                                        >
                                            {(entry.user_name || "U").charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium flex items-center gap-1.5">
                                                {entry.user_name || "Anonymous"}
                                                {isCurrentUser && (
                                                    <span
                                                        className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                                                        style={{
                                                            background: "rgba(99,102,241,0.2)",
                                                            color: "var(--primary-light)",
                                                        }}
                                                    >
                                                        YOU
                                                    </span>
                                                )}
                                            </p>
                                            {entry.department && (
                                                <p
                                                    className="text-xs"
                                                    style={{ color: "var(--text-muted)" }}
                                                >
                                                    {entry.department}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Score */}
                                    <div className="col-span-2 text-center">
                                        <span
                                            className="text-lg font-bold"
                                            style={{
                                                color:
                                                    rank === 1
                                                        ? "#fbbf24"
                                                        : rank <= 3
                                                            ? "var(--primary-light)"
                                                            : "var(--text-primary)",
                                            }}
                                        >
                                            {entry.total_score || 0}
                                        </span>
                                    </div>

                                    {/* Problems Solved */}
                                    <div className="col-span-2 text-center">
                                        <span className="flex items-center justify-center gap-1 text-sm">
                                            <Code2 size={14} style={{ color: "var(--success)" }} />
                                            {entry.problems_solved || 0}
                                        </span>
                                    </div>

                                    {/* Time */}
                                    <div className="col-span-2 text-center">
                                        <span
                                            className="text-sm"
                                            style={{ color: "var(--text-secondary)" }}
                                        >
                                            {entry.total_time
                                                ? `${Math.floor(entry.total_time / 60)}m ${entry.total_time % 60}s`
                                                : "-"}
                                        </span>
                                    </div>

                                    {/* Streak indicator */}
                                    <div className="col-span-1 flex justify-center">
                                        {(entry.problems_solved || 0) >= 3 ? (
                                            <Flame size={16} style={{ color: "#ef4444" }} />
                                        ) : (entry.problems_solved || 0) >= 2 ? (
                                            <Star size={16} style={{ color: "var(--warning)" }} />
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Your Position (if not in top visible) */}
            {entries.length > 0 && !entries.find((e: any) => e.user_id === user?.id) && (
                <div
                    className="glass-card p-4 flex items-center justify-between"
                    style={{
                        background: "rgba(99,102,241,0.05)",
                        borderColor: "rgba(99,102,241,0.2)",
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ background: "var(--primary)" }}
                        >
                            {user?.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="text-sm font-medium">{user?.full_name}</p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                You haven&apos;t submitted yet
                            </p>
                        </div>
                    </div>
                    <span className="text-sm font-medium" style={{ color: "var(--primary)" }}>
                        Submit a solution to appear here!
                    </span>
                </div>
            )}
        </div>
    );
}
