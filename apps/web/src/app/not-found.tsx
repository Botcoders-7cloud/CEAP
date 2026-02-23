/**
 * CEAP — 404 Not Found Page
 * Shown when a route doesn't exist.
 */
import { FileQuestion, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            minHeight: "100vh", textAlign: "center", padding: 32,
        }}>
            <div style={{ maxWidth: 380 }}>
                <div style={{
                    width: 64, height: 64, borderRadius: 16, margin: "0 auto 24px",
                    background: "rgba(200,149,108,0.1)", display: "flex",
                    alignItems: "center", justifyContent: "center",
                }}>
                    <FileQuestion size={28} color="#C8956C" />
                </div>
                <h1 style={{ fontSize: 48, fontWeight: 800, marginBottom: 4, color: "#F0EDE8" }}>404</h1>
                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#F0EDE8" }}>Page Not Found</p>
                <p style={{ fontSize: 13, color: "#A8A29E", marginBottom: 28, lineHeight: 1.6 }}>
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
                <Link href="/dashboard" style={{
                    background: "#C8956C", color: "#fff", border: "none",
                    padding: "10px 28px", borderRadius: 10, fontSize: 13,
                    fontWeight: 600, cursor: "pointer", display: "inline-flex",
                    alignItems: "center", gap: 6, textDecoration: "none",
                }}>
                    <ArrowLeft size={14} /> Back to Dashboard
                </Link>
            </div>
        </div>
    );
}
