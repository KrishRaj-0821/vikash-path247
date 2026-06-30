"use client";

import { create } from "zustand";
import type { SessionUser } from "@/lib/api-client";

export type View = "landing" | "citizen" | "municipal";
export type CitizenTab = "feed" | "report" | "rewards" | "notifications";
export type MunicipalTab = "queue" | "clustering" | "budget" | "resolutions";

interface VikashState {
  user: SessionUser | null;
  loading: boolean;
  view: View;
  citizenTab: CitizenTab;
  municipalTab: MunicipalTab;
  setUser: (user: SessionUser | null) => void;
  setLoading: (v: boolean) => void;
  setView: (v: View) => void;
  setCitizenTab: (t: CitizenTab) => void;
  setMunicipalTab: (t: MunicipalTab) => void;
  refreshKey: number;
  triggerRefresh: () => void;
}

export const useVikash = create<VikashState>((set) => ({
  user: null,
  loading: true,
  view: "landing",
  citizenTab: "feed",
  municipalTab: "queue",
  setUser: (user) =>
    set((s) => ({
      user,
      view: user ? (user.role === "MUNICIPAL" ? "municipal" : "citizen") : "landing",
      loading: false,
    })),
  setLoading: (v) => set({ loading: v }),
  setView: (v) => set({ view: v }),
  setCitizenTab: (t) => set({ citizenTab: t }),
  setMunicipalTab: (t) => set({ municipalTab: t }),
  refreshKey: 0,
  triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));

// Category metadata
export const CATEGORY_META: Record<
  string,
  { label: string; emoji: string; color: string }
> = {
  POTHOLE: { label: "Gaddha", emoji: "🕳️", color: "bg-orange-100 text-orange-700 border-orange-200" },
  GARBAGE: { label: "Kachra", emoji: "🗑️", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  WATER: { label: "Paani", emoji: "💧", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  STREETLIGHT: { label: "Streetlight", emoji: "💡", color: "bg-amber-100 text-amber-700 border-amber-200" },
  DRAINAGE: { label: "Naala", emoji: "🌊", color: "bg-teal-100 text-teal-700 border-teal-200" },
  ROAD: { label: "Sadak", emoji: "🛣️", color: "bg-stone-100 text-stone-700 border-stone-200" },
  OTHER: { label: "Anya", emoji: "📋", color: "bg-gray-100 text-gray-700 border-gray-200" },
};

export const SEVERITY_META: Record<
  string,
  { label: string; color: string; weight: string }
> = {
  LOW: { label: "Low", color: "bg-green-100 text-green-700", weight: "text-green-600" },
  MEDIUM: { label: "Medium", color: "bg-yellow-100 text-yellow-700", weight: "text-yellow-600" },
  HIGH: { label: "High", color: "bg-orange-100 text-orange-700", weight: "text-orange-600" },
  CRITICAL: { label: "Critical", color: "bg-red-100 text-red-700", weight: "text-red-600" },
};

export const STATUS_META: Record<
  string,
  { label: string; color: string }
> = {
  PENDING: { label: "Pending", color: "bg-gray-100 text-gray-700" },
  CLUSTERED: { label: "Clustered", color: "bg-purple-100 text-purple-700" },
  VOTING: { label: "Voting", color: "bg-blue-100 text-blue-700" },
  APPROVED: { label: "Approved", color: "bg-indigo-100 text-indigo-700" },
  IN_PROGRESS: { label: "In Progress", color: "bg-amber-100 text-amber-700" },
  RESOLVED: { label: "Resolved", color: "bg-emerald-100 text-emerald-700" },
};

export const BADGE_META: Record<string, { label: string; emoji: string; desc: string }> = {
  SWACHHTA_YODHA: { label: "Swachhta Yodha", emoji: "🛡️", desc: "10+ genuine reports filed" },
  GRAM_VEER: { label: "Gram Veer", emoji: "🏆", desc: "Active community contributor" },
  COMMUNITY_LEADER: { label: "Community Leader", emoji: "👑", desc: "Top voter & verifier" },
  FIRST_REPORT: { label: "First Report", emoji: "✨", desc: "Filed your first complaint" },
  VERIFIED_OFFICIAL: { label: "Verified Official", emoji: "🏛️", desc: "Govt-verified municipal officer" },
};
