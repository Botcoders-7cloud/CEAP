"use client";
/**
 * CEAP — Register Page
 * Role-based registration: Student (join code + roll number) or Faculty (faculty key → pending approval)
 */
import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Eye, EyeOff, GraduationCap, BookOpen, Clock } from "lucide-react";

export default function RegisterPage() {
    const [role, setRole] = useState<"student" | "faculty">("student");
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [department, setDepartment] = useState("");
    const [rollNumber, setRollNumber] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [facultyKey, setFacultyKey] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [pendingApproval, setPendingApproval] = useState(false);
    const { register, setTenantSlug } = useAuthStore();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }
        if (role === "student" && !rollNumber.trim()) {
            setError("Roll number is required for students");
            return;
        }
        if (role === "student" && !joinCode.trim()) {
            setError("Join code is required for students");
            return;
        }
        if (role === "faculty" && !facultyKey.trim()) {
            setError("Faculty key is required for faculty registration");
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
                role,
                roll_number: role === "student" ? rollNumber.trim().toUpperCase() : undefined,
                join_code: role === "student" ? joinCode.trim() : undefined,
                faculty_key: role === "faculty" ? facultyKey.trim() : undefined,
            });

            if (role === "faculty") {
                setPendingApproval(true);
            } else {
                router.push("/dashboard");
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Faculty pending approval screen
    if (pendingApproval) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8">
                <div className="w-full max-w-md text-center">
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                        style={{ background: "rgba(99,102,241,0.15)" }}
                    >
                        <Clock size={32} style={{ color: "var(--primary)" }} />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Registration Submitted</h1>
                    <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                        Your faculty account is pending admin approval. You will be able to
                        login once an administrator approves your account.
                    </p>
                    <Link href="/login" className="btn-primary inline-flex items-center gap-2 px-6 py-2.5">
                        Back to Login
                    </Link>
                </div>
            </div>
        );
    }

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

                {/* Role Toggle */}
                <div className="flex rounded-xl p-1 mb-6" style={{ background: "var(--surface-2)" }}>
                    <button
                        type="button"
                        onClick={() => { setRole("student"); setError(""); }}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all"
                        style={{
                            background: role === "student" ? "var(--primary)" : "transparent",
                            color: role === "student" ? "white" : "var(--text-secondary)",
                        }}
                    >
                        <GraduationCap size={16} />
                        Student
                    </button>
                    <button
                        type="button"
                        onClick={() => { setRole("faculty"); setError(""); }}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all"
                        style={{
                            background: role === "faculty" ? "var(--primary)" : "transparent",
                            color: role === "faculty" ? "white" : "var(--text-secondary)",
                        }}
                    >
                        <BookOpen size={16} />
                        Faculty
                    </button>
                </div>

                {role === "faculty" && (
                    <div
                        className="mb-4 p-3 rounded-lg text-sm flex items-start gap-2"
                        style={{ background: "rgba(99,102,241,0.1)", color: "var(--primary)" }}
                    >
                        <Clock size={16} className="mt-0.5 shrink-0" />
                        Faculty accounts require admin approval before you can login.
                    </div>
                )}

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

                    {/* Student-specific fields */}
                    {role === "student" && (
                        <>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Roll Number</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="e.g. 24Q91A0401"
                                    value={rollNumber}
                                    onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Join Code</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Provided by your institution"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value)}
                                    required
                                />
                            </div>
                        </>
                    )}

                    {/* Faculty-specific field */}
                    {role === "faculty" && (
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Faculty Key</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Provided by admin (e.g. FAC-DEMO-2026)"
                                value={facultyKey}
                                onChange={(e) => setFacultyKey(e.target.value)}
                                required
                            />
                        </div>
                    )}

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
                                {role === "faculty" ? "Submit for Approval" : "Create Account"}
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
