"use client";
/**
 * CEAP — Login Page
 * Premium split-screen: animated branding left, clean form right
 */
import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, Eye, EyeOff, Sparkles } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login, setTenantSlug } = useAuthStore();
    const router = useRouter();

    const tenantSlug = "demo";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            setTenantSlug(tenantSlug);
            await login(email, password);
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.response?.data?.detail || "Login failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* ── Left: Branding ──────────────────────────────────── */}
            <div className="hidden lg:flex lg:w-[48%] flex-col justify-between p-12 relative overflow-hidden"
                style={{ background: "var(--surface-1)" }}>
                {/* Mesh gradient blobs */}
                <div style={{
                    position: "absolute", inset: 0, pointerEvents: "none",
                    background: `
                        radial-gradient(ellipse 70% 60% at 0% 0%, rgba(124,58,237,0.15) 0%, transparent 70%),
                        radial-gradient(ellipse 50% 50% at 100% 100%, rgba(6,182,212,0.08) 0%, transparent 70%)
                    `,
                }} />

                {/* Top — Logo */}
                <div className="relative z-10">
                    <Link href="/" className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                            style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
                            C
                        </div>
                        <span className="text-xl font-bold tracking-tight gradient-text">CEAP</span>
                    </Link>
                </div>

                {/* Center — Tagline */}
                <div className="relative z-10">
                    <h1 className="text-4xl xl:text-5xl font-extrabold leading-[1.15] tracking-tight mb-5">
                        Campus Event &<br />
                        <span className="gradient-text">Assessment Platform</span>
                    </h1>
                    <p className="text-base leading-relaxed max-w-md" style={{ color: "var(--text-secondary)" }}>
                        Host hackathons, run coding contests, auto-grade submissions,
                        and generate certificates — all in one place.
                    </p>

                    {/* Metrics */}
                    <div className="flex gap-8 mt-10">
                        {[
                            { val: "50+", label: "Events" },
                            { val: "10K", label: "Students" },
                            { val: "99.9%", label: "Uptime" },
                        ].map(m => (
                            <div key={m.label}>
                                <p className="text-2xl font-bold" style={{ color: "var(--primary-light)" }}>{m.val}</p>
                                <p className="text-xs uppercase tracking-widest mt-1" style={{ color: "var(--text-muted)" }}>{m.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom */}
                <div className="relative z-10">
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        © 2026 CEAP · Secure & Trusted
                    </p>
                </div>
            </div>

            {/* ── Right: Form ─────────────────────────────────────── */}
            <div className="flex-1 flex items-center justify-center p-8 lg:p-16 relative">
                {/* Subtle gradient in background */}
                <div style={{
                    position: "absolute", top: 0, right: 0, width: "60%", height: "40%", pointerEvents: "none",
                    background: "radial-gradient(ellipse at 100% 0%, rgba(124,58,237,0.04), transparent 70%)",
                }} />

                <div className="w-full max-w-[400px] relative z-10 animate-fade-in">
                    {/* Mobile logo */}
                    <div className="lg:hidden mb-8">
                        <Link href="/" className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                                style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
                                C
                            </div>
                            <span className="text-lg font-bold gradient-text">CEAP</span>
                        </Link>
                    </div>

                    <h2 className="text-2xl font-bold tracking-tight mb-1">Welcome back</h2>
                    <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
                        Sign in to continue to your dashboard
                    </p>

                    {error && (
                        <div className="mb-5 p-3.5 rounded-xl text-sm flex items-start gap-2"
                            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "var(--danger)" }}>
                            <span className="shrink-0 mt-0.5">⚠️</span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                                Email
                            </label>
                            <input
                                type="email"
                                className="input-field"
                                placeholder="you@college.edu"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPass ? "text" : "password"}
                                    className="input-field"
                                    style={{ paddingRight: 44 }}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors hover:bg-white/5"
                                    style={{ color: "var(--text-muted)" }}
                                    tabIndex={-1}
                                >
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2.5 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn size={17} />
                                    Sign In
                                </>
                            )}
                        </button>
                    </form>

                    <div className="divider my-8" />

                    <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
                        Don&apos;t have an account?{" "}
                        <Link href="/register" className="font-semibold transition-colors hover:underline" style={{ color: "var(--primary-light)" }}>
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
