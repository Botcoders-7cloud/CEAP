"use client";
/**
 * CEAP — Register Page
 */
import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [department, setDepartment] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { register, setTenantSlug } = useAuthStore();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }
        setLoading(true);

        try {
            setTenantSlug("demo");
            await register({
                email,
                password,
                full_name: fullName,
                department: department || undefined,
            });
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.response?.data?.detail || "Registration failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-8">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg mx-auto mb-3"
                        style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
                    >
                        C
                    </div>
                    <h1 className="text-2xl font-bold">Create your account</h1>
                    <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                        Join your campus events and contests
                    </p>
                </div>

                {error && (
                    <div
                        className="mb-4 p-3 rounded-lg text-sm"
                        style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}
                    >
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Full Name</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="John Doe"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                        />
                    </div>

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
                        <label className="block text-sm font-medium mb-1.5">Department</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Computer Science (optional)"
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5">Password</label>
                        <div className="relative">
                            <input
                                type={showPass ? "text" : "password"}
                                className="input-field pr-10"
                                placeholder="Min 8 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
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
                                <UserPlus size={18} />
                                Create Account
                            </>
                        )}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                    Already have an account?{" "}
                    <Link href="/login" className="font-medium" style={{ color: "var(--primary)" }}>
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
