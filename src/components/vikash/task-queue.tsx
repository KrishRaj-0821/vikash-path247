"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Complaint } from "@/lib/api-client";
import { ComplaintDetailDialog } from "./complaint-detail-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORY_META, SEVERITY_META, STATUS_META } from "./vikash-store";
import { Loader2, ListChecks, MapPin, ThumbsUp, Clock, ChevronRight, Flame } from "lucide-react";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function TaskQueue({ onResolve }: { onResolve: (c: Complaint) => void }) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: complaints, isLoading } = useQuery({
    queryKey: ["municipal-complaints", filter],
    queryFn: () => {
      if (filter === "all") return api.listComplaints({ limit: 50 });
      return api.listComplaints({ status: filter });
    },
  });

  const openDetail = async (c: Complaint) => {
    const full = await api.getComplaint(c.id);
    setSelected(full);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-emerald-600" />
            AI-Prioritized Task Queue
          </h2>
          <p className="text-sm text-muted-foreground">Complaints ranked by AI priority score. Resolve in order.</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="VOTING">Voting</SelectItem>
            <SelectItem value="CLUSTERED">Clustered</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : !complaints || complaints.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No tasks in this category.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {[...complaints]
            .sort((a, b) => b.priorityScore - a.priorityScore)
            .map((c, idx) => {
              const cat = CATEGORY_META[c.category] || CATEGORY_META.OTHER;
              const sev = SEVERITY_META[c.severity] || SEVERITY_META.MEDIUM;
              const st = STATUS_META[c.status] || STATUS_META.PENDING;
              return (
                <Card key={c.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-3 flex items-center gap-3">
                    <div className="flex flex-col items-center justify-center w-12 shrink-0">
                      <div className={`text-xs font-bold ${c.priorityScore >= 80 ? "text-red-600" : c.priorityScore >= 60 ? "text-orange-600" : "text-muted-foreground"}`}>
                        #{idx + 1}
                      </div>
                      <div className={`flex items-center gap-0.5 text-xs font-bold ${c.priorityScore >= 80 ? "text-red-600" : c.priorityScore >= 60 ? "text-orange-600" : "text-muted-foreground"}`}>
                        <Flame className="h-3 w-3" />
                        {c.priorityScore.toFixed(0)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">{c.title}</span>
                        <Badge variant="outline" className={sev.color}>{sev.label}</Badge>
                        <Badge className={st.color}>{st.label}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.address}</span>
                        <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{c._count?.votes ?? 0}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(c.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {c.status !== "RESOLVED" && (
                        <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => onResolve(c)}>
                          Resolve
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openDetail(c)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}
      <ComplaintDetailDialog complaint={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
