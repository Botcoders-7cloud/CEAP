"use client";
/**
 * CEAP — Reset Password Page
 * User sets a new password using the token from the email link.
 */
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { authAPI } from "@/lib/api";
import { Lock, Eye, EyeOff, CheckCircle, ArrowLeft, Loader2, AlertTriangle } from "lucide-react";

export default function ResetPasswordPage() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || "";

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    const passwordValid = password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password);
    const passwordsMatch = password === confirm && confirm.length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordValid || !passwordsMatch) return;
        setError("");
        setLoading(true);
        try {
            await authAPI.resetPassword({ token, new_password: password });
            setDone(true);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Invalid or expired reset link");
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg-page)" }}>
                <div className="card p-8 text-center max-w-md animate-fade-in">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                        style={{ background: "var(--pastel-amber)" }}>
                        <AlertTriangle size={24} style={{ color: "#B87514" }} />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Invalid Link</h2>
                    <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                        This password reset link is invalid or has expired. Please request a new one.
                    </p>
                    <Link href="/forgot-password" className="btn-primary inline-flex items-center gap-2 py-2.5 px-6">
                        Request New Link
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg-page)" }}>
            <div className="w-full max-w-[420px] animate-fade-in">
                <div className="card p-8">
                    {done ? (
                        <div className="text-center">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                                style={{ background: "var(--pastel-green)" }}>
                                <CheckCircle size={24} style={{ color: "#1A8A4A" }} />
                            </div>
                            <h2 className="text-xl font-bold mb-2">Password Reset!</h2>
                            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                                Your password has been changed. You can now log in with your new password.
                            </p>
                            <Link href="/login" className="btn-primary inline-flex items-center gap-2 py-2.5 px-6">
                                Go to Login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                                style={{ background: "var(--pastel-purple)" }}>
                                <Lock size={22} style={{ color: "#6C4DB5" }} />
                            </div>
                            <h2 className="text-xl font-bold mb-1">Set new password</h2>
                            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                                Choose a strong password for your account.
                            </p>

                            {error && (
                                <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: "var(--pastel-pink)", color: "#C53030" }}>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPass ? "text" : "password"}
                                            className="input-field pr-10"
                                            placeholder="Min 8 chars, 1 uppercase, 1 digit"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                        <button type="button" onClick={() => setShowPass(!showPass)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2"
                                            style={{ color: "var(--text-muted)" }}>
                                            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {/* Strength indicators */}
                                    {password.length > 0 && (
                                        <div className="mt-2 space-y-1 text-xs">
                                            <p style={{ color: password.length >= 8 ? "#1A8A4A" : "#ef4444" }}>
                                                {password.length >= 8 ? "✓" : "✗"} At least 8 characters
                                            </p>
                                            <p style={{ color: /[A-Z]/.test(password) ? "#1A8A4A" : "#ef4444" }}>
                                                {/[A-Z]/.test(password) ? "✓" : "✗"} One uppercase letter
                                            </p>
                                            <p style={{ color: /\d/.test(password) ? "#1A8A4A" : "#ef4444" }}>
                                                {/\d/.test(password) ? "✓" : "✗"} One digit
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Confirm Password</label>
                                    <input
                                        type="password"
                                        className="input-field"
                                        placeholder="Re-enter your password"
                                        value={confirm}
                                        onChange={(e) => setConfirm(e.target.value)}
                                        required
                                    />
                                    {confirm.length > 0 && !passwordsMatch && (
                                        <p className="mt-1 text-xs" style={{ color: "#ef4444" }}>Passwords don&apos;t match</p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !passwordValid || !passwordsMatch}
                                    className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                                    {loading ? "Resetting..." : "Reset Password"}
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
