/**
 * Keep-alive ping to prevent Render free-tier cold starts.
 * Pings /health every 10 minutes while the user is active.
 */

let intervalId: ReturnType<typeof setInterval> | null = null;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function startKeepAlive() {
    if (intervalId) return; // Already running

    // Ping immediately
    ping();

    // Then every 10 minutes
    intervalId = setInterval(ping, 10 * 60 * 1000);
}

export function stopKeepAlive() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

async function ping() {
    try {
        await fetch(`${API_URL}/health`, { method: "GET", cache: "no-store" });
    } catch {
        // Silently ignore — backend might be booting
    }
}
