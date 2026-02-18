/**
 * CEAP Auth Store (Zustand)
 * Manages user session, login/logout, and tenant context.
 */
import { create } from "zustand";
import { authAPI } from "@/lib/api";

interface User {
    id: string;
    email: string;
    full_name: string;
    role: string;
    status: string;
    department?: string;
    college_id?: string;
    roll_number?: string;
    avatar_url?: string;
    tenant_id: string;
}

interface AuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    tenantSlug: string;

    setTenantSlug: (slug: string) => void;
    login: (email: string, password: string) => Promise<void>;
    register: (data: {
        email: string;
        password: string;
        full_name: string;
        department?: string;
        role?: string;
        roll_number?: string;
        join_code?: string;
        faculty_key?: string;
    }) => Promise<void>;
    logout: () => void;
    loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    tenantSlug: "demo",

    setTenantSlug: (slug: string) => set({ tenantSlug: slug }),

    login: async (email: string, password: string, slug?: string) => {
        const tenantSlug = slug || get().tenantSlug || "demo";
        const { data } = await authAPI.login({
            email,
            password,
            tenant_slug: tenantSlug,
        });
        localStorage.setItem("ceap_token", data.access_token);
        localStorage.setItem("ceap_refresh_token", data.refresh_token);
        set({ user: data.user, isAuthenticated: true, isLoading: false });
    },

    register: async (regData) => {
        const tenantSlug = get().tenantSlug || "demo";
        const { data } = await authAPI.register({
            ...regData,
            tenant_slug: tenantSlug,
        });
        // Faculty accounts are pending — don't set as authenticated
        if (data.user?.status === "pending") {
            return; // caller handles the pending UI
        }
        localStorage.setItem("ceap_token", data.access_token);
        localStorage.setItem("ceap_refresh_token", data.refresh_token);
        set({ user: data.user, isAuthenticated: true, isLoading: false });
    },

    logout: () => {
        localStorage.removeItem("ceap_token");
        localStorage.removeItem("ceap_refresh_token");
        set({ user: null, isAuthenticated: false });
        window.location.href = "/login";
    },

    loadUser: async () => {
        try {
            const token = localStorage.getItem("ceap_token");
            if (!token) {
                set({ isLoading: false });
                return;
            }
            const { data } = await authAPI.me();
            set({ user: data, isAuthenticated: true, isLoading: false });
        } catch {
            localStorage.removeItem("ceap_token");
            set({ user: null, isAuthenticated: false, isLoading: false });
        }
    },
}));
