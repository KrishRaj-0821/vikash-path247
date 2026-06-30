"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CATEGORY_META, SEVERITY_META, STATUS_META } from "./vikash-store";
import type { Complaint } from "@/lib/api-client";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, ThumbsUp, Clock, ImageOff, Calendar, AlertTriangle } from "lucide-react";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function ComplaintCard({
  complaint,
  onOpen,
  showVote = true,
}: {
  complaint: Complaint;
  onOpen?: (c: Complaint) => void;
  showVote?: boolean;
}) {
  const qc = useQueryClient();
  const [voted, setVoted] = useState(
    complaint.votes?.some((v) => v.userId === complaint.reporterId) ?? false
  );
  const [voteCount, setVoteCount] = useState(complaint._count?.votes ?? complaint.votes?.length ?? 0);
  const [voting, setVoting] = useState(false);

  const cat = CATEGORY_META[complaint.category] || CATEGORY_META.OTHER;
  const sev = SEVERITY_META[complaint.severity] || SEVERITY_META.MEDIUM;
  const st = STATUS_META[complaint.status] || STATUS_META.PENDING;

  const vote = async () => {
    setVoting(true);
    try {
      const res = await api.vote(complaint.id);
      setVoted(res.voted);
      setVoteCount(res.votes);
      if (res.voted) toast.success("+2 Swachh Coins earned for upvoting!");
      qc.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e: any) {
      toast.error(e.message || "Vote failed");
    } finally {
      setVoting(false);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {complaint.imageUrl ? (
        <div className="relative h-40 bg-muted cursor-pointer" onClick={() => onOpen?.(complaint)}>
          { }
          <img src={complaint.imageUrl} alt={complaint.title} className="h-full w-full object-cover" />
          <div className="absolute top-2 left-2 flex gap-1.5">
            <Badge className={`${cat.color} border`}>
              {cat.emoji} {cat.label}
            </Badge>
          </div>
          <div className="absolute top-2 right-2">
            <Badge className={st.color}>{st.label}</Badge>
          </div>
        </div>
      ) : (
        <div className="relative h-40 bg-muted/50 flex items-center justify-center cursor-pointer" onClick={() => onOpen?.(complaint)}>
          <ImageOff className="h-8 w-8 text-muted-foreground/40" />
          <div className="absolute top-2 left-2">
            <Badge className={`${cat.color} border`}>{cat.emoji} {cat.label}</Badge>
          </div>
          <div className="absolute top-2 right-2">
            <Badge className={st.color}>{st.label}</Badge>
          </div>
        </div>
      )}
      <CardContent className="pt-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight line-clamp-2">{complaint.title}</h3>
          <Badge variant="outline" className={`shrink-0 ${sev.color}`}>
            <AlertTriangle className="mr-1 h-3 w-3" />
            {sev.label}
          </Badge>
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{complaint.description}</p>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{complaint.address}</span>
        </div>
        {complaint.ward && (
          <div className="mt-1 text-xs text-muted-foreground">Ward: {complaint.ward}</div>
        )}
        {complaint.cluster && (
          <Badge variant="outline" className="mt-2 border-purple-200 bg-purple-50 text-purple-700 text-[10px]">
            Cluster: {complaint.cluster.name}
          </Badge>
        )}
        {complaint.aiAnalysis && (
          <div className="mt-2 rounded-md bg-orange-50/50 border border-orange-100 p-2">
            <div className="flex items-center gap-1 text-[10px] font-semibold text-orange-700 uppercase">
              <span className="chakra-spin inline-block">⚙️</span> AI Analysis
            </div>
            <p className="text-xs text-orange-900/80 line-clamp-2 mt-0.5">{complaint.aiAnalysis}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 flex items-center justify-between gap-2 border-t bg-muted/20">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {complaint.reporter?.name?.split(" ").map((n) => n[0]).slice(0, 2).join("") || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-xs font-medium leading-tight">{complaint.reporter?.name || "Unknown"}</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" /> {timeAgo(complaint.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {complaint.status === "RESOLVED" && (
            <Badge className="bg-emerald-100 text-emerald-700">✓ Resolved</Badge>
          )}
          {showVote && complaint.status !== "RESOLVED" && (
            <Button
              size="sm"
              variant={voted ? "default" : "outline"}
              onClick={vote}
              disabled={voting}
              className={voted ? "bg-orange-600 hover:bg-orange-700" : "border-orange-300 text-orange-700 hover:bg-orange-50"}
            >
              <ThumbsUp className="mr-1 h-3.5 w-3.5" />
              {voteCount}
            </Button>
          )}
          {onOpen && (
            <Button size="sm" variant="ghost" onClick={() => onOpen(complaint)}>
              Details
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
