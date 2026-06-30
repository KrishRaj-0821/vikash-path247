"use client";

import { useVikash, type CitizenTab } from "./vikash-store";
import { VotingFeed } from "./voting-feed";
import { ReportForm } from "./report-form";
import { RewardsPanel } from "./rewards-panel";
import { NotificationsPanel } from "./notifications-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Plus, Vote, Award, Bell, Sparkles, Camera } from "lucide-react";

const TABS: { id: CitizenTab; label: string; icon: any }[] = [
  { id: "feed", label: "Voting Feed", icon: Vote },
  { id: "report", label: "Report Issue", icon: Plus },
  { id: "rewards", label: "My Rewards", icon: Award },
  { id: "notifications", label: "Alerts", icon: Bell },
];

export function CitizenPortal() {
  const { user, citizenTab, setCitizenTab } = useVikash();

  const { data: notifCount } = useQuery({
    queryKey: ["notifications"],
    queryFn: api.listNotifications,
    refetchInterval: 20000,
    select: (list) => list.filter((n) => !n.isRead).length,
  });

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Welcome banner */}
      <Card className="mb-6 border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
        <CardContent className="py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-600 text-white text-xl">
              🙏
            </div>
            <div>
              <div className="font-bold text-lg">Namaste, {user?.name}!</div>
              <div className="text-sm text-muted-foreground">
                {user?.verified ? "Verified Nagrik" : "Guest Nagrik"} · Swachh Bharat ke saathi
              </div>
            </div>
          </div>
          <Button onClick={() => setCitizenTab("report")} className="bg-orange-600 hover:bg-orange-700">
            <Camera className="mr-2 h-4 w-4" /> Report an Issue
          </Button>
        </CardContent>
      </Card>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6 overflow-x-auto custom-scrollbar pb-1">
        {TABS.map((t) => (
          <Button
            key={t.id}
            variant={citizenTab === t.id ? "default" : "outline"}
            onClick={() => setCitizenTab(t.id)}
            className={`shrink-0 ${citizenTab === t.id ? "bg-orange-600 hover:bg-orange-700" : "border-orange-200 text-orange-700 hover:bg-orange-50"}`}
          >
            <t.icon className="mr-1.5 h-4 w-4" />
            {t.label}
            {t.id === "notifications" && notifCount ? (
              <span className="ml-1.5 rounded-full bg-red-600 text-white text-xs px-1.5 py-0.5 leading-none">
                {notifCount}
              </span>
            ) : null}
          </Button>
        ))}
      </div>

      {citizenTab === "feed" && <VotingFeed />}
      {citizenTab === "report" && <ReportForm />}
      {citizenTab === "rewards" && <RewardsPanel />}
      {citizenTab === "notifications" && <NotificationsPanel />}
    </div>
  );
}
