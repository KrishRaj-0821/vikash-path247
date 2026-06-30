"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type Complaint, type BudgetEstimate } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CATEGORY_META, SEVERITY_META } from "./vikash-store";
import { toast } from "sonner";
import { Loader2, Calculator, Sparkles, FileText, Wrench, IndianRupee, Clock, AlertTriangle } from "lucide-react";

export function BudgetEstimator() {
  const [selectedId, setSelectedId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [estimate, setEstimate] = useState<BudgetEstimate | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  const { data: complaints, isLoading } = useQuery({
    queryKey: ["budget-complaints"],
    queryFn: () => api.listComplaints({ status: "VOTING" }),
  });

  const onSelect = (id: string) => {
    setSelectedId(id);
    setEstimate(null);
    const c = complaints?.find((x) => x.id === id);
    setSelectedComplaint(c || null);
    // If it already has an estimate, load it
    if (c?.budgetEstimate) setEstimate(c.budgetEstimate);
  };

  const generate = async () => {
    if (!selectedId) return;
    setGenerating(true);
    setEstimate(null);
    try {
      const est = await api.generateBudget({ complaintId: selectedId });
      setEstimate(est);
      toast.success("AI engineering draft generated!");
    } catch (e: any) {
      toast.error(e.message || "Budget estimation failed");
    } finally {
      setGenerating(false);
    }
  };

  let materials: { item: string; qty: string; cost: number }[] = [];
  try {
    materials = estimate ? JSON.parse(estimate.materials) : [];
  } catch {}

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="h-6 w-6 text-emerald-600" />
          AI Budget & Feasibility Estimator
        </h2>
        <p className="text-sm text-muted-foreground">Select a highly-voted issue. AI generates an engineering draft with cost, materials & timeline.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Complaint for Estimation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Select value={selectedId} onValueChange={onSelect}>
              <SelectTrigger><SelectValue placeholder="Choose a complaint..." /></SelectTrigger>
              <SelectContent>
                {complaints?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title} (Priority: {c.priorityScore.toFixed(0)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {selectedComplaint && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{selectedComplaint.title}</span>
                {(() => {
                  const cat = CATEGORY_META[selectedComplaint.category] || CATEGORY_META.OTHER;
                  const sev = SEVERITY_META[selectedComplaint.severity] || SEVERITY_META.MEDIUM;
                  return (
                    <>
                      <Badge className={cat.color}>{cat.emoji} {cat.label}</Badge>
                      <Badge variant="outline" className={sev.color}>{sev.label}</Badge>
                    </>
                  );
                })()}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{selectedComplaint.description}</p>
              {selectedComplaint.aiAnalysis && (
                <p className="text-xs text-orange-700 mt-1">AI: {selectedComplaint.aiAnalysis}</p>
              )}
            </div>
          )}

          <Button onClick={generate} disabled={!selectedId || generating} className="bg-emerald-600 hover:bg-emerald-700">
            {generating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating engineering draft...</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate AI Budget Estimate</>}
          </Button>
        </CardContent>
      </Card>

      {estimate && (
        <Card className="border-2 border-emerald-300">
          <CardHeader className="bg-emerald-50/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calculator className="h-5 w-5 text-emerald-600" /> Engineering Draft
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Cost summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center">
                <IndianRupee className="mx-auto h-4 w-4 text-emerald-600" />
                <div className="text-xl font-bold text-emerald-700">₹{estimate.estimatedCost.toLocaleString("en-IN")}</div>
                <div className="text-[10px] text-emerald-700/70">Estimated Cost</div>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
                <Clock className="mx-auto h-4 w-4 text-amber-600" />
                <div className="text-sm font-bold text-amber-700">{estimate.timeline}</div>
                <div className="text-[10px] text-amber-700/70">Timeline</div>
              </div>
              <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-center">
                <AlertTriangle className="mx-auto h-4 w-4 text-orange-600" />
                <div className="text-sm font-bold text-orange-700">{estimate.riskLevel}</div>
                <div className="text-[10px] text-orange-700/70">Risk Level</div>
              </div>
              <div className="rounded-lg bg-muted border p-3 text-center">
                <div className="text-xs font-bold">₹{estimate.costMin.toLocaleString("en-IN")} – ₹{estimate.costMax.toLocaleString("en-IN")}</div>
                <div className="text-[10px] text-muted-foreground">Cost Range</div>
              </div>
            </div>

            {/* Materials */}
            {materials.length > 0 && (
              <div>
                <div className="text-sm font-semibold flex items-center gap-1.5 mb-1.5"><FileText className="h-4 w-4 text-emerald-600" /> Materials Breakdown</div>
                <div className="rounded-lg border overflow-hidden">
                  {materials.map((m, i) => (
                    <div key={i} className={`flex justify-between items-center px-3 py-1.5 text-sm ${i % 2 === 0 ? "bg-muted/30" : ""}`}>
                      <span>{m.item} <span className="text-muted-foreground text-xs">({m.qty})</span></span>
                      <span className="font-semibold">₹{m.cost.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Labor & equipment */}
            <div className="grid md:grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/30 p-3">
                <div className="text-xs font-semibold flex items-center gap-1 text-muted-foreground uppercase"><Wrench className="h-3 w-3" /> Labor</div>
                <p className="text-sm mt-0.5">{estimate.laborRequired}</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <div className="text-xs font-semibold flex items-center gap-1 text-muted-foreground uppercase"><Wrench className="h-3 w-3" /> Equipment</div>
                <p className="text-sm mt-0.5">{estimate.equipmentNeeded}</p>
              </div>
            </div>

            <Separator />
            {/* Full draft */}
            <div>
              <div className="text-sm font-semibold mb-1">Full Engineering Draft</div>
              <pre className="whitespace-pre-wrap text-sm bg-muted/20 rounded-lg p-3 font-sans">{estimate.engineeringDraft}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
