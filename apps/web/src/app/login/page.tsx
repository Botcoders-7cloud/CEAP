"use client";
/**
 * CEAP — Login Page
 */
import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login, setTenantSlug } = useAuthStore();
    const router = useRouter();

    // For MVP, use a default tenant
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
            {/* Left panel - Branding */}
            <div
                className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12"
                style={{
                    background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
                }}
            >
                <div className="max-w-md text-center">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-6"
                        style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
                    >
                        C
                    </div>
                    <h1 className="text-4xl font-bold mb-4 gradient-text">
                        Campus Event &<br />Assessment Platform
                    </h1>
                    <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
                        Run hackathons. Host coding contests. Generate certificates.
                        All in one platform.
                    </p>
                    <div className="mt-10 flex gap-6 justify-center">
                        {["50+ Events", "10K Students", "99.9% Uptime"].map((stat) => (
                            <div key={stat} className="text-center">
                                <p className="text-sm font-semibold" style={{ color: "var(--primary-light)" }}>
                                    {stat.split(" ")[0]}
                                </p>
                                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                    {stat.split(" ").slice(1).join(" ")}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right panel - Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    <div className="lg:hidden mb-8 text-center">
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg mx-auto mb-3"
                            style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
                        >
                            C
                        </div>
                        <h1 className="text-2xl font-bold gradient-text">CEAP</h1>
                    </div>

                    <h2 className="text-2xl font-bold mb-1">Welcome back</h2>
                    <p className="mb-8" style={{ color: "var(--text-secondary)" }}>
                        Sign in to your account to continue
                    </p>

                    {error && (
                        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Email</label>
                            <input
                                type="email"
                                className="input-field"
                                placeholder="you@college.edu"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type={showPass ? "text" : "password"}
                                    className="input-field pr-10"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2"
                                    style={{ color: "var(--text-muted)" }}
                                >
                                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn size={18} />
                                    Sign In
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                        Don&apos;t have an account?{" "}
                        <Link href="/register" className="font-medium" style={{ color: "var(--primary)" }}>
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
