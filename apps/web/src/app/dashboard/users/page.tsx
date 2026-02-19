"use client";
/**
 * CEAP — Admin User Management
 * Tabs: Pending Approvals, All Users, Access Keys, Students
 * Features: Edit modal, checkbox select/select-all, bulk actions, CSV import with dept picker
 */
import { useEffect, useState, useRef } from "react";
import { adminAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import {
    Users, CheckCircle, XCircle, Key, Upload, RefreshCw,
    UserPlus, Shield, GraduationCap, BookOpen, Trash2, RotateCcw,
    AlertTriangle, FileSpreadsheet, Copy, Check, Pencil, X,
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

    // Edit modal state
    const [editModal, setEditModal] = useState(false);
    const [editUser, setEditUser] = useState<ManagedUser | null>(null);
    const [editForm, setEditForm] = useState({ full_name: "", department: "", role: "", status: "", password: "" });

    // Checkbox selection — All Users tab
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    // Checkbox selection — Students tab
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());

    // Bulk action state
    const [bulkDeptModal, setBulkDeptModal] = useState(false);
    const [bulkDept, setBulkDept] = useState("");
    const [bulkTarget, setBulkTarget] = useState<"users" | "students">("users");

    // CSV import preview
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvDept, setCsvDept] = useState("");

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

    // ── Actions ──────────────────────────────────────────────
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

    // ── Edit User ────────────────────────────────────────────
    const openEditModal = (u: ManagedUser) => {
        setEditUser(u);
        setEditForm({ full_name: u.full_name, department: u.department || "", role: u.role, status: u.status, password: "" });
        setEditModal(true);
    };

    const saveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editUser) return;
        const updates: any = {};
        if (editForm.full_name !== editUser.full_name) updates.full_name = editForm.full_name;
        if (editForm.department !== (editUser.department || "")) updates.department = editForm.department;
        if (editForm.role !== editUser.role) updates.role = editForm.role;
        if (editForm.status !== editUser.status) updates.status = editForm.status;
        if (editForm.password) updates.password = editForm.password;

        if (Object.keys(updates).length === 0) { setEditModal(false); return; }

        try {
            const res = await adminAPI.updateUser(editUser.id, updates);
            setUsers(p => p.map(u => u.id === editUser.id ? { ...u, ...res.data } : u));
            setStudents(p => p.map(s => s.id === editUser.id ? { ...s, ...res.data } : s));
            setEditModal(false);
        } catch (err: any) { alert(err.response?.data?.detail || "Update failed"); }
    };

    // ── CSV Import with preview ──────────────────────────────
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCsvFile(file);
        setCsvDept("");
        setImportResult(null);
        if (fileRef.current) fileRef.current.value = "";
    };

    const cancelImport = () => {
        setCsvFile(null);
        setCsvDept("");
        if (fileRef.current) fileRef.current.value = "";
    };

    const confirmImport = async () => {
        if (!csvFile) return;
        setImporting(true);
        try {
            setImportResult((await adminAPI.importStudents(csvFile, csvDept || undefined)).data);
            loadStudents();
            setCsvFile(null);
        } catch (err: any) { setImportResult({ error: err.response?.data?.detail || "Import failed" }); }
        finally { setImporting(false); }
    };

    // ── Checkbox Selection ───────────────────────────────────
    const toggleUserSelect = (id: string) => {
        setSelectedUsers(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAllUsers = () => {
        if (selectedUsers.size === allUsers.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(allUsers.map(u => u.id)));
        }
    };

    const toggleStudentSelect = (id: string) => {
        setSelectedStudents(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAllStudents = () => {
        if (selectedStudents.size === students.length) {
            setSelectedStudents(new Set());
        } else {
            setSelectedStudents(new Set(students.map(s => s.id)));
        }
    };

    // ── Bulk Actions ─────────────────────────────────────────
    const bulkDeactivate = async (target: "users" | "students") => {
        const ids = target === "users" ? Array.from(selectedUsers) : Array.from(selectedStudents);
        if (!confirm(`Deactivate ${ids.length} selected user(s)?`)) return;
        try {
            await adminAPI.bulkUpdate({ user_ids: ids, action: "deactivate" });
            loadData();
            if (target === "students") loadStudents();
            setSelectedUsers(new Set());
            setSelectedStudents(new Set());
        } catch (err: any) { alert(err.response?.data?.detail || "Bulk action failed"); }
    };

    const bulkChangeDept = async () => {
        if (!bulkDept.trim()) return;
        const ids = bulkTarget === "users" ? Array.from(selectedUsers) : Array.from(selectedStudents);
        try {
            await adminAPI.bulkUpdate({ user_ids: ids, action: "update_department", department: bulkDept });
            loadData();
            if (bulkTarget === "students") loadStudents();
            setSelectedUsers(new Set());
            setSelectedStudents(new Set());
            setBulkDeptModal(false);
            setBulkDept("");
        } catch (err: any) { alert(err.response?.data?.detail || "Bulk action failed"); }
    };

    const pendingFaculty = users.filter(u => u.role === "faculty" && u.status === "pending");
    const allUsers = users.filter(u => u.id !== currentUser?.id);

    const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
        admin: { bg: "rgba(201,112,112,0.1)", color: "#C97070" },
        faculty: { bg: "rgba(200,149,108,0.1)", color: "#C8956C" },
        student: { bg: "rgba(107,158,120,0.1)", color: "#6B9E78" },
    };
    const STATUS_COLORS: Record<string, string> = { active: "#6B9E78", pending: "#D4956A", suspended: "#C97070" };

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

    // ── Bulk action bar component ────────────────────────────
    const BulkBar = ({ count, target }: { count: number; target: "users" | "students" }) => count > 0 ? (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg mb-4 animate-fade-in"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{count} selected</span>
            <div className="flex gap-2 ml-auto">
                <button onClick={() => { setBulkTarget(target); setBulkDeptModal(true); }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
                    style={{ background: "rgba(200,149,108,0.1)", color: "var(--primary)", border: "1px solid rgba(200,149,108,0.15)" }}>
                    Change Dept
                </button>
                <button onClick={() => bulkDeactivate(target)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
                    style={{ background: "rgba(201,112,112,0.08)", color: "#C97070", border: "1px solid rgba(201,112,112,0.12)" }}>
                    <Trash2 size={12} className="inline mr-1" />Deactivate
                </button>
                <button onClick={() => target === "users" ? setSelectedUsers(new Set()) : setSelectedStudents(new Set())}
                    className="text-xs font-medium px-2 py-1.5 rounded-md" style={{ color: "var(--text-muted)" }}>
                    Clear
                </button>
            </div>
        </div>
    ) : null;

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
                    { label: "Total Users", value: users.length, icon: Users, accent: "#C8956C" },
                    { label: "Pending", value: pendingFaculty.length, icon: AlertTriangle, accent: "#D4956A", warn: pendingFaculty.length > 0 },
                    { label: "Faculty", value: users.filter(u => u.role === "faculty").length, icon: BookOpen, accent: "#C8956C" },
                    { label: "Students", value: users.filter(u => u.role === "student").length, icon: GraduationCap, accent: "#6B9E78" },
                ].map(({ label, value, icon: Icon, accent, warn }) => (
                    <div key={label} className="card p-5" style={warn ? { borderColor: "rgba(212,149,106,0.3)" } : {}}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</span>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accent}15` }}>
                                <Icon size={15} style={{ color: accent }} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold tracking-tight" style={warn ? { color: "#D4956A" } : {}}>{value}</p>
                    </div>
                ))}
            </div>

            {/* ── Tabs ────────────────────────────────────────────── */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--surface-2)" }}>
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { setActiveTab(tab.key); setSelectedUsers(new Set()); setSelectedStudents(new Set()); }}
                        className="flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5"
                        style={{
                            background: activeTab === tab.key ? "var(--primary)" : "transparent",
                            color: activeTab === tab.key ? "#1A1918" : "var(--text-muted)",
                        }}
                    >
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                                style={{
                                    background: activeTab === tab.key ? "rgba(0,0,0,0.15)" : "rgba(212,149,106,0.15)",
                                    color: activeTab === tab.key ? "#1A1918" : "#D4956A",
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
                                onMouseEnter={e => (e.currentTarget.style.background = "rgba(245,240,235,0.01)")}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                                        style={{ background: "var(--primary)", color: "#1A1918" }}>
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
                                        style={{ background: "rgba(107,158,120,0.1)", color: "#6B9E78", border: "1px solid rgba(107,158,120,0.15)" }}>
                                        <CheckCircle size={13} /> Approve
                                    </button>
                                    <button onClick={() => rejectUser(u.id)} disabled={actionLoading === u.id}
                                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all"
                                        style={{ background: "rgba(201,112,112,0.08)", color: "#C97070", border: "1px solid rgba(201,112,112,0.12)" }}>
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
                <div>
                    <BulkBar count={selectedUsers.size} target="users" />
                    <div className="card overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                    <th className="text-left px-3 py-3" style={{ background: "var(--surface-2)", width: 40 }}>
                                        <input type="checkbox" checked={allUsers.length > 0 && selectedUsers.size === allUsers.length}
                                            onChange={toggleAllUsers}
                                            style={{ accentColor: "var(--primary)", width: 15, height: 15, cursor: "pointer" }} />
                                    </th>
                                    {["Name", "Email", "Role", "Status", "Dept", ""].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", background: "var(--surface-2)" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {allUsers.map(u => {
                                    const rs = ROLE_STYLES[u.role] || ROLE_STYLES.student;
                                    return (
                                        <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}
                                            onMouseEnter={e => { (e.currentTarget.style.background = "rgba(245,240,235,0.01)"); }}
                                            onMouseLeave={e => { (e.currentTarget.style.background = "transparent"); }}
                                        >
                                            <td className="px-3 py-3.5" style={{ width: 40 }}>
                                                <input type="checkbox" checked={selectedUsers.has(u.id)}
                                                    onChange={() => toggleUserSelect(u.id)}
                                                    style={{ accentColor: "var(--primary)", width: 15, height: 15, cursor: "pointer" }} />
                                            </td>
                                            <td className="px-4 py-3.5 font-medium text-sm">{u.full_name}</td>
                                            <td className="px-4 py-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>{u.email}</td>
                                            <td className="px-4 py-3.5">
                                                <span className="badge" style={{ background: rs.bg, color: rs.color }}>{u.role}</span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: STATUS_COLORS[u.status] || "var(--text-muted)" }}>
                                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[u.status] || "var(--text-muted)" }} />
                                                    {u.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-xs" style={{ color: "var(--text-muted)" }}>{u.department || "—"}</td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex gap-1.5">
                                                    <button onClick={() => openEditModal(u)} className="p-1.5 rounded-md transition-colors"
                                                        style={{ color: "var(--text-muted)" }}
                                                        onMouseEnter={e => (e.currentTarget.style.color = "var(--primary)")}
                                                        onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}>
                                                        <Pencil size={14} />
                                                    </button>
                                                    {u.status === "pending" && (
                                                        <button onClick={() => approveUser(u.id)} className="text-[11px] font-semibold px-2.5 py-1 rounded-md" style={{ background: "rgba(107,158,120,0.1)", color: "#6B9E78" }}>Approve</button>
                                                    )}
                                                    {u.status === "active" && (
                                                        <button onClick={() => deactivateUser(u.id)} className="p-1.5 rounded-md transition-colors"
                                                            style={{ color: "var(--text-muted)" }}
                                                            onMouseEnter={e => (e.currentTarget.style.color = "#C97070")}
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
                </div>
            )}

            {/* Access Keys */}
            {activeTab === "keys" && keys && (
                <div className="space-y-4 stagger-children">
                    {[
                        { label: "Student Join Code", key: "join_code" as const, desc: "Share this with students so they can register", icon: GraduationCap, accent: "#6B9E78" },
                        { label: "Faculty Key", key: "faculty_key" as const, desc: "Share privately with faculty — they still need admin approval", icon: BookOpen, accent: "#C8956C" },
                    ].map(({ label, key, desc, icon: Icon, accent }) => (
                        <div key={key} className="card p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accent}15` }}>
                                        <Icon size={18} style={{ color: accent }} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">{label}</p>
                                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{desc}</p>
                                    </div>
                                </div>
                                <button onClick={() => rotateKey(key)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                    style={{ background: "rgba(201,112,112,0.06)", color: "#C97070", border: "1px solid rgba(201,112,112,0.1)" }}>
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
                    <div className="card p-6">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(200,149,108,0.1)" }}>
                                    <FileSpreadsheet size={18} style={{ color: "var(--primary)" }} />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">Import Students from CSV</p>
                                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                        Columns: <span className="font-mono">roll_number</span>, name, email, password · Default pwd = roll no
                                    </p>
                                </div>
                            </div>
                            {!csvFile && (
                                <button onClick={() => fileRef.current?.click()} disabled={importing}
                                    className="btn-primary flex items-center gap-2 py-2.5 px-5">
                                    <Upload size={15} /> Upload CSV
                                </button>
                            )}
                            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
                        </div>

                        {/* CSV Preview step */}
                        {csvFile && !importing && (
                            <div className="mt-5 p-4 rounded-xl animate-fade-in" style={{ background: "var(--bg-dark)", border: "1px solid var(--border)" }}>
                                <div className="flex items-center gap-3 mb-4">
                                    <FileSpreadsheet size={16} style={{ color: "var(--primary)" }} />
                                    <span className="text-sm font-medium">{csvFile.name}</span>
                                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>({(csvFile.size / 1024).toFixed(1)} KB)</span>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
                                        Department (applied to all imported students)
                                    </label>
                                    <input className="input-field" placeholder="e.g. CSE, ECE, MECH" value={csvDept}
                                        onChange={e => setCsvDept(e.target.value)} />
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={cancelImport} className="btn-secondary py-2 px-5 text-sm flex items-center gap-1.5">
                                        <X size={14} /> Cancel
                                    </button>
                                    <button onClick={confirmImport} className="btn-primary py-2 px-5 text-sm flex items-center gap-1.5">
                                        <Upload size={14} /> Import
                                    </button>
                                </div>
                            </div>
                        )}

                        {importing && (
                            <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                                <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                Importing students...
                            </div>
                        )}

                        {importResult && (
                            <div className="mt-4 px-4 py-3 rounded-xl text-sm"
                                style={{
                                    background: importResult.error ? "rgba(201,112,112,0.06)" : "rgba(107,158,120,0.06)",
                                    border: `1px solid ${importResult.error ? "rgba(201,112,112,0.1)" : "rgba(107,158,120,0.1)"}`,
                                    color: importResult.error ? "#C97070" : "#6B9E78",
                                }}>
                                {importResult.error || `✓ Created ${importResult.inserted} accounts · Skipped ${importResult.skipped_duplicates} duplicates`}
                            </div>
                        )}
                    </div>

                    {/* Student list */}
                    <BulkBar count={selectedStudents.size} target="students" />
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
                                        <th className="text-left px-3 py-2.5" style={{ width: 40 }}>
                                            <input type="checkbox" checked={students.length > 0 && selectedStudents.size === students.length}
                                                onChange={toggleAllStudents}
                                                style={{ accentColor: "var(--primary)", width: 15, height: 15, cursor: "pointer" }} />
                                        </th>
                                        {["Roll No", "Name", "Email", "Dept", "Status", ""].map(h => (
                                            <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((s: any) => (
                                        <tr key={s.id || s.roll_number} style={{ borderTop: "1px solid var(--border)" }}>
                                            <td className="px-3 py-3" style={{ width: 40 }}>
                                                <input type="checkbox" checked={selectedStudents.has(s.id)}
                                                    onChange={() => toggleStudentSelect(s.id)}
                                                    style={{ accentColor: "var(--primary)", width: 15, height: 15, cursor: "pointer" }} />
                                            </td>
                                            <td className="px-4 py-3 font-mono font-semibold text-xs" style={{ color: "var(--primary)" }}>{s.roll_number}</td>
                                            <td className="px-4 py-3 text-sm">{s.full_name || s.name || "—"}</td>
                                            <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{s.email || "—"}</td>
                                            <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{s.department || "—"}</td>
                                            <td className="px-4 py-3">
                                                <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: STATUS_COLORS[s.status] || "var(--text-muted)" }}>
                                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[s.status] || "var(--text-muted)" }} />
                                                    {s.status || "active"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button onClick={() => openEditModal(s)} className="p-1.5 rounded-md transition-colors"
                                                    style={{ color: "var(--text-muted)" }}
                                                    onMouseEnter={e => (e.currentTarget.style.color = "var(--primary)")}
                                                    onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}>
                                                    <Pencil size={14} />
                                                </button>
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
                                <input className="input-field" type="password" placeholder="Temporary password (min 6)" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required minLength={6} />
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

            {/* ── Edit User Modal ─────────────────────────────────── */}
            {editModal && editUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
                    <div className="card w-full max-w-md p-7 animate-scale-in">
                        <h2 className="text-lg font-bold tracking-tight mb-1">Edit User</h2>
                        <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>{editUser.email}</p>
                        <form onSubmit={saveEdit} className="space-y-3.5">
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>Full Name</label>
                                <input className="input-field" value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>Department</label>
                                <input className="input-field" placeholder="e.g. CSE, ECE" value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>Role</label>
                                    <select className="input-field" value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                                        <option value="student">Student</option>
                                        <option value="faculty">Faculty</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>Status</label>
                                    <select className="input-field" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                                        <option value="active">Active</option>
                                        <option value="pending">Pending</option>
                                        <option value="suspended">Suspended</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>Reset Password</label>
                                <input className="input-field" type="password" placeholder="Leave blank to keep current" value={editForm.password}
                                    onChange={e => setEditForm({ ...editForm, password: e.target.value })} minLength={6} />
                                <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>Min 6 characters. Leave empty to keep existing password.</p>
                            </div>
                            <div className="flex gap-3 pt-3">
                                <button type="button" onClick={() => setEditModal(false)} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
                                <button type="submit" className="flex-1 btn-primary py-2.5 text-sm">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Bulk Change Department Modal ────────────────────── */}
            {bulkDeptModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
                    <div className="card w-full max-w-sm p-7 animate-scale-in">
                        <h2 className="text-lg font-bold tracking-tight mb-1">Change Department</h2>
                        <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
                            Update department for {bulkTarget === "users" ? selectedUsers.size : selectedStudents.size} selected user(s)
                        </p>
                        <div className="mb-5">
                            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>Department</label>
                            <input className="input-field" placeholder="e.g. CSE, ECE, MECH" value={bulkDept}
                                onChange={e => setBulkDept(e.target.value)} autoFocus />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setBulkDeptModal(false); setBulkDept(""); }} className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
                            <button onClick={bulkChangeDept} disabled={!bulkDept.trim()} className="flex-1 btn-primary py-2.5 text-sm"
                                style={{ opacity: bulkDept.trim() ? 1 : 0.5 }}>Update</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
