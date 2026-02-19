"use client";
/**
 * CEAP — Certificates Page
 * Students view and download THEIR OWN earned certificates (fetched from API).
 */
import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import {
    Award,
    Download,
    Calendar,
    Trophy,
    Shield,
    QrCode,
    CheckCircle,
    Loader2,
} from "lucide-react";
import { certificateAPI } from "@/lib/api";

interface CertificateData {
    id: string;
    event_id: string;
    event_title: string;
    certificate_type: string | null;
    rank: number | null;
    score: number | null;
    verification_id: string;
    issued_at: string;
    downloaded_at: string | null;
}

export default function CertificatesPage() {
    const user = useAuthStore((s) => s.user);
    const [generating, setGenerating] = useState<string | null>(null);
    const [previewCert, setPreviewCert] = useState<CertificateData | null>(null);
    const certRef = useRef<HTMLDivElement>(null);

    // Fetch certificates from API — each user gets THEIR OWN data
    const { data: certificates = [], isLoading } = useQuery({
        queryKey: ["my-certificates"],
        queryFn: async () => {
            const { data } = await certificateAPI.my();
            return data as CertificateData[];
        },
    });

    const getTypeLabel = (type: string | null) => {
        const map: Record<string, { label: string; color: string; bg: string }> = {
            winner: {
                label: "🏆 Winner",
                color: "#fbbf24",
                bg: "rgba(251,191,36,0.12)",
            },
            runner_up: {
                label: "🥈 Runner Up",
                color: "#94a3b8",
                bg: "rgba(148,163,184,0.12)",
            },
            participation: {
                label: "✅ Participation",
                color: "var(--success)",
                bg: "rgba(16,185,129,0.12)",
            },
        };
        return (
            map[type || "participation"] || {
                label: type || "Participation",
                color: "var(--text-muted)",
                bg: "rgba(100,116,139,0.12)",
            }
        );
    };

    const handleDownload = useCallback(
        async (cert: CertificateData) => {
            setGenerating(cert.id);

            try {
                const html2canvas = (await import("html2canvas")).default;
                const jsPDF = (await import("jspdf")).default;

                setPreviewCert(cert);
                await new Promise((resolve) => setTimeout(resolve, 300));

                if (certRef.current) {
                    const canvas = await html2canvas(certRef.current, {
                        scale: 2,
                        backgroundColor: "#0f0c29",
                        useCORS: true,
                    });

                    const imgData = canvas.toDataURL("image/png");
                    const pdf = new jsPDF({
                        orientation: "landscape",
                        unit: "px",
                        format: [canvas.width / 2, canvas.height / 2],
                    });

                    pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
                    pdf.save(`CEAP_Certificate_${cert.event_title.replace(/\s+/g, "_")}.pdf`);

                    // Mark as downloaded
                    try { await certificateAPI.markDownloaded(cert.id); } catch { }
                }
            } catch (err) {
                console.error("Certificate generation failed:", err);
            } finally {
                setGenerating(null);
                setPreviewCert(null);
            }
        },
        [user]
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 size={24} className="animate-spin" style={{ color: "var(--primary)" }} />
                <span className="ml-2 text-sm" style={{ color: "var(--text-muted)" }}>Loading certificates...</span>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Award size={24} style={{ color: "var(--success)" }} />
                    My Certificates
                </h1>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    Download and verify your earned certificates
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.12)" }}>
                        <Award size={20} style={{ color: "var(--success)" }} />
                    </div>
                    <div>
                        <p className="text-xl font-bold">{certificates.length}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total Certificates</p>
                    </div>
                </div>
                <div className="glass-card p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(251,191,36,0.12)" }}>
                        <Trophy size={20} style={{ color: "#fbbf24" }} />
                    </div>
                    <div>
                        <p className="text-xl font-bold">
                            {certificates.filter((c) => c.certificate_type === "winner" || c.certificate_type === "runner_up").length}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Awards Won</p>
                    </div>
                </div>
                <div className="glass-card p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.12)" }}>
                        <Shield size={20} style={{ color: "var(--primary)" }} />
                    </div>
                    <div>
                        <p className="text-xl font-bold">{certificates.length > 0 ? "Verified" : "N/A"}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>QR Verification</p>
                    </div>
                </div>
            </div>

            {/* Certificates Grid */}
            {certificates.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Award size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
                    <h3 className="text-lg font-semibold mb-1">No certificates yet</h3>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        Participate in events and complete them to earn certificates!
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {certificates.map((cert) => {
                        const typeInfo = getTypeLabel(cert.certificate_type);
                        return (
                            <div key={cert.id} className="glass-card overflow-hidden transition-all duration-200">
                                {/* Certificate Preview Header */}
                                <div
                                    className="p-5 relative overflow-hidden"
                                    style={{
                                        background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
                                        minHeight: 140,
                                    }}
                                >
                                    <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-10" style={{ background: "var(--primary)" }} />
                                    <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full opacity-10" style={{ background: "var(--accent)" }} />

                                    <div className="relative z-10">
                                        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                                            Certificate of {cert.certificate_type === "winner" || cert.certificate_type === "runner_up" ? "Achievement" : "Participation"}
                                        </p>
                                        <h3 className="text-lg font-bold text-white">{cert.event_title}</h3>
                                        <p className="text-sm mt-1 text-white/70">Awarded to {user?.full_name}</p>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="p-5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ color: typeInfo.color, background: typeInfo.bg }}>
                                            {typeInfo.label}
                                        </span>
                                        {cert.rank && (
                                            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                                                Rank #{cert.rank}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
                                        <span className="flex items-center gap-1">
                                            <Calendar size={12} />
                                            {new Date(cert.issued_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <QrCode size={12} />
                                            {cert.verification_id}
                                        </span>
                                    </div>

                                    {cert.score !== null && (
                                        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                                            <CheckCircle size={14} style={{ color: "var(--success)" }} />
                                            Score: {cert.score} points
                                        </div>
                                    )}

                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={() => handleDownload(cert)}
                                            disabled={generating === cert.id}
                                            className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2 disabled:opacity-50"
                                        >
                                            {generating === cert.id ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Download size={14} />
                                            )}
                                            {generating === cert.id ? "Generating..." : "Download PDF"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Hidden Certificate Template for PDF Generation */}
            {previewCert && (
                <div style={{ position: "fixed", left: "-9999px", top: 0 }}>
                    <div
                        ref={certRef}
                        style={{
                            width: 1100,
                            height: 780,
                            background: "linear-gradient(135deg, #0f0c29 0%, #302b63 30%, #24243e 70%, #0f0c29 100%)",
                            padding: 50,
                            fontFamily: "Inter, sans-serif",
                            position: "relative",
                            overflow: "hidden",
                        }}
                    >
                        {/* Border decoration */}
                        <div style={{ position: "absolute", inset: 20, border: "2px solid rgba(99,102,241,0.3)", borderRadius: 16, pointerEvents: "none" }} />
                        <div style={{ position: "absolute", inset: 25, border: "1px solid rgba(99,102,241,0.15)", borderRadius: 14, pointerEvents: "none" }} />

                        {/* Corner decorations */}
                        <div style={{ position: "absolute", top: 30, left: 30, width: 60, height: 60, borderTop: "3px solid #6366f1", borderLeft: "3px solid #6366f1", borderRadius: "8px 0 0 0" }} />
                        <div style={{ position: "absolute", top: 30, right: 30, width: 60, height: 60, borderTop: "3px solid #6366f1", borderRight: "3px solid #6366f1", borderRadius: "0 8px 0 0" }} />
                        <div style={{ position: "absolute", bottom: 30, left: 30, width: 60, height: 60, borderBottom: "3px solid #6366f1", borderLeft: "3px solid #6366f1", borderRadius: "0 0 0 8px" }} />
                        <div style={{ position: "absolute", bottom: 30, right: 30, width: 60, height: 60, borderBottom: "3px solid #6366f1", borderRight: "3px solid #6366f1", borderRadius: "0 0 8px 0" }} />

                        {/* Content */}
                        <div style={{ textAlign: "center", paddingTop: 40, position: "relative", zIndex: 1 }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: 18 }}>
                                    C
                                </div>
                                <span style={{ fontSize: 22, fontWeight: "bold", background: "linear-gradient(135deg, #6366f1, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                                    CEAP
                                </span>
                            </div>

                            <p style={{ fontSize: 14, letterSpacing: 6, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 10 }}>
                                Certificate of {previewCert.certificate_type === "winner" ? "Achievement" : "Participation"}
                            </p>

                            <h1 style={{ fontSize: 44, fontWeight: 800, color: "white", marginBottom: 8, lineHeight: 1.2 }}>
                                {previewCert.event_title}
                            </h1>

                            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", marginBottom: 30 }}>
                                This is to certify that
                            </p>

                            <h2 style={{ fontSize: 36, fontWeight: 700, color: "#818cf8", marginBottom: 10 }}>
                                {user?.full_name}
                            </h2>

                            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 40 }}>
                                has successfully {previewCert.certificate_type === "winner" ? `won 1st place (Rank #${previewCert.rank})` : "participated"}{" "}
                                with a score of {previewCert.score} points
                            </p>

                            {/* Footer */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "0 30px", marginTop: 40 }}>
                                <div style={{ textAlign: "left" }}>
                                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Date of Issue</p>
                                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
                                        {new Date(previewCert.issued_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                                    </p>
                                </div>
                                <div style={{ textAlign: "center" }}>
                                    <div style={{ width: 80, borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 8 }}>
                                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Organizer</p>
                                    </div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Verification ID</p>
                                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", fontFamily: "monospace" }}>
                                        {previewCert.verification_id}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
