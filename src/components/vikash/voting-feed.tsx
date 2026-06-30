"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type Complaint } from "@/lib/api-client";
import { ComplaintCard } from "./complaint-card";
import { ComplaintDetailDialog } from "./complaint-detail-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Vote, Flame, TrendingUp, CheckCircle2 } from "lucide-react";

export function VotingFeed() {
  const [filter, setFilter] = useState<"voting" | "all" | "resolved">("voting");
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [open, setOpen] = useState(false);

  const { data: complaints, isLoading } = useQuery({
    queryKey: ["complaints", filter],
    queryFn: () => {
      if (filter === "voting") return api.listComplaints({ status: "VOTING" });
      if (filter === "resolved") return api.listComplaints({ status: "RESOLVED" });
      return api.listComplaints();
    },
  });

  const openDetail = (c: Complaint) => {
    api.getComplaint(c.id).then((full) => {
      setSelected(full);
      setOpen(true);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Vote className="h-6 w-6 text-orange-600" />
            Community Voting Feed
          </h2>
          <p className="text-sm text-muted-foreground">Vote for issues that matter. Top-voted issues get prioritized by AI.</p>
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="voting" className="gap-1"><Flame className="h-3.5 w-3.5" /> Active Voting</TabsTrigger>
            <TabsTrigger value="all" className="gap-1"><TrendingUp className="h-3.5 w-3.5" /> All Issues</TabsTrigger>
            <TabsTrigger value="resolved" className="gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Resolved</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        </div>
      ) : !complaints || complaints.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Vote className="mx-auto h-10 w-10 opacity-40" />
            <p className="mt-2">No issues in this category yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {complaints.map((c) => (
            <ComplaintCard key={c.id} complaint={c} onOpen={openDetail} />
          ))}
        </div>
      )}

      <ComplaintDetailDialog complaint={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
