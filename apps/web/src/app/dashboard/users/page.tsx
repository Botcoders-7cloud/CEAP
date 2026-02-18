"use client";
/**
 * CEAP — Admin User Management
 * Tabs: Pending Approvals, All Users, Access Keys, Students
 */
import { useEffect, useState, useRef } from "react";
import { adminAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import {
    Users, CheckCircle, XCircle, Key, Upload, RefreshCw,
    UserPlus, Shield, GraduationCap, BookOpen, Trash2, RotateCcw,
    AlertTriangle, FileSpreadsheet, Copy, Check,
} from "lucide-react";

interface ManagedUser {
    id: string; email: string; full_name: string; role: string;
    status: string; department?: string; roll_number?: string; created_at?: string;
}
interface Keys { join_code: string | null; faculty_key: string | null; }

export default function AdminUsersPage() {
    const { user: currentUser } = useAuthStore();
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [keys, setKeys] = useState<Keys | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"pending" | "all" | "keys" | "students">("pending");
    const [importResult, setImportResult] = useState<any>(null);
    const [importing, setImporting] = useState(false);
    const [createModal, setCreateModal] = useState(false);
    const [newUser, setNewUser] = useState({ email: "", password: "", full_name: "", role: "faculty", department: "" });
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [copied, setCopied] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const isAdmin = currentUser?.role === "admin";

    useEffect(() => { if (isAdmin) loadData(); }, [isAdmin]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [u, k] = await Promise.all([adminAPI.listUsers(), adminAPI.getKeys()]);
            setUsers(u.data); setKeys(k.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const loadStudents = async () => {
        try { setStudents((await adminAPI.listStudents()).data); } catch (e) { console.error(e); }
    };
    useEffect(() => { if (activeTab === "students") loadStudents(); }, [activeTab]);

    const approveUser = async (id: string) => {
        setActionLoading(id);
        try { await adminAPI.updateUser(id, { status: "active" }); setUsers(p => p.map(u => u.id === id ? { ...u, status: "active" } : u)); }
        finally { setActionLoading(null); }
    };

    const rejectUser = async (id: string) => {
        setActionLoading(id);
        try { await adminAPI.updateUser(id, { status: "suspended", is_active: false }); setUsers(p => p.map(u => u.id === id ? { ...u, status: "suspended" } : u)); }
        finally { setActionLoading(null); }
    };

    const deactivateUser = async (id: string) => {
        if (!confirm("Deactivate this user?")) return;
        setActionLoading(id);
        try { await adminAPI.deleteUser(id); setUsers(p => p.map(u => u.id === id ? { ...u, status: "suspended" } : u)); }
        finally { setActionLoading(null); }
    };

    const rotateKey = async (type: "join_code" | "faculty_key") => {
        if (!confirm(`Rotate the ${type === "join_code" ? "student join code" : "faculty key"}? The old key will stop working immediately.`)) return;
        const res = await adminAPI.rotateKeys({ rotate_join_code: type === "join_code", rotate_faculty_key: type === "faculty_key" });
        setKeys(res.data);
    };

    const copyKey = (val: string) => {
        navigator.clipboard.writeText(val);
        setCopied(val);
        setTimeout(() => setCopied(null), 2000);
    };

    const createUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await adminAPI.createUser(newUser);
            setCreateModal(false);
            setNewUser({ email: "", password: "", full_name: "", role: "faculty", department: "" });
            loadData();
        } catch (err: any) { alert(err.response?.data?.detail || "Failed to create user"); }
    };

    const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);
        try { setImportResult((await adminAPI.importStudents(file)).data); loadStudents(); }
        catch (err: any) { setImportResult({ error: err.response?.data?.detail || "Import failed" }); }
        finally { setImporting(false); if (fileRef.current) fileRef.current.value = ""; }
    };

    const pendingFaculty = users.filter(u => u.role === "faculty" && u.status === "pending");
    const allUsers = users.filter(u => u.id !== currentUser?.id);

    const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
        admin: { bg: "rgba(239,68,68,0.1)", color: "#ef4444" },
        faculty: { bg: "rgba(124,58,237,0.1)", color: "#a78bfa" },
        student: { bg: "rgba(16,185,129,0.1)", color: "#10b981" },
    };
    const STATUS_COLORS: Record<string, string> = { active: "#10b981", pending: "#f59e0b", suspended: "#ef4444" };

    if (!isAdmin) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center animate-fade-in">
                <Shield size={48} className="mb-4" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
                <p className="font-medium" style={{ color: "var(--text-muted)" }}>Admin access required</p>
            </div>
        );
    }

    const TABS = [
        { key: "pending" as const, label: "Pending", count: pendingFaculty.length },
        { key: "all" as const, label: "All Users" },
        { key: "keys" as const, label: "Access Keys" },
        { key: "students" as const, label: "Students" },
    ];

    return (
        <div className="animate-fade-in space-y-6">
            {/* ── Header ──────────────────────────────────────────── */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight">User Management</h1>
                    <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                        Manage users, approve faculty, and control access keys
                    </p>
                </div>
                <button onClick={() => setCreateModal(true)} className="btn-primary flex items-center gap-2 py-2.5 px-5">
                    <UserPlus size={15} /> Create User
                </button>
            </div>

            {/* ── Stats ───────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
                {[
                    { label: "Total Users", value: users.length, icon: Users, accent: "#7c3aed" },
                    { label: "Pending", value: pendingFaculty.length, icon: AlertTriangle, accent: "#f59e0b", warn: pendingFaculty.length > 0 },
                    { label: "Faculty", value: users.filter(u => u.role === "faculty").length, icon: BookOpen, accent: "#a78bfa" },
                    { label: "Students", value: users.filter(u => u.role === "student").length, icon: GraduationCap, accent: "#10b981" },
                ].map(({ label, value, icon: Icon, accent, warn }) => (
                    <div key={label} className="card card-glow p-5" style={warn ? { borderColor: "rgba(245,158,11,0.3)" } : {}}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</span>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accent}10` }}>
                                <Icon size={15} style={{ color: accent }} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold tracking-tight" style={warn ? { color: "#f59e0b" } : {}}>{value}</p>
                    </div>
                ))}
            </div>

            {/* ── Tabs ────────────────────────────────────────────── */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--surface-2)" }}>
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className="flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5"
                        style={{
                            background: activeTab === tab.key ? "var(--primary)" : "transparent",
                            color: activeTab === tab.key ? "white" : "var(--text-muted)",
                            boxShadow: activeTab === tab.key ? "0 2px 8px rgba(124,58,237,0.3)" : "none",
                        }}
                    >
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                                style={{
                                    background: activeTab === tab.key ? "rgba(255,255,255,0.2)" : "rgba(245,158,11,0.15)",
                                    color: activeTab === tab.key ? "white" : "#f59e0b",
                                }}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Tab Content ─────────────────────────────────────── */}

            {/* Pending */}
            {activeTab === "pending" && (
                <div className="card overflow-hidden">
                    {pendingFaculty.length === 0 ? (
                        <div className="py-16 text-center">
                            <CheckCircle size={36} className="mx-auto mb-3" style={{ color: "var(--success)", opacity: 0.3 }} />
                            <p className="font-medium text-sm" style={{ color: "var(--text-muted)" }}>No pending approvals</p>
                        </div>
                    ) : (
                        pendingFaculty.map((u, i) => (
                            <div key={u.id} className="flex items-center justify-between px-5 py-4 transition-colors"
                                style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
                                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.01)")}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                                        style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}>
                                        {u.full_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold">{u.full_name}</p>
                                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{u.email}</p>
                                        {u.department && <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{u.department}</p>}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => approveUser(u.id)} disabled={actionLoading === u.id}
                                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all"
                                        style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.15)" }}>
                                        <CheckCircle size={13} /> Approve
                                    </button>
                                    <button onClick={() => rejectUser(u.id)} disabled={actionLoading === u.id}
                                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all"
                                        style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.12)" }}>
                                        <XCircle size={13} /> Reject
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* All Users */}
            {activeTab === "all" && (
                <div className="card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                {["Name", "Email", "Role", "Status", "Dept", ""].map(h => (
                                    <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", background: "var(--surface-2)" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {allUsers.map(u => {
                                const rs = ROLE_STYLES[u.role] || ROLE_STYLES.student;
                                return (
                                    <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}
                                        onMouseEnter={e => { (e.currentTarget.style.background = "rgba(255,255,255,0.01)"); }}
                                        onMouseLeave={e => { (e.currentTarget.style.background = "transparent"); }}
                                    >
                                        <td className="px-5 py-3.5 font-medium text-sm">{u.full_name}</td>
                                        <td className="px-5 py-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>{u.email}</td>
                                        <td className="px-5 py-3.5">
                                            <span className="badge" style={{ background: rs.bg, color: rs.color }}>{u.role}</span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: STATUS_COLORS[u.status] || "var(--text-muted)" }}>
                                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[u.status] || "var(--text-muted)" }} />
                                                {u.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-xs" style={{ color: "var(--text-muted)" }}>{u.department || "—"}</td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex gap-1.5">
                                                {u.status === "pending" && (
                                                    <button onClick={() => approveUser(u.id)} className="text-[11px] font-semibold px-2.5 py-1 rounded-md" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>Approve</button>
                                                )}
                                                {u.status === "active" && (
                                                    <button onClick={() => deactivateUser(u.id)} className="p-1.5 rounded-md transition-colors"
                                                        style={{ color: "var(--text-muted)" }}
                                                        onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                                                        onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Access Keys */}
            {activeTab === "keys" && keys && (
                <div className="space-y-4 stagger-children">
                    {[
                        { label: "Student Join Code", key: "join_code" as const, desc: "Share this with students so they can register", icon: GraduationCap, accent: "#10b981" },
                        { label: "Faculty Key", key: "faculty_key" as const, desc: "Share privately with faculty — they still need admin approval", icon: BookOpen, accent: "#a78bfa" },
                    ].map(({ label, key, desc, icon: Icon, accent }) => (
                        <div key={key} className="card card-glow p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accent}10` }}>
                                        <Icon size={18} style={{ color: accent }} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">{label}</p>
                                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{desc}</p>
                                    </div>
                                </div>
                                <button onClick={() => rotateKey(key)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                    style={{ background: "rgba(239,68,68,0.06)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.1)" }}>
                                    <RotateCcw size={12} /> Rotate
                                </button>
                            </div>
                            <div className="mt-5 py-4 px-5 rounded-xl flex items-center justify-between"
                                style={{ background: "var(--bg-dark)", border: "1px solid var(--border)" }}>
                                {keys[key] ? (
                                    <>
                                        <span className="font-mono text-lg font-bold tracking-[0.25em]" style={{ color: accent }}>{keys[key]}</span>
                                        <button onClick={() => copyKey(keys[key]!)} className="p-2 rounded-lg transition-colors" style={{ color: "var(--text-muted)" }}>
                                            {copied === keys[key] ? <Check size={16} style={{ color: "var(--success)" }} /> : <Copy size={16} />}
                                        </button>
                                    </>
                                ) : (
                                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>Not set — click Rotate to generate</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Students */}
            {activeTab === "students" && (
                <div className="space-y-4">
                    {/* Import section */}
                    <div className="card card-glow p-6">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(6,182,212,0.1)" }}>
                                    <FileSpreadsheet size={18} style={{ color: "var(--accent)" }} />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">Import Students from CSV</p>
                                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                        Columns: <span className="font-mono">roll_number</span>, name, email, password · Default pwd = roll no
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => fileRef.current?.click()} disabled={importing}
                                className="btn-primary flex items-center gap-2 py-2.5 px-5">
                                {importing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload size={15} />}
                                {importing ? "Importing..." : "Upload CSV"}
                            </button>
                            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
                        </div>
                        {importResult && (
                            <div className="mt-4 px-4 py-3 rounded-xl text-sm"
                                style={{
                                    background: importResult.error ? "rgba(239,68,68,0.06)" : "rgba(16,185,129,0.06)",
                                    border: `1px solid ${importResult.error ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)"}`,
                                    color: importResult.error ? "#ef4444" : "#10b981",
                                }}>
                                {importResult.error || `✓ Created ${importResult.inserted} accounts · Skipped ${importResult.skipped_duplicates} duplicates`}
                            </div>
                        )}
                    </div>

                    {/* Student list */}
                    <div className="card overflow-hidden">
                        <div className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider flex items-center justify-between"
                            style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", background: "var(--surface-2)" }}>
                            <span>Student Accounts ({students.length})</span>
                        </div>
                        {students.length === 0 ? (
                            <div className="py-14 text-center">
                                <GraduationCap size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)", opacity: 0.2 }} />
                                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No students yet. Upload a CSV to create accounts.</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr style={{ background: "var(--surface-2)" }}>
                                        {["Roll No", "Name", "Email", "Status"].map(h => (
                                            <th key={h} className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((s: any) => (
                                        <tr key={s.id || s.roll_number} style={{ borderTop: "1px solid var(--border)" }}>
                                            <td className="px-5 py-3 font-mono font-semibold text-xs" style={{ color: "var(--primary-light)" }}>{s.roll_number}</td>
                                            <td className="px-5 py-3 text-sm">{s.full_name || s.name || "—"}</td>
                                            <td className="px-5 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{s.email || "—"}</td>
                                            <td className="px-5 py-3">
                                                <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: STATUS_COLORS[s.status] || "var(--text-muted)" }}>
                                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[s.status] || "var(--text-muted)" }} />
                                                    {s.status || "active"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* ── Create User Modal ───────────────────────────────── */}
            {createModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
                    <div className="card w-full max-w-md p-7 animate-scale-in">
                        <h2 className="text-lg font-bold tracking-tight mb-1">Create User</h2>
                        <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>Create a faculty or admin account — active immediately</p>
                        <form onSubmit={createUser} className="space-y-3.5">
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>Full Name</label>
                                <input className="input-field" placeholder="Full Name" value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>Email</label>
                                <input className="input-field" type="email" placeholder="Email address" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>Password</label>
                                <input className="input-field" type="password" placeholder="Temporary password (min 8)" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required minLength={8} />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>Department</label>
                                <input className="input-field" placeholder="Optional" value={newUser.department} onChange={e => setNewUser({ ...newUser, department: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>Role</label>
                                <select className="input-field" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                    <option value="faculty">Faculty</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-3">
                                <button type="button" onClick={() => setCreateModal(false)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
                                <button type="submit" className="flex-1 btn-primary py-2.5 text-sm">Create Account</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
