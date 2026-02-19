"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";
import { ArrowRight, Code2, Trophy, Award, Users, Zap, Shield } from "lucide-react";

const FEATURES = [
  { icon: Code2, title: "Code Execution", desc: "Built-in editor with Python, C++, Java & JS. Auto-graded against test cases in real-time." },
  { icon: Trophy, title: "Live Leaderboards", desc: "Dynamic scoreboards that update as participants submit. Track progress across events." },
  { icon: Award, title: "Instant Certificates", desc: "Auto-generate verifiable certificates for participants and winners immediately." },
  { icon: Users, title: "Team Formation", desc: "Flexible team creation with role assignments and collaborative workspaces." },
  { icon: Zap, title: "Secure Judging", desc: "Private evaluation workflows for judges with role-based access control." },
  { icon: Shield, title: "Multi-Tenant", desc: "Each college gets an isolated instance with custom branding and settings." },
];

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) router.push("/dashboard");
  }, [isAuthenticated, router]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-dark)" }}>

      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-6 py-5 mx-auto" style={{ maxWidth: 1120 }}>
        <Link href="/" className="flex items-center gap-2.5">
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#1A1918" }}>C</div>
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>CEAP</span>
        </Link>
        <Link href="/login" className="btn-primary" style={{ padding: "8px 20px", fontSize: 13 }}>
          Sign In
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section className="text-center px-6 pt-20 pb-16 mx-auto" style={{ maxWidth: 720 }}>
        <h1 className="animate-fade-up" style={{ fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.035em", color: "var(--text-primary)", marginBottom: 20 }}>
          Run Campus Events<br />Like Never Before
        </h1>
        <p className="animate-fade-up" style={{ fontSize: 17, lineHeight: 1.6, color: "var(--text-secondary)", maxWidth: 520, margin: "0 auto 36px", animationDelay: "0.1s", opacity: 0 }}>
          Hackathons, coding contests, exams, and project submissions — all in one platform.
        </p>
        <div className="animate-fade-up" style={{ animationDelay: "0.2s", opacity: 0 }}>
          <Link href="/login" className="btn-primary" style={{ padding: "12px 32px", fontSize: 15, display: "inline-flex", alignItems: "center", gap: 8 }}>
            Sign In <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── Metrics ── */}
      <div className="animate-fade-up mx-auto px-6" style={{ maxWidth: 700, animationDelay: "0.3s", opacity: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "24px 0" }}>
          {[
            { val: "50+", label: "Institutions" },
            { val: "10K+", label: "Participants" },
            { val: "99.9%", label: "Uptime" },
            { val: "<2s", label: "Response" },
          ].map((m, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>{m.val}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <section className="px-6 py-20 mx-auto" style={{ maxWidth: 1000 }}>
        <div className="stagger-children" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="card" style={{ padding: "28px 24px" }}>
              <f.icon size={20} style={{ color: "var(--primary)", marginBottom: 16 }} />
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: "var(--text-primary)" }}>{f.title}</h3>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 pb-20 mx-auto text-center" style={{ maxWidth: 600 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 12, color: "var(--text-primary)" }}>
          Ready to transform your campus?
        </h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: 28, fontSize: 15 }}>
          Start hosting hackathons and coding contests in minutes.
        </p>
        <Link href="/login" className="btn-primary" style={{ padding: "12px 36px", fontSize: 15, display: "inline-flex", alignItems: "center", gap: 8 }}>
          Sign In to Get Started <ArrowRight size={16} />
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "20px 0", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>© 2026 CEAP. All rights reserved.</p>
      </footer>
    </div>
  );
}
