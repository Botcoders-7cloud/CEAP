"use client";
/**
 * CEAP — Settings Page (Admin)
 * Platform configuration, branding, and account settings.
 */
import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import {
    Settings as SettingsIcon,
    Palette,
    Shield,
    Bell,
    Globe,
    Key,
    Save,
    CheckCircle,
    User,
    Building2,
} from "lucide-react";

export default function SettingsPage() {
    const user = useAuthStore((s) => s.user);
    const [saved, setSaved] = useState(false);

    const [profile, setProfile] = useState({
        full_name: user?.full_name || "",
        email: user?.email || "",
        department: user?.department || "",
    });

    const [tenant, setTenant] = useState({
        name: "Demo University",
        slug: "demo",
        primary_color: "#6366f1",
        secondary_color: "#06b6d4",
        plan: "campus",
        max_events: 50,
        max_students: 1000,
    });

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
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
            <div className="glass-card p-6 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 pb-3 border-b" style={{ borderColor: "var(--border-color)" }}>
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

            {/* Tenant/Branding Section */}
            <div className="glass-card p-6 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 pb-3 border-b" style={{ borderColor: "var(--border-color)" }}>
                    <Building2 size={16} style={{ color: "var(--accent)" }} />
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
                        <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Primary Color</label>
                        <div className="flex items-center gap-2">
                            <input type="color" value={tenant.primary_color} onChange={(e) => setTenant({ ...tenant, primary_color: e.target.value })}
                                className="w-8 h-8 rounded-lg border-0 cursor-pointer" />
                            <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{tenant.primary_color}</span>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Secondary Color</label>
                        <div className="flex items-center gap-2">
                            <input type="color" value={tenant.secondary_color} onChange={(e) => setTenant({ ...tenant, secondary_color: e.target.value })}
                                className="w-8 h-8 rounded-lg border-0 cursor-pointer" />
                            <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{tenant.secondary_color}</span>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Max Events</label>
                        <input type="number" className="input-field" value={tenant.max_events} onChange={(e) => setTenant({ ...tenant, max_events: +e.target.value })} />
                    </div>
                    <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Max Students</label>
                        <input type="number" className="input-field" value={tenant.max_students} onChange={(e) => setTenant({ ...tenant, max_students: +e.target.value })} />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Current Plan</label>
                    <div className="flex gap-3">
                        {["starter", "campus", "university"].map((plan) => (
                            <div key={plan} className={`flex-1 p-3 rounded-xl text-center cursor-pointer transition-all border ${tenant.plan === plan ? "border-[var(--primary)]" : ""}`}
                                style={{
                                    background: tenant.plan === plan ? "rgba(99,102,241,0.1)" : "var(--bg-card-hover)",
                                    borderColor: tenant.plan === plan ? "var(--primary)" : "transparent",
                                }}
                                onClick={() => setTenant({ ...tenant, plan })}>
                                <p className="text-sm font-semibold capitalize">{plan}</p>
                                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                    {plan === "starter" ? "10 events" : plan === "campus" ? "50 events" : "Unlimited"}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Security Section */}
            <div className="glass-card p-6 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 pb-3 border-b" style={{ borderColor: "var(--border-color)" }}>
                    <Shield size={16} style={{ color: "#ef4444" }} />
                    Security
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Current Password</label>
                        <input type="password" className="input-field" placeholder="••••••••" />
                    </div>
                    <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>New Password</label>
                        <input type="password" className="input-field" placeholder="••••••••" />
                    </div>
                </div>
            </div>

            {/* Notification Preferences */}
            <div className="glass-card p-6 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 pb-3 border-b" style={{ borderColor: "var(--border-color)" }}>
                    <Bell size={16} style={{ color: "var(--warning)" }} />
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
                                className="w-4 h-4 rounded accent-[var(--primary)]" />
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
