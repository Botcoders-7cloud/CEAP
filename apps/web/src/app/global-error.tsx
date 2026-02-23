"use client";
/**
 * CEAP — Global Error Boundary
 * Catches React rendering errors and shows a friendly fallback.
 */
import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("CEAP Error:", error);
    }, [error]);

    return (
        <html>
            <body style={{
                backgroundColor: "#111110",
                color: "#F0EDE8",
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "100vh",
                margin: 0,
            }}>
                <div style={{ textAlign: "center", maxWidth: 420, padding: 32 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 16, margin: "0 auto 24px",
                        background: "rgba(201,112,112,0.1)", display: "flex",
                        alignItems: "center", justifyContent: "center",
                    }}>
                        <AlertTriangle size={28} color="#C97070" />
                    </div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
                    <p style={{ fontSize: 13, color: "#A8A29E", marginBottom: 28, lineHeight: 1.6 }}>
                        An unexpected error occurred. Our team has been notified.
                    </p>
                    <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                        <button onClick={reset} style={{
                            background: "#C8956C", color: "#fff", border: "none",
                            padding: "10px 24px", borderRadius: 10, fontSize: 13,
                            fontWeight: 600, cursor: "pointer", display: "flex",
                            alignItems: "center", gap: 6,
                        }}>
                            <RefreshCw size={14} /> Try Again
                        </button>
                        <a href="/dashboard" style={{
                            background: "#1A1918", color: "#F0EDE8",
                            border: "1px solid rgba(245,240,235,0.08)",
                            padding: "10px 24px", borderRadius: 10, fontSize: 13,
                            fontWeight: 600, cursor: "pointer", display: "flex",
                            alignItems: "center", gap: 6, textDecoration: "none",
                        }}>
                            <Home size={14} /> Dashboard
                        </a>
                    </div>
                </div>
            </body>
        </html>
    );
}
