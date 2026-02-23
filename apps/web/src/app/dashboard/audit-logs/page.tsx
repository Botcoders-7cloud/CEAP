"use client";
/**
 * CEAP — Admin Audit Log Viewer
 * Shows a paginated, filterable list of all audit log entries.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsAPI } from "@/lib/api";
import {
    FileText, Search, ChevronLeft, ChevronRight,
    Loader2, Shield, LogIn, UserPlus, Settings2,
} from "lucide-react";

const ACTION_ICONS: Record<string, { icon: typeof LogIn; color: string }> = {
    "user.login": { icon: LogIn, color: "#10b981" },
    "user.created": { icon: UserPlus, color: "#3b82f6" },
    "user.faculty_join": { icon: UserPlus, color: "#7c3aed" },
    "event.published": { icon: FileText, color: "#f59e0b" },
    "exam.submitted": { icon: Shield, color: "#06b6d4" },
};

export default function AuditLogsPage() {
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState("");

    const { data, isLoading } = useQuery({
        queryKey: ["audit-logs", page, filter],
        queryFn: async () => {
            const params: any = { page, page_size: 30 };
            if (filter) params.action = filter;
            const { data } = await analyticsAPI.auditLogs(params);
            return data;
        },
    });

    const actionOptions = ["user.login", "user.created", "user.faculty_join", "event.published", "exam.submitted"];

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <FileText size={18} style={{ color: "var(--primary)" }} />
                    Audit Logs
                </h1>
                <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}
                    className="text-xs px-3 py-2 rounded-lg"
                    style={{ background: "var(--surface-2)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
                    <option value="">All Actions</option>
                    {actionOptions.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 size={20} className="animate-spin" style={{ color: "var(--primary)" }} />
                </div>
            ) : (
                <>
                    <div className="card overflow-hidden">
                        <table className="w-full text-xs">
                            <thead>
                                <tr style={{ background: "var(--surface-2)" }}>
                                    <th className="text-left p-3 font-semibold" style={{ color: "var(--text-muted)" }}>Action</th>
                                    <th className="text-left p-3 font-semibold" style={{ color: "var(--text-muted)" }}>User</th>
                                    <th className="text-left p-3 font-semibold" style={{ color: "var(--text-muted)" }}>Entity</th>
                                    <th className="text-left p-3 font-semibold" style={{ color: "var(--text-muted)" }}>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.logs?.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                                            No audit logs yet. Actions will appear here as users interact with the platform.
                                        </td>
                                    </tr>
                                )}
                                {data?.logs?.map((log: any) => {
                                    const ai = ACTION_ICONS[log.action] || { icon: Settings2, color: "var(--text-muted)" };
                                    const Icon = ai.icon;
                                    return (
                                        <tr key={log.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-md flex items-center justify-center"
                                                        style={{ background: `${ai.color}15` }}>
                                                        <Icon size={12} style={{ color: ai.color }} />
                                                    </div>
                                                    <span className="font-medium">{log.action}</span>
                                                </div>
                                            </td>
                                            <td className="p-3" style={{ color: "var(--text-secondary)" }}>
                                                {log.user_name}
                                            </td>
                                            <td className="p-3" style={{ color: "var(--text-muted)" }}>
                                                {log.entity_type && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px]"
                                                        style={{ background: "var(--surface-2)" }}>
                                                        {log.entity_type}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3" style={{ color: "var(--text-muted)" }}>
                                                {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                        <span>Total: {data?.total || 0} logs</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                                className="px-3 py-1.5 rounded-lg disabled:opacity-30"
                                style={{ background: "var(--surface-2)" }}>
                                <ChevronLeft size={12} />
                            </button>
                            <span className="px-3 py-1.5">Page {page}</span>
                            <button onClick={() => setPage((p) => p + 1)}
                                disabled={!data?.logs?.length || data.logs.length < 30}
                                className="px-3 py-1.5 rounded-lg disabled:opacity-30"
                                style={{ background: "var(--surface-2)" }}>
                                <ChevronRight size={12} />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
