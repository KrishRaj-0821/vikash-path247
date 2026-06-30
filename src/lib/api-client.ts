// Frontend API client for Vikash Path

export interface SessionUser {
  id: string;
  role: "CITIZEN" | "MUNICIPAL";
  name: string;
  email?: string | null;
  phone?: string | null;
  swachhCoins: number;
  department?: string | null;
  employeeId?: string | null;
  verified: boolean;
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  address: string;
  lat: number;
  lng: number;
  ward?: string | null;
  imageUrl?: string | null;
  audioTranscript?: string | null;
  voiceLang?: string | null;
  aiAnalysis?: string | null;
  priorityScore: number;
  clusterId?: string | null;
  reporterId: string;
  createdAt: string;
  updatedAt: string;
  reporter?: { id: string; name: string };
  _count?: { votes: number };
  votes?: { id: string; userId: string; user: { name: string } }[];
  cluster?: { id: string; name: string; summary?: string | null } | null;
  budgetEstimate?: BudgetEstimate | null;
  resolution?: Resolution | null;
}

export interface BudgetEstimate {
  id: string;
  estimatedCost: number;
  costMin: number;
  costMax: number;
  materials: string;
  timeline: string;
  engineeringDraft: string;
  laborRequired: string;
  equipmentNeeded: string;
  riskLevel: string;
}

export interface Resolution {
  id: string;
  proofImageUrl?: string | null;
  resolutionNote: string;
  actualCost?: number | null;
  resolvedAt: string;
  resolver?: { name: string; department?: string | null };
}

export interface Cluster {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  category: string;
  complaintCount: number;
  totalVotes: number;
  priorityScore: number;
  status: string;
  summary?: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  complaintId?: string | null;
  complaint?: { title: string } | null;
}

export interface Badge {
  id: string;
  badgeType: string;
  earnedAt: string;
}

export interface Stats {
  totalComplaints: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  resolvedCount: number;
  avgResolutionHours?: number;
  totalCitizens: number;
  totalOfficials: number;
  totalSwachhCoins: number;
  topWards: { ward: string; count: number }[];
}

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed: ${res.status}`);
  }
  return data as T;
}

export const api = {
  // Auth
  citizenLogin: (body: { phone?: string; name?: string; email?: string; otp?: string; guest?: boolean }) =>
    request<{ user: SessionUser }>("/api/auth/citizen", { method: "POST", body: JSON.stringify(body) }),
  municipalLogin: (body: { email: string; employeeId: string; name?: string }) =>
    request<{ user: SessionUser }>("/api/auth/municipal", { method: "POST", body: JSON.stringify(body) }),
  me: () => request<{ user: SessionUser | null }>("/api/auth/me"),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),

  // Complaints
  listComplaints: (params?: Record<string, string | boolean>) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return request<Complaint[]>(`/api/complaints${qs}`);
  },
  getComplaint: (id: string) => request<Complaint>(`/api/complaints/${id}`),
  createComplaint: (body: Partial<Complaint>) =>
    request<Complaint>("/api/complaints", { method: "POST", body: JSON.stringify(body) }),
  vote: (id: string) =>
    request<{ ok: boolean; votes: number; voted: boolean }>(`/api/complaints/${id}/vote`, { method: "POST" }),
  resolve: (id: string, body: { proofImageUrl?: string; resolutionNote: string; actualCost?: number }) =>
    request<{ resolution: Resolution; votersNotified: number }>(`/api/complaints/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // AI
  liveAnalysis: (body: { imageUrl: string }) =>
    request<{ category: string; severity: string; analysis: string; recommendedAction: string; raw: string }>(
      "/api/ai/live-analysis",
      { method: "POST", body: JSON.stringify(body) }
    ),
  bhashaTranslate: (body: { audioBase64: string }) =>
    request<{ transcript: string; sourceLanguage: string; administrativeSummary: string }>(
      "/api/ai/bhasha-translate",
      { method: "POST", body: JSON.stringify(body) }
    ),
  runClustering: () =>
    request<{ clustersCreated: number; complaintsClustered: number; clusters: Cluster[] }>(
      "/api/ai/cluster",
      { method: "POST" }
    ),
  generateBudget: (body: { complaintId: string }) =>
    request<BudgetEstimate>("/api/ai/budget-estimate", { method: "POST", body: JSON.stringify(body) }),
  janSamvaad: (body: { complaintId: string }) =>
    request<{ message: string }>("/api/ai/jan-samvaad", { method: "POST", body: JSON.stringify(body) }),

  // TTS — returns a blob URL
  tts: async (text: string) => {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error("TTS failed");
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  // Notifications
  listNotifications: () => request<Notification[]>("/api/notifications"),
  markRead: (id: string) =>
    request<{ ok: boolean }>(`/api/notifications/${id}/read`, { method: "POST" }),

  // Rewards
  rewards: () =>
    request<{ swachhCoins: number; badges: Badge[] }>("/api/rewards"),

  // Stats
  stats: () => request<Stats>("/api/stats"),

  // Clusters
  clusters: () => request<Cluster[]>("/api/clusters"),
};
