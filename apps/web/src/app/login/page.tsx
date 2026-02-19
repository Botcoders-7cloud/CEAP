"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuthStore();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(email, password);
            router.push("/dashboard");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Login failed";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg-dark)" }}>

            {/* ── Left — Branding panel ── */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "48px 56px" }}
                className="hidden lg:flex">

                <Link href="/" className="flex items-center gap-2.5">
                    <div style={{ width: 32, height: 32, borderRadius: 7, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#1A1918" }}>C</div>
                    <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>CEAP</span>
                </Link>

                <div style={{ maxWidth: 380 }}>
                    <h1 style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.03em", color: "var(--text-primary)", marginBottom: 16 }}>
                        Campus Event &<br />Assessment Platform
                    </h1>
                    <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--text-secondary)" }}>
                        Streamline and elevate your campus engagement and event management.
                    </p>
                </div>

                <div style={{ display: "flex", gap: 32 }}>
                    {[
                        { val: "50+", label: "Events" },
                        { val: "10K", label: "Students" },
                        { val: "99.9%", label: "Uptime" },
                    ].map((m) => (
                        <div key={m.label}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{m.val}</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{m.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Right — Login form ── */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", background: "var(--bg-elevated)" }}>
                <div style={{ width: "100%", maxWidth: 380 }}>
                    <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)", marginBottom: 6 }}>
                        Welcome back
                    </h2>
                    <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 32 }}>
                        Sign in to your account to continue
                    </p>

                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "rgba(201, 112, 112, 0.1)", border: "1px solid rgba(201, 112, 112, 0.2)", color: "var(--danger)", fontSize: 13, marginBottom: 20 }}>
                                {error}
                            </div>
                        )}

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Email</label>
                            <input
                                type="email"
                                className="input-field"
                                placeholder="you@college.edu"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Password</label>
                            <div style={{ position: "relative" }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="input-field"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    style={{ paddingRight: 44 }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary"
                            style={{ width: "100%", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.7 : 1 }}
                        >
                            <LogIn size={16} />
                            {loading ? "Signing in..." : "Sign in"}
                        </button>
                    </form>

                    <div className="divider" style={{ margin: "28px 0" }} />

                    <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
                        All accounts are managed by your administrator.
                    </p>
                </div>
            </div>
        </div>
    );
}
