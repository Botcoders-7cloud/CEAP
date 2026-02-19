"use client";
/**
 * CEAP — Settings Page
 * Profile, security (change password), organization, and notifications.
 */
import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { authAPI } from "@/lib/api";
import {
    Settings as SettingsIcon,
    Shield,
    Bell,
    Save,
    CheckCircle,
    User,
    Building2,
    Lock,
} from "lucide-react";

export default function SettingsPage() {
    const user = useAuthStore((s) => s.user);
    const [saved, setSaved] = useState(false);

    const [profile, setProfile] = useState({
        full_name: user?.full_name || "",
        email: user?.email || "",
        department: user?.department || "",
    });

    // Password change state
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [pwdLoading, setPwdLoading] = useState(false);
    const [pwdMsg, setPwdMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const [tenant, setTenant] = useState({
        name: "Demo University",
        slug: "demo",
        primary_color: "#C8956C",
        secondary_color: "#6B9E78",
        plan: "campus",
        max_events: 50,
        max_students: 1000,
    });

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwdMsg(null);
        if (newPassword.length < 6) {
            setPwdMsg({ type: "error", text: "New password must be at least 6 characters" });
            return;
        }
        if (newPassword !== confirmPassword) {
            setPwdMsg({ type: "error", text: "New passwords do not match" });
            return;
        }
        setPwdLoading(true);
        try {
            await authAPI.changePassword({ old_password: oldPassword, new_password: newPassword });
            setPwdMsg({ type: "success", text: "Password changed successfully" });
            setOldPassword(""); setNewPassword(""); setConfirmPassword("");
        } catch (err: any) {
            setPwdMsg({ type: "error", text: err.response?.data?.detail || "Failed to change password" });
        } finally { setPwdLoading(false); }
    };

    return (
        <div className="animate-fade-in space-y-6 max-w-3xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <SettingsIcon size={24} style={{ color: "var(--text-secondary)" }} />
                    Settings
                </h1>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    Platform configuration, branding, and account settings
                </p>
            </div>

            {/* Profile Section */}
            <div className="card p-6 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
                    <User size={16} style={{ color: "var(--primary)" }} />
                    Profile Settings
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Full Name</label>
                        <input className="input-field" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Email</label>
                        <input className="input-field" value={profile.email} disabled style={{ opacity: 0.6 }} />
                    </div>
                    <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Department</label>
                        <input className="input-field" value={profile.department} onChange={(e) => setProfile({ ...profile, department: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Role</label>
                        <input className="input-field capitalize" value={user?.role || ""} disabled style={{ opacity: 0.6 }} />
                    </div>
                </div>
            </div>

            {/* Change Password Section */}
            <div className="card p-6 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
                    <Lock size={16} style={{ color: "#C97070" }} />
                    Change Password
                </h3>
                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Current Password</label>
                        <input type="password" className="input-field" placeholder="••••••••" value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>New Password</label>
                            <input type="password" className="input-field" placeholder="Min 6 characters" value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
                        </div>
                        <div>
                            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Confirm New Password</label>
                            <input type="password" className="input-field" placeholder="Repeat new password" value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
                        </div>
                    </div>

                    {pwdMsg && (
                        <div className="px-4 py-2.5 rounded-lg text-sm"
                            style={{
                                background: pwdMsg.type === "success" ? "rgba(107,158,120,0.08)" : "rgba(201,112,112,0.08)",
                                border: `1px solid ${pwdMsg.type === "success" ? "rgba(107,158,120,0.15)" : "rgba(201,112,112,0.15)"}`,
                                color: pwdMsg.type === "success" ? "#6B9E78" : "#C97070",
                            }}>
                            {pwdMsg.text}
                        </div>
                    )}

                    <button type="submit" disabled={pwdLoading} className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2"
                        style={{ opacity: pwdLoading ? 0.7 : 1 }}>
                        <Shield size={14} />
                        {pwdLoading ? "Changing..." : "Change Password"}
                    </button>
                </form>
            </div>

            {/* Tenant/Branding Section (Admin only) */}
            {user?.role === "admin" && (
                <div className="card p-6 space-y-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
                        <Building2 size={16} style={{ color: "var(--primary)" }} />
                        Organization Settings
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Organization Name</label>
                            <input className="input-field" value={tenant.name} onChange={(e) => setTenant({ ...tenant, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Slug</label>
                            <input className="input-field" value={tenant.slug} disabled style={{ opacity: 0.6 }} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Max Events</label>
                            <input type="number" className="input-field" value={tenant.max_events} onChange={(e) => setTenant({ ...tenant, max_events: +e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Max Students</label>
                            <input type="number" className="input-field" value={tenant.max_students} onChange={(e) => setTenant({ ...tenant, max_students: +e.target.value })} />
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Preferences */}
            <div className="card p-6 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
                    <Bell size={16} style={{ color: "#D4956A" }} />
                    Notifications
                </h3>
                <div className="space-y-3">
                    {[
                        { label: "Email on new submission", key: "email_submissions", default: true },
                        { label: "Email on event registration", key: "email_registrations", default: true },
                        { label: "Email weekly digest", key: "email_digest", default: false },
                    ].map((pref) => (
                        <label key={pref.key} className="flex items-center justify-between cursor-pointer py-1">
                            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{pref.label}</span>
                            <input type="checkbox" defaultChecked={pref.default}
                                style={{ accentColor: "var(--primary)", width: 16, height: 16 }} />
                        </label>
                    ))}
                </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-3">
                <button onClick={handleSave} className="btn-primary flex items-center gap-2 text-sm px-6">
                    {saved ? <CheckCircle size={16} /> : <Save size={16} />}
                    {saved ? "Saved!" : "Save Changes"}
                </button>
                {saved && <span className="text-xs" style={{ color: "var(--success)" }}>Changes saved successfully</span>}
            </div>
        </div>
    );
}
