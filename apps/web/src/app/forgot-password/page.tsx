"use client";
/**
 * CEAP — Forgot Password Page
 * User enters email to receive a password reset link.
 */
import { useState } from "react";
import Link from "next/link";
import { authAPI } from "@/lib/api";
import { Mail, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await authAPI.forgotPassword({ email, tenant_slug: "demo" });
            setSent(true);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg-page)" }}>
            <div className="w-full max-w-[420px] animate-fade-in">
                <div className="card p-8">
                    {sent ? (
                        /* ── Success state ──────────────────── */
                        <div className="text-center">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                                style={{ background: "var(--pastel-green)" }}>
                                <CheckCircle size={24} style={{ color: "#1A8A4A" }} />
                            </div>
                            <h2 className="text-xl font-bold mb-2">Check your email</h2>
                            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                                If an account exists with <strong>{email}</strong>, we&apos;ve sent a password reset link.
                                Check your inbox (and spam folder).
                            </p>
                            <Link href="/login" className="btn-primary inline-flex items-center gap-2 py-2.5 px-6">
                                <ArrowLeft size={14} />
                                Back to Login
                            </Link>
                        </div>
                    ) : (
                        /* ── Form state ─────────────────────── */
                        <>
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                                style={{ background: "var(--pastel-purple)" }}>
                                <Mail size={22} style={{ color: "#6C4DB5" }} />
                            </div>
                            <h2 className="text-xl font-bold mb-1">Forgot password?</h2>
                            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                                Enter your email and we&apos;ll send you a link to reset your password.
                            </p>

                            {error && (
                                <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: "var(--pastel-pink)", color: "#C53030" }}>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Email</label>
                                    <input
                                        type="email"
                                        className="input-field"
                                        placeholder="you@college.edu"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || !email}
                                    className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                                    {loading ? "Sending..." : "Send Reset Link"}
                                </button>
                            </form>

                            <div className="mt-5 text-center">
                                <Link href="/login" className="text-sm font-medium hover:underline" style={{ color: "var(--text-secondary)" }}>
                                    <ArrowLeft size={12} className="inline mr-1" />
                                    Back to Login
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
