"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Cluster } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATEGORY_META } from "./vikash-store";
import { toast } from "sonner";
import { Loader2, Sparkles, Network, MapPin, ThumbsUp, Layers } from "lucide-react";

export function ClusteringPanel() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ clustersCreated: number; complaintsClustered: number } | null>(null);

  const { data: clusters, isLoading } = useQuery({
    queryKey: ["clusters"],
    queryFn: api.clusters,
  });

  const runClustering = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await api.runClustering();
      setResult({ clustersCreated: res.clustersCreated, complaintsClustered: res.complaintsClustered });
      toast.success(`AI clustered ${res.complaintsClustered} complaints into ${res.clustersCreated} groups!`);
      qc.invalidateQueries({ queryKey: ["clusters"] });
      qc.invalidateQueries({ queryKey: ["municipal-complaints"] });
    } catch (e: any) {
      toast.error(e.message || "Clustering failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-6 w-6 text-purple-600" />
            Semantic Clustering & Priority Engine
          </h2>
          <p className="text-sm text-muted-foreground">AI groups duplicate complaints within 50m & ranks by priority.</p>
        </div>
        <Button onClick={runClustering} disabled={running} className="bg-purple-600 hover:bg-purple-700">
          {running ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : <><Sparkles className="mr-2 h-4 w-4" /> Run AI Clustering</>}
        </Button>
      </div>

      {result && (
        <Card className="border-2 border-purple-300 bg-purple-50">
          <CardContent className="py-3 flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-purple-600" />
            <div>
              <div className="font-semibold text-purple-900">Clustering complete</div>
              <div className="text-sm text-purple-700">
                Created <b>{result.clustersCreated}</b> cluster(s) from <b>{result.complaintsClustered}</b> complaint(s).
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Layers className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <b>How it works:</b> The LLM analyzes all pending/voting complaints, computes haversine distance between locations,
              and groups complaints that are (a) within 50 meters of each other AND (b) share the same category.
              Each cluster gets an AI-generated summary and an aggregated priority score.
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>
      ) : !clusters || clusters.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Network className="mx-auto h-10 w-10 opacity-40" />
          <p className="mt-2">No clusters yet. Run AI clustering to group duplicate complaints.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {clusters.map((cl: Cluster) => {
            const cat = CATEGORY_META[cl.category] || CATEGORY_META.OTHER;
            return (
              <Card key={cl.id} className="border-l-4 border-l-purple-400">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{cl.name}</CardTitle>
                    <Badge className={cat.color}>{cat.emoji} {cat.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {cl.summary && (
                    <p className="text-sm text-muted-foreground">{cl.summary}</p>
                  )}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded bg-muted/50 p-1.5">
                      <div className="font-bold text-base text-purple-700">{cl.complaintCount}</div>
                      <div className="text-muted-foreground">Complaints</div>
                    </div>
                    <div className="rounded bg-muted/50 p-1.5">
                      <div className="font-bold text-base text-orange-600 flex items-center justify-center gap-0.5">
                        <ThumbsUp className="h-3 w-3" />{cl.totalVotes}
                      </div>
                      <div className="text-muted-foreground">Votes</div>
                    </div>
                    <div className="rounded bg-muted/50 p-1.5">
                      <div className="font-bold text-base text-red-600">{cl.priorityScore.toFixed(0)}</div>
                      <div className="text-muted-foreground">Priority</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {cl.centerLat.toFixed(4)}, {cl.centerLng.toFixed(4)} · 50m radius
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
