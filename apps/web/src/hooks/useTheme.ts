/**
 * CEAP — Theme Hook
 * Manages dark/light mode with localStorage persistence.
 */
"use client";
import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export function useTheme() {
    const [theme, setTheme] = useState<Theme>("dark");

    useEffect(() => {
        const saved = localStorage.getItem("ceap_theme") as Theme | null;
        const initial = saved || "dark";
        setTheme(initial);
        document.documentElement.setAttribute("data-theme", initial);
    }, []);

    const toggle = () => {
        const next: Theme = theme === "dark" ? "light" : "dark";
        setTheme(next);
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("ceap_theme", next);
    };

    return { theme, toggle, isDark: theme === "dark" };
}
