"use client";

import { useState } from "react";
import { useVikash, type MunicipalTab } from "./vikash-store";
import { TaskQueue } from "./task-queue";
import { ClusteringPanel } from "./clustering-panel";
import { BudgetEstimator } from "./budget-estimator";
import { ResolutionDialog } from "./resolution-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { api, type Complaint } from "@/lib/api-client";
import { ListChecks, Network, Calculator, CheckCircle2, ShieldCheck } from "lucide-react";

const TABS: { id: MunicipalTab; label: string; icon: any }[] = [
  { id: "queue", label: "Task Queue", icon: ListChecks },
  { id: "clustering", label: "AI Clustering", icon: Network },
  { id: "budget", label: "Budget Estimator", icon: Calculator },
  { id: "resolutions", label: "Resolutions", icon: CheckCircle2 },
];

export function MunicipalDashboard() {
  const { user, municipalTab, setMunicipalTab } = useVikash();
  const [resolveTarget, setResolveTarget] = useState<Complaint | null>(null);
  const [resolveOpen, setResolveOpen] = useState(false);

  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: api.stats });
  const { data: resolved } = useQuery({
    queryKey: ["resolved-list"],
    queryFn: () => api.listComplaints({ status: "RESOLVED" }),
    enabled: municipalTab === "resolutions",
  });

  const openResolve = (c: Complaint) => {
    setResolveTarget(c);
    setResolveOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Officer banner */}
      <Card className="mb-6 border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardContent className="py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-lg">{user?.name}</div>
              <div className="text-sm text-muted-foreground">
                {user?.department} · ID: {user?.employeeId} · {user?.email}
              </div>
            </div>
          </div>
          <div className="flex gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-emerald-700">{stats?.totalComplaints ?? "—"}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{stats?.byStatus?.VOTING ?? 0}</div>
              <div className="text-xs text-muted-foreground">Voting</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-700">{stats?.resolvedCount ?? "—"}</div>
              <div className="text-xs text-muted-foreground">Resolved</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto custom-scrollbar pb-1">
        {TABS.map((t) => (
          <Button
            key={t.id}
            variant={municipalTab === t.id ? "default" : "outline"}
            onClick={() => setMunicipalTab(t.id)}
            className={`shrink-0 ${municipalTab === t.id ? "bg-emerald-600 hover:bg-emerald-700" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
          >
            <t.icon className="mr-1.5 h-4 w-4" />
            {t.label}
          </Button>
        ))}
      </div>

      {municipalTab === "queue" && <TaskQueue onResolve={openResolve} />}
      {municipalTab === "clustering" && <ClusteringPanel />}
      {municipalTab === "budget" && <BudgetEstimator />}
      {municipalTab === "resolutions" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" /> Resolution History
            </h2>
            <p className="text-sm text-muted-foreground">Complaints resolved by your department. Each triggered Jan Samvaad alerts.</p>
          </div>
          {!resolved || resolved.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No resolutions yet. Resolve complaints from the Task Queue.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {resolved.map((c) => (
                <Card key={c.id} className="border-l-4 border-l-emerald-400">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{c.title}</div>
                        <div className="text-xs text-muted-foreground">{c.address}</div>
                        {c.resolution && (
                          <p className="text-xs text-emerald-700 mt-1 line-clamp-2">{c.resolution.resolutionNote}</p>
                        )}
                      </div>
                      <div className="text-right text-xs text-muted-foreground shrink-0">
                        {c.resolution?.actualCost != null && (
                          <div className="font-semibold text-emerald-700">₹{c.resolution.actualCost.toLocaleString("en-IN")}</div>
                        )}
                        <div>{c.resolution ? new Date(c.resolution.resolvedAt).toLocaleDateString() : ""}</div>
                        <div className="text-emerald-600">by {c.resolution?.resolver?.name}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <ResolutionDialog complaint={resolveTarget} open={resolveOpen} onOpenChange={setResolveOpen} />
    </div>
  );
}
