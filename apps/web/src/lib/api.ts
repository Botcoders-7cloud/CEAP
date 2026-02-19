/**
 * CEAP API Client
 * Centralized Axios instance with auth token injection.
 */
import axios from "axios";

// Hardcoded production URL — avoids empty env var causing double-slash 404s
const PROD_URL = "https://ceap-api.onrender.com";
const RAW_URL = process.env.NEXT_PUBLIC_API_URL;
// Only use env var if it's a non-empty, valid URL
const API_URL = (RAW_URL && RAW_URL.startsWith("http")) ? RAW_URL.replace(/\/$/, "") : PROD_URL;

const api = axios.create({
    baseURL: `${API_URL}/api/v1`,
    headers: { "Content-Type": "application/json" },
});


// Request interceptor: inject auth token
api.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("ceap_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Response interceptor: handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem("ceap_refresh_token");

            if (refreshToken) {
                try {
                    const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh`, {
                        refresh_token: refreshToken,
                    });
                    localStorage.setItem("ceap_token", data.access_token);
                    originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
                    return api(originalRequest);
                } catch {
                    localStorage.removeItem("ceap_token");
                    localStorage.removeItem("ceap_refresh_token");
                    window.location.href = "/login";
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;

// ── Auth APIs ────────────────────────────────
export const authAPI = {
    register: (data: {
        email: string;
        password: string;
        full_name: string;
        tenant_slug: string;
        department?: string;
    }) => api.post("/auth/register", data),

    login: (data: { email: string; password: string; tenant_slug: string }) =>
        api.post("/auth/login", data),

    refresh: (refresh_token: string) =>
        api.post("/auth/refresh", { refresh_token }),

    me: () => api.get("/auth/me"),

    updateProfile: (data: { full_name?: string; department?: string }) =>
        api.put("/auth/me", data),

    changePassword: (data: { old_password: string; new_password: string }) =>
        api.post("/auth/change-password", data),
};

// ── Event APIs ───────────────────────────────
export const eventAPI = {
    list: (params?: {
        page?: number;
        page_size?: number;
        status?: string;
        event_type?: string;
        search?: string;
    }) => api.get("/events", { params }),

    get: (slug: string) => api.get(`/events/${slug}`),

    create: (data: any) => api.post("/events", data),

    update: (id: string, data: any) => api.put(`/events/${id}`, data),

    publish: (id: string) => api.post(`/events/${id}/publish`),

    register: (eventId: string) => api.post(`/events/${eventId}/register`),

    registrations: (eventId: string) =>
        api.get(`/events/${eventId}/registrations`),

    createTeam: (eventId: string, data: { name: string }) =>
        api.post(`/events/${eventId}/teams`, { event_id: eventId, ...data }),

    joinTeam: (inviteCode: string) =>
        api.post("/events/teams/join", { invite_code: inviteCode }),

    // Event-Problem linking
    problems: (eventId: string) =>
        api.get(`/events/${eventId}/problems`),

    linkProblem: (eventId: string, problemId: string) =>
        api.post(`/events/${eventId}/problems/${problemId}`),

    unlinkProblem: (eventId: string, problemId: string) =>
        api.delete(`/events/${eventId}/problems/${problemId}`),
};

// ── Problem APIs ─────────────────────────────
export const problemAPI = {
    list: (params?: { difficulty?: string; problem_type?: string; tag?: string }) =>
        api.get("/problems", { params }),

    get: (id: string) => api.get(`/problems/${id}`),

    create: (data: any) => api.post("/problems", data),

    testCases: (problemId: string) =>
        api.get(`/problems/${problemId}/test-cases`),

    addTestCase: (problemId: string, data: any) =>
        api.post(`/problems/${problemId}/test-cases`, data),
};

// ── Submission APIs ──────────────────────────
export const submissionAPI = {
    // Run = test against sample cases, no DB save
    run: (data: {
        event_id: string;
        problem_id: string;
        language: string;
        source_code: string;
        custom_input?: string;
    }) => api.post("/submissions/run", data),

    // Submit = full grading with score + leaderboard
    create: (data: {
        event_id: string;
        problem_id: string;
        language: string;
        source_code: string;
    }) => api.post("/submissions", data),

    get: (id: string) => api.get(`/submissions/${id}`),

    mySubmissions: (eventId: string) =>
        api.get(`/events/${eventId}/my-submissions`),

    leaderboard: (eventId: string, page?: number) =>
        api.get(`/events/${eventId}/leaderboard`, { params: { page } }),
};

// ── Admin APIs ───────────────────────────────
export const adminAPI = {
    // User management
    listUsers: (params?: { role?: string; status?: string }) =>
        api.get("/admin/users", { params }),

    createUser: (data: { email: string; password: string; full_name: string; role: string; department?: string }) =>
        api.post("/admin/users", data),

    updateUser: (id: string, data: { full_name?: string; department?: string; role?: string; status?: string; is_active?: boolean; password?: string }) =>
        api.patch(`/admin/users/${id}`, data),

    deleteUser: (id: string) =>
        api.delete(`/admin/users/${id}`),

    // Registration keys
    getKeys: () => api.get("/admin/keys"),

    rotateKeys: (data: { rotate_join_code?: boolean; rotate_faculty_key?: boolean }) =>
        api.post("/admin/keys/rotate", data),

    // Student whitelist
    listStudents: () => api.get("/admin/students"),

    importStudents: (file: File, department?: string) => {
        const form = new FormData();
        form.append("file", file);
        if (department) form.append("department", department);
        return api.post("/admin/students/import", form, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    },

    bulkUpdate: (data: { user_ids: string[]; action: string; department?: string }) =>
        api.post("/admin/users/bulk-update", data),

    removeStudent: (rollNumber: string) =>
        api.delete(`/admin/students/${rollNumber}`),
};

// ── Certificate APIs ─────────────────────────
export const certificateAPI = {
    my: () => api.get("/certificates/my"),
    verify: (verificationId: string) => api.get(`/certificates/verify/${verificationId}`),
    markDownloaded: (certId: string) => api.post(`/certificates/${certId}/downloaded`),
    generateForEvent: (eventId: string) => api.post(`/events/${eventId}/generate-certificates`),
};


