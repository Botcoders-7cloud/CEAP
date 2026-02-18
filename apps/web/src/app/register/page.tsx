"use client";
/**
 * CEAP — Register Page
 * Role-based registration: Student (roll + join code) or Faculty (faculty key + pending)
 */
import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Eye, EyeOff, GraduationCap, BookOpen, Clock, CheckCircle } from "lucide-react";

type Role = "student" | "faculty";

export default function RegisterPage() {
    const [role, setRole] = useState<Role>("student");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [rollNumber, setRollNumber] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [facultyKey, setFacultyKey] = useState("");
    const [department, setDepartment] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [pending, setPending] = useState(false);
    const { register, setTenantSlug } = useAuthStore();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            setTenantSlug("demo");
            await register({
                email,
                password,
                full_name: fullName,
                tenant_slug: "demo",
                role,
                roll_number: role === "student" ? rollNumber : undefined,
                join_code: role === "student" ? joinCode : undefined,
                faculty_key: role === "faculty" ? facultyKey : undefined,
                department: department || undefined,
            });
            if (role === "faculty") {
                setPending(true);
            } else {
                router.push("/dashboard");
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    /* ── Faculty Pending Screen ─────────────────────────── */
    if (pending) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="w-full max-w-md text-center animate-scale-in">
                    <div className="card p-10 card-glow">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                            style={{ background: "rgba(245,158,11,0.1)" }}>
                            <Clock size={28} style={{ color: "var(--warning)" }} />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Pending Approval</h2>
                        <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--text-secondary)" }}>
                            Your faculty account has been submitted. An admin will review
                            and approve your access shortly.
                        </p>
                        <Link href="/login" className="btn-secondary inline-flex items-center gap-2 py-2.5 px-6">
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex">
            {/* ── Left: Branding (desktop) ─────────────────────── */}
            <div className="hidden lg:flex lg:w-[48%] flex-col justify-between p-12 relative overflow-hidden"
                style={{ background: "var(--surface-1)" }}>
                <div style={{
                    position: "absolute", inset: 0, pointerEvents: "none",
                    background: `
                        radial-gradient(ellipse 70% 60% at 0% 0%, rgba(124,58,237,0.15) 0%, transparent 70%),
                        radial-gradient(ellipse 50% 50% at 100% 100%, rgba(6,182,212,0.08) 0%, transparent 70%)
                    `,
                }} />

                <div className="relative z-10">
                    <Link href="/" className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                            style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>C</div>
                        <span className="text-xl font-bold tracking-tight gradient-text">CEAP</span>
                    </Link>
                </div>

                <div className="relative z-10">
                    <h1 className="text-4xl xl:text-5xl font-extrabold leading-[1.15] tracking-tight mb-5">
                        Join Your<br />
                        <span className="gradient-text">Campus Community</span>
                    </h1>
                    <p className="text-base leading-relaxed max-w-md" style={{ color: "var(--text-secondary)" }}>
                        Register to access hackathons, coding contests, and campus events.
                        Students get instant access. Faculty accounts require admin approval.
                    </p>

                    {/* Role comparison */}
                    <div className="mt-10 space-y-3">
                        {[
                            { icon: GraduationCap, text: "Students — instant access with join code" },
                            { icon: BookOpen, text: "Faculty — access after admin approval" },
                        ].map(({ icon: Icon, text }) => (
                            <div key={text} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: "rgba(124,58,237,0.08)" }}>
                                    <Icon size={15} style={{ color: "var(--primary-light)" }} />
                                </div>
                                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative z-10">
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>© 2026 CEAP</p>
                </div>
            </div>

            {/* ── Right: Form ─────────────────────────────────── */}
            <div className="flex-1 flex items-center justify-center p-8 lg:p-16 relative">
                <div style={{
                    position: "absolute", top: 0, right: 0, width: "60%", height: "40%", pointerEvents: "none",
                    background: "radial-gradient(ellipse at 100% 0%, rgba(124,58,237,0.04), transparent 70%)",
                }} />

                <div className="w-full max-w-[420px] relative z-10 animate-fade-in">
                    {/* Mobile logo */}
                    <div className="lg:hidden mb-6">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                                style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>C</div>
                            <span className="text-lg font-bold gradient-text">CEAP</span>
                        </Link>
                    </div>

                    <h2 className="text-2xl font-bold tracking-tight mb-1">Create an account</h2>
                    <p className="text-sm mb-7" style={{ color: "var(--text-secondary)" }}>
                        Select your role and fill in the details
                    </p>

                    {/* ── Role Toggle ───────────────────────────── */}
                    <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: "var(--surface-2)" }}>
                        {([
                            { key: "student" as Role, label: "Student", icon: GraduationCap },
                            { key: "faculty" as Role, label: "Faculty", icon: BookOpen },
                        ]).map(opt => (
                            <button
                                key={opt.key}
                                onClick={() => setRole(opt.key)}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                                style={{
                                    background: role === opt.key ? "var(--primary)" : "transparent",
                                    color: role === opt.key ? "white" : "var(--text-muted)",
                                    boxShadow: role === opt.key ? "0 2px 8px rgba(124,58,237,0.3)" : "none",
                                }}
                            >
                                <opt.icon size={15} />
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {error && (
                        <div className="mb-5 p-3.5 rounded-xl text-sm flex items-start gap-2"
                            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "var(--danger)" }}>
                            <span className="shrink-0 mt-0.5">⚠️</span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>Full Name</label>
                            <input className="input-field" placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>Email</label>
                            <input className="input-field" type="email" placeholder="you@college.edu" value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>Password</label>
                            <div className="relative">
                                <input className="input-field" style={{ paddingRight: 44 }} type={showPass ? "text" : "password"} placeholder="Min 8 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
                                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded" style={{ color: "var(--text-muted)" }} tabIndex={-1}>
                                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        {/* Student-specific fields */}
                        {role === "student" && (
                            <>
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>Roll Number</label>
                                    <input className="input-field font-mono" placeholder="e.g. 24Q91A0401" value={rollNumber} onChange={e => setRollNumber(e.target.value)} required />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>Join Code</label>
                                    <input className="input-field font-mono tracking-widest" placeholder="Ask your admin for the code" value={joinCode} onChange={e => setJoinCode(e.target.value)} required />
                                </div>
                            </>
                        )}

                        {/* Faculty-specific field */}
                        {role === "faculty" && (
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>Faculty Key</label>
                                <input className="input-field font-mono tracking-widest" placeholder="Provided by admin" value={facultyKey} onChange={e => setFacultyKey(e.target.value)} required />
                            </div>
                        )}

                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>Department <span style={{ color: "var(--text-muted)" }}>(optional)</span></label>
                            <input className="input-field" placeholder="e.g. Computer Science" value={department} onChange={e => setDepartment(e.target.value)} />
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2.5 py-3 mt-2 disabled:opacity-50">
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <UserPlus size={17} />
                                    {role === "faculty" ? "Submit for Approval" : "Create Account"}
                                </>
                            )}
                        </button>
                    </form>

                    <div className="divider my-7" />

                    <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
                        Already have an account?{" "}
                        <Link href="/login" className="font-semibold transition-colors hover:underline" style={{ color: "var(--primary-light)" }}>
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
