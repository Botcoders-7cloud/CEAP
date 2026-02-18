"use client";
/**
 * CEAP Admin — User Management Page
 * Approve faculty, manage users, rotate keys, import student CSV
 */
import { useEffect, useState, useRef } from "react";
import { adminAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import {
    Users, CheckCircle, XCircle, Key, Upload, RefreshCw,
    UserPlus, Shield, GraduationCap, BookOpen, Trash2, RotateCcw
} from "lucide-react";

interface User {
    id: string;
    email: string;
    full_name: string;
    role: string;
    status: string;
    department?: string;
    roll_number?: string;
    created_at?: string;
}

interface Keys {
    join_code: string | null;
    faculty_key: string | null;
}

export default function AdminUsersPage() {
    const { user: currentUser } = useAuthStore();
    const [users, setUsers] = useState<User[]>([]);
    const [keys, setKeys] = useState<Keys | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"pending" | "all" | "keys" | "students">("pending");
    const [importResult, setImportResult] = useState<any>(null);
    const [importing, setImporting] = useState(false);
    const [createModal, setCreateModal] = useState(false);
    const [newUser, setNewUser] = useState({ email: "", password: "", full_name: "", role: "faculty", department: "" });
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [students, setStudents] = useState<any[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);

    const isAdmin = currentUser?.role === "admin";

    useEffect(() => {
        if (!isAdmin) return;
        loadData();
    }, [isAdmin]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersRes, keysRes] = await Promise.all([
                adminAPI.listUsers(),
                adminAPI.getKeys(),
            ]);
            setUsers(usersRes.data);
            setKeys(keysRes.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const loadStudents = async () => {
        try {
            const res = await adminAPI.listStudents();
            setStudents(res.data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (activeTab === "students") loadStudents();
    }, [activeTab]);

    const approveUser = async (id: string) => {
        setActionLoading(id);
        try {
            await adminAPI.updateUser(id, { status: "active" });
            setUsers(prev => prev.map(u => u.id === id ? { ...u, status: "active" } : u));
        } finally { setActionLoading(null); }
    };

    const rejectUser = async (id: string) => {
        setActionLoading(id);
        try {
            await adminAPI.updateUser(id, { status: "suspended", is_active: false });
            setUsers(prev => prev.map(u => u.id === id ? { ...u, status: "suspended" } : u));
        } finally { setActionLoading(null); }
    };

    const deactivateUser = async (id: string) => {
        if (!confirm("Deactivate this user?")) return;
        setActionLoading(id);
        try {
            await adminAPI.deleteUser(id);
            setUsers(prev => prev.map(u => u.id === id ? { ...u, status: "suspended" } : u));
        } finally { setActionLoading(null); }
    };

    const rotateKey = async (type: "join_code" | "faculty_key") => {
        if (!confirm(`Rotate ${type === "join_code" ? "join code" : "faculty key"}? Old key will stop working immediately.`)) return;
        const res = await adminAPI.rotateKeys({
            rotate_join_code: type === "join_code",
            rotate_faculty_key: type === "faculty_key",
        });
        setKeys(res.data);
    };

    const createUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await adminAPI.createUser(newUser);
            setCreateModal(false);
            setNewUser({ email: "", password: "", full_name: "", role: "faculty", department: "" });
            loadData();
        } catch (err: any) {
            alert(err.response?.data?.detail || "Failed to create user");
        }
    };

    const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);
        try {
            const res = await adminAPI.importStudents(file);
            setImportResult(res.data);
            loadStudents();
        } catch (err: any) {
            setImportResult({ error: err.response?.data?.detail || "Import failed" });
        } finally {
            setImporting(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    const pendingFaculty = users.filter(u => u.role === "faculty" && u.status === "pending");
    const allUsers = users.filter(u => u.id !== currentUser?.id);

    const roleBadge = (role: string) => {
        const styles: Record<string, string> = {
            admin: "background:rgba(239,68,68,0.15);color:#ef4444",
            faculty: "background:rgba(99,102,241,0.15);color:#6366f1",
            student: "background:rgba(16,185,129,0.15);color:#10b981",
        };
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ ...(Object.fromEntries((styles[role] || "").split(";").map(s => s.split(":")).filter(a => a.length === 2))) }}>{role}</span>;
    };

    const statusBadge = (status: string) => {
        const colors: Record<string, string> = {
            active: "#10b981", pending: "#f59e0b", suspended: "#ef4444"
        };
        return <span className="text-xs font-medium" style={{ color: colors[status] || "#6b7280" }}>● {status}</span>;
    };

    if (!isAdmin) {
        return (
            <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>
                <Shield size={48} className="mx-auto mb-3 opacity-30" />
                <p>Admin access required</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">User Management</h1>
                    <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                        Manage users, approve faculty, and control access
                    </p>
                </div>
                <button
                    onClick={() => setCreateModal(true)}
                    className="btn-primary flex items-center gap-2 px-4 py-2"
                >
                    <UserPlus size={16} /> Create User
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                    { label: "Total Users", value: users.length, icon: Users },
                    { label: "Pending Approval", value: pendingFaculty.length, icon: RefreshCw, warn: pendingFaculty.length > 0 },
                    { label: "Faculty", value: users.filter(u => u.role === "faculty").length, icon: BookOpen },
                    { label: "Students", value: users.filter(u => u.role === "student").length, icon: GraduationCap },
                ].map(({ label, value, icon: Icon, warn }) => (
                    <div key={label} className="card p-4" style={warn ? { borderColor: "#f59e0b" } : {}}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
                            <Icon size={16} style={{ color: warn ? "#f59e0b" : "var(--text-muted)" }} />
                        </div>
                        <div className="text-2xl font-bold" style={{ color: warn ? "#f59e0b" : undefined }}>{value}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: "var(--surface-2)" }}>
                {([
                    { key: "pending", label: `Pending (${pendingFaculty.length})` },
                    { key: "all", label: "All Users" },
                    { key: "keys", label: "Access Keys" },
                    { key: "students", label: "Students" },
                ] as const).map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all"
                        style={{
                            background: activeTab === tab.key ? "var(--primary)" : "transparent",
                            color: activeTab === tab.key ? "white" : "var(--text-secondary)",
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Pending Faculty Tab */}
            {activeTab === "pending" && (
                <div className="card">
                    {pendingFaculty.length === 0 ? (
                        <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>
                            <CheckCircle size={40} className="mx-auto mb-2 opacity-30" />
                            <p>No pending approvals</p>
                        </div>
                    ) : (
                        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                            {pendingFaculty.map(u => (
                                <div key={u.id} className="p-4 flex items-center justify-between">
                                    <div>
                                        <div className="font-medium">{u.full_name}</div>
                                        <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{u.email}</div>
                                        {u.department && <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{u.department}</div>}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => approveUser(u.id)}
                                            disabled={actionLoading === u.id}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                                            style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}
                                        >
                                            <CheckCircle size={14} /> Approve
                                        </button>
                                        <button
                                            onClick={() => rejectUser(u.id)}
                                            disabled={actionLoading === u.id}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                                            style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
                                        >
                                            <XCircle size={14} /> Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* All Users Tab */}
            {activeTab === "all" && (
                <div className="card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                                {["Name", "Email", "Role", "Status", "Department", "Actions"].map(h => (
                                    <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-secondary)" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {allUsers.map(u => (
                                <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                    <td className="px-4 py-3 font-medium">{u.full_name}</td>
                                    <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{u.email}</td>
                                    <td className="px-4 py-3">{roleBadge(u.role)}</td>
                                    <td className="px-4 py-3">{statusBadge(u.status)}</td>
                                    <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>{u.department || "—"}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            {u.status === "pending" && (
                                                <button onClick={() => approveUser(u.id)} className="text-xs px-2 py-1 rounded" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                                                    Approve
                                                </button>
                                            )}
                                            {u.status === "active" && (
                                                <button onClick={() => deactivateUser(u.id)} className="text-xs px-2 py-1 rounded" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Keys Tab */}
            {activeTab === "keys" && keys && (
                <div className="space-y-4">
                    {[
                        { label: "Student Join Code", key: "join_code" as const, desc: "Students enter this when registering", icon: GraduationCap },
                        { label: "Faculty Key", key: "faculty_key" as const, desc: "Faculty enter this when registering (keep secret)", icon: BookOpen },
                    ].map(({ label, key, desc, icon: Icon }) => (
                        <div key={key} className="card p-5">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg" style={{ background: "rgba(99,102,241,0.1)" }}>
                                        <Icon size={18} style={{ color: "var(--primary)" }} />
                                    </div>
                                    <div>
                                        <div className="font-medium">{label}</div>
                                        <div className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>{desc}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => rotateKey(key)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm"
                                    style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
                                >
                                    <RotateCcw size={14} /> Rotate
                                </button>
                            </div>
                            <div className="mt-4 p-3 rounded-lg font-mono text-lg font-bold tracking-widest text-center"
                                style={{ background: "var(--surface-2)", color: "var(--primary)" }}>
                                {keys[key] || <span style={{ color: "var(--text-muted)", fontSize: "0.875rem", fontWeight: "normal" }}>Not set — click Rotate to generate</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Students Tab */}
            {activeTab === "students" && (
                <div className="space-y-4">
                    <div className="card p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-semibold">Import Students from CSV</h3>
                                <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                                    Upload a CSV with columns: <strong>roll_number</strong>, name, email, password.<br />
                                    Accounts are created automatically — students login directly, no sign-up needed.<br />
                                    <span style={{ color: "var(--text-muted)" }}>If no password column: default password = roll number. If no email: roll@tenant.ceap</span>
                                </p>
                            </div>
                            <button
                                onClick={() => fileRef.current?.click()}
                                disabled={importing}
                                className="btn-primary flex items-center gap-2 px-4 py-2"
                            >
                                {importing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Upload size={16} />}
                                {importing ? "Importing..." : "Upload CSV"}
                            </button>
                            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
                        </div>

                        {importResult && (
                            <div className="p-3 rounded-lg text-sm" style={{
                                background: importResult.error ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                                color: importResult.error ? "#ef4444" : "#10b981"
                            }}>
                                {importResult.error || `✓ Inserted: ${importResult.inserted}, Skipped (duplicates): ${importResult.skipped}`}
                            </div>
                        )}
                    </div>

                    <div className="card overflow-hidden">
                        <div className="px-4 py-3 font-medium" style={{ borderBottom: "1px solid var(--border)" }}>
                            Whitelisted Students ({students.length})
                        </div>
                        {students.length === 0 ? (
                            <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>
                                No students imported yet. Upload a CSV to get started.
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr style={{ background: "var(--surface-2)" }}>
                                        {["Roll Number", "Name", "Email", "Registered"].map(h => (
                                            <th key={h} className="text-left px-4 py-2 font-medium" style={{ color: "var(--text-secondary)" }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((s: any) => (
                                        <tr key={s.roll_number} style={{ borderTop: "1px solid var(--border)" }}>
                                            <td className="px-4 py-2 font-mono font-medium">{s.roll_number}</td>
                                            <td className="px-4 py-2">{s.name || "—"}</td>
                                            <td className="px-4 py-2" style={{ color: "var(--text-secondary)" }}>{s.email || "—"}</td>
                                            <td className="px-4 py-2">
                                                <span style={{ color: s.is_registered ? "#10b981" : "var(--text-muted)" }}>
                                                    {s.is_registered ? "✓ Yes" : "No"}
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

            {/* Create User Modal */}
            {createModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
                    <div className="card w-full max-w-md p-6">
                        <h2 className="text-lg font-bold mb-4">Create User</h2>
                        <form onSubmit={createUser} className="space-y-3">
                            <input className="input-field" placeholder="Full Name" value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} required />
                            <input className="input-field" type="email" placeholder="Email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
                            <input className="input-field" type="password" placeholder="Temporary Password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required minLength={8} />
                            <input className="input-field" placeholder="Department (optional)" value={newUser.department} onChange={e => setNewUser({ ...newUser, department: e.target.value })} />
                            <select className="input-field" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                <option value="faculty">Faculty</option>
                                <option value="admin">Admin</option>
                            </select>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setCreateModal(false)} className="flex-1 py-2 rounded-lg text-sm" style={{ background: "var(--surface-2)" }}>Cancel</button>
                                <button type="submit" className="flex-1 btn-primary py-2 text-sm">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
