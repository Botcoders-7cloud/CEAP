"use client";
/**
 * CEAP — Landing/Home page (redirects to login or dashboard)
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";
import { ArrowRight, Code2, Trophy, Award, Users, Zap, Shield } from "lucide-react";

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 lg:px-12 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
          >
            C
          </div>
          <span className="text-lg font-bold gradient-text">CEAP</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-secondary py-2">
            Sign In
          </Link>
          <Link href="/register" className="btn-primary py-2">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 lg:px-12 py-20 lg:py-32 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-sm" style={{ background: "rgba(99,102,241,0.1)", color: "var(--primary-light)" }}>
          <Zap size={14} />
          Built for modern campuses
        </div>
        <h1 className="text-4xl lg:text-6xl font-bold leading-tight mb-6">
          Run Campus Events
          <br />
          <span className="gradient-text">Like Never Before</span>
        </h1>
        <p className="text-lg max-w-2xl mx-auto mb-10" style={{ color: "var(--text-secondary)" }}>
          Hackathons, coding contests, exams, project submissions — all in one platform.
          Auto-grading, live leaderboards, instant certificates.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register" className="btn-primary py-3 px-8 text-base flex items-center gap-2">
            Start Free <ArrowRight size={18} />
          </Link>
          <Link href="/login" className="btn-secondary py-3 px-8 text-base">
            View Demo
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 lg:px-12 py-20 border-t" style={{ borderColor: "var(--border-color)" }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Code2, title: "Code Execution", desc: "Built-in code editor with Python, C++, Java, JS support. Auto-graded against test cases." },
              { icon: Trophy, title: "Live Leaderboards", desc: "Real-time rankings updated as students submit solutions." },
              { icon: Award, title: "Instant Certificates", desc: "Auto-generated certificates with QR verification codes." },
              { icon: Users, title: "Team Formation", desc: "Students create teams with invite codes. Built-in team management." },
              { icon: Shield, title: "Secure Judging", desc: "Sandboxed code execution with anti-cheat rate limiting." },
              { icon: Zap, title: "Multi-Tenant", desc: "Each college gets their own branded space. White-label ready." },
            ].map((feat) => {
              const Icon = feat.icon;
              return (
                <div key={feat.title} className="glass-card p-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(99,102,241,0.12)" }}>
                    <Icon size={20} style={{ color: "var(--primary)" }} />
                  </div>
                  <h3 className="font-semibold mb-2">{feat.title}</h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {feat.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 lg:px-12 py-8 border-t text-center text-sm" style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}>
        © 2026 CEAP. Campus Event & Assessment Platform.
      </footer>
    </div>
  );
}
