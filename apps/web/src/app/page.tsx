"use client";
/**
 * CEAP — Landing Page
 * Premium dark design with mesh gradients, floating elements, and stagger animations
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";
import { ArrowRight, Code2, Trophy, Award, Users, Zap, Shield, Sparkles } from "lucide-react";

const FEATURES = [
  { icon: Code2, title: "Code Execution", desc: "Built-in editor with Python, C++, Java & JS. Auto-graded against test cases in real-time.", accent: "#7c3aed" },
  { icon: Trophy, title: "Live Leaderboards", desc: "Rankings update as students submit — watch your team climb live during hackathons.", accent: "#06b6d4" },
  { icon: Award, title: "Instant Certificates", desc: "Auto-generated PDF certificates with unique QR codes for verification.", accent: "#10b981" },
  { icon: Users, title: "Team Formation", desc: "Form teams with invite codes. Built-in role assignment and team chat.", accent: "#f59e0b" },
  { icon: Shield, title: "Secure Judging", desc: "Sandboxed code execution, plagiarism detection, and anti-cheat rate limiting.", accent: "#ef4444" },
  { icon: Zap, title: "Multi-Tenant", desc: "Each college gets a branded portal. Full white-label with custom domains.", accent: "#8b5cf6" },
];

const METRICS = [
  { value: "50+", label: "Events Hosted" },
  { value: "10K+", label: "Students" },
  { value: "99.9%", label: "Uptime" },
  { value: "< 2s", label: "Judge Speed" },
];

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.push("/dashboard");
  }, [isLoading, isAuthenticated, router]);

  return (
    <div className="min-h-screen relative">
      {/* Mesh gradient background blobs */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: `
                    radial-gradient(ellipse 80% 60% at 20% 10%, rgba(124,58,237,0.08) 0%, transparent 70%),
                    radial-gradient(ellipse 60% 80% at 85% 70%, rgba(6,182,212,0.06) 0%, transparent 70%),
                    radial-gradient(ellipse 40% 40% at 50% 50%, rgba(124,58,237,0.03) 0%, transparent 60%)
                `,
      }} />

      {/* ── Navbar ──────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-16 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
            C
          </div>
          <span className="text-xl font-bold tracking-tight gradient-text">CEAP</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-primary py-2 px-5">
            Sign In
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 lg:px-16 pt-24 pb-20 lg:pt-36 lg:pb-28 text-center max-w-5xl mx-auto">
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-semibold tracking-wide uppercase"
            style={{ background: "rgba(124,58,237,0.08)", color: "var(--primary-light)", border: "1px solid rgba(124,58,237,0.15)" }}>
            <Sparkles size={12} />
            Built for modern campuses
          </div>
        </div>

        <h1 className="text-5xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6 animate-fade-up" style={{ animationDelay: "0.1s", opacity: 0 }}>
          Run Campus Events<br />
          <span className="gradient-text">Like Never Before</span>
        </h1>

        <p className="text-lg lg:text-xl max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-up"
          style={{ color: "var(--text-secondary)", animationDelay: "0.2s", opacity: 0 }}>
          Hackathons, coding contests, exams, project submissions — all in one platform.
          Auto-grading, live leaderboards, instant certificates.
        </p>

        <div className="flex gap-4 justify-center animate-fade-up" style={{ animationDelay: "0.3s", opacity: 0 }}>
          <Link href="/login" className="btn-primary py-3.5 px-8 text-base flex items-center gap-2">
            Sign In <ArrowRight size={18} />
          </Link>
        </div>

        {/* Metrics bar */}
        <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-3xl mx-auto animate-fade-up" style={{ animationDelay: "0.4s", opacity: 0 }}>
          {METRICS.map(m => (
            <div key={m.label} className="text-center">
              <p className="text-3xl lg:text-4xl font-bold gradient-text">{m.value}</p>
              <p className="text-xs uppercase tracking-widest mt-1.5 font-medium" style={{ color: "var(--text-muted)" }}>{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section className="relative z-10 px-6 lg:px-16 py-24" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "var(--primary-light)" }}>Features</p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">Everything You Need</h2>
            <p className="text-base mt-3 max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
              A complete toolkit for running world-class campus events.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <div key={feat.title} className="card card-glow p-6 group">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `${feat.accent}12` }}>
                    <Icon size={20} style={{ color: feat.accent }} />
                  </div>
                  <h3 className="font-semibold text-[15px] mb-2">{feat.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {feat.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 lg:px-16 py-24">
        <div className="max-w-3xl mx-auto text-center glass-card p-12 lg:p-16 card-glow" style={{ background: "var(--surface-1)" }}>
          <h2 className="text-2xl lg:text-3xl font-bold mb-3">Ready to transform your campus?</h2>
          <p className="mb-8" style={{ color: "var(--text-secondary)" }}>
            Start hosting hackathons and coding contests in minutes.
          </p>
          <Link href="/login" className="btn-primary py-3 px-10 text-base inline-flex items-center gap-2">
            Sign In to Get Started <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="relative z-10 px-6 lg:px-16 py-8 text-center text-sm" style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}>
        <div className="flex items-center justify-center gap-1.5">
          <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "var(--primary)" }}>C</div>
          <span>CEAP</span>
          <span className="mx-2">·</span>
          <span>© 2026 Campus Event & Assessment Platform</span>
        </div>
      </footer>
    </div>
  );
}
