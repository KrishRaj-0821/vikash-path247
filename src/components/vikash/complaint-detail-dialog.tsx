"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CATEGORY_META, SEVERITY_META, STATUS_META } from "./vikash-store";
import type { Complaint } from "@/lib/api-client";
import { MapPin, ThumbsUp, Clock, Calendar, ShieldCheck, Calculator, CheckCircle2, FileText, Wrench } from "lucide-react";

export function ComplaintDetailDialog({
  complaint,
  open,
  onOpenChange,
}: {
  complaint: Complaint | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!complaint) return null;
  const cat = CATEGORY_META[complaint.category] || CATEGORY_META.OTHER;
  const sev = SEVERITY_META[complaint.severity] || SEVERITY_META.MEDIUM;
  const st = STATUS_META[complaint.status] || STATUS_META.PENDING;

  let materials: { item: string; qty: string; cost: number }[] = [];
  try {
    materials = complaint.budgetEstimate ? JSON.parse(complaint.budgetEstimate.materials) : [];
  } catch {}

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${cat.color} border`}>{cat.emoji} {cat.label}</Badge>
            <Badge variant="outline" className={sev.color}><ShieldCheck className="mr-1 h-3 w-3" />{sev.label}</Badge>
            <Badge className={st.color}>{st.label}</Badge>
            <Badge variant="outline">Priority: {complaint.priorityScore.toFixed(0)}</Badge>
          </div>
          <DialogTitle className="text-xl mt-2">{complaint.title}</DialogTitle>
          <DialogDescription className="flex items-center gap-1 text-xs">
            <MapPin className="h-3 w-3" /> {complaint.address}
            {complaint.ward && <span className="ml-1">· Ward: {complaint.ward}</span>}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[60vh] pr-3 custom-scrollbar">
          <div className="space-y-4">
            {complaint.imageUrl && (
               
              <img src={complaint.imageUrl} alt={complaint.title} className="w-full h-56 object-cover rounded-lg" />
            )}

            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Description</h4>
              <p className="mt-1 text-sm">{complaint.description}</p>
            </div>

            {complaint.audioTranscript && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 uppercase">
                  🎙️ Bhasha Translation {complaint.voiceLang && `(${complaint.voiceLang})`}
                </div>
                <p className="mt-1 text-sm text-amber-900">{complaint.audioTranscript}</p>
              </div>
            )}

            {complaint.aiAnalysis && (
              <div className="rounded-lg bg-orange-50 border border-orange-200 p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-800 uppercase">
                  <span className="chakra-spin inline-block">⚙️</span> VLM Live Agent Analysis
                </div>
                <p className="mt-1 text-sm text-orange-900">{complaint.aiAnalysis}</p>
              </div>
            )}

            {complaint.cluster && (
              <div className="rounded-lg bg-purple-50 border border-purple-200 p-3">
                <div className="text-xs font-semibold text-purple-800 uppercase">🔗 Semantic Cluster</div>
                <p className="mt-0.5 font-medium text-purple-900">{complaint.cluster.name}</p>
                {complaint.cluster.summary && (
                  <p className="mt-1 text-sm text-purple-800/80">{complaint.cluster.summary}</p>
                )}
              </div>
            )}

            {complaint.budgetEstimate && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 uppercase">
                  <Calculator className="h-3.5 w-3.5" /> AI Budget & Feasibility Estimate
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-emerald-700">₹{complaint.budgetEstimate.estimatedCost.toLocaleString("en-IN")}</div>
                    <div className="text-[10px] text-emerald-700/70">Estimated Cost</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-emerald-700">{complaint.budgetEstimate.timeline}</div>
                    <div className="text-[10px] text-emerald-700/70">Timeline</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-emerald-700">{complaint.budgetEstimate.riskLevel}</div>
                    <div className="text-[10px] text-emerald-700/70">Risk</div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-emerald-800/70">
                  Range: ₹{complaint.budgetEstimate.costMin.toLocaleString("en-IN")} – ₹{complaint.budgetEstimate.costMax.toLocaleString("en-IN")}
                </div>
                {materials.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1"><FileText className="h-3 w-3" /> Materials</div>
                    <ul className="mt-1 space-y-0.5">
                      {materials.map((m, i) => (
                        <li key={i} className="text-xs flex justify-between text-emerald-900/80">
                          <span>{m.item} ({m.qty})</span>
                          <span>₹{m.cost.toLocaleString("en-IN")}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Separator className="my-2 bg-emerald-200" />
                <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1"><Wrench className="h-3 w-3" /> Labor & Equipment</div>
                <p className="text-xs text-emerald-900/80">{complaint.budgetEstimate.laborRequired}</p>
                <p className="text-xs text-emerald-900/80">{complaint.budgetEstimate.equipmentNeeded}</p>
                <Separator className="my-2 bg-emerald-200" />
                <div className="text-xs font-semibold text-emerald-800">Engineering Draft</div>
                <pre className="mt-1 text-xs text-emerald-900/80 whitespace-pre-wrap font-sans">{complaint.budgetEstimate.engineeringDraft}</pre>
              </div>
            )}

            {complaint.resolution && (
              <div className="rounded-lg bg-green-50 border border-green-300 p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-green-800 uppercase">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Resolution Proof
                </div>
                <p className="mt-1 text-sm text-green-900">{complaint.resolution.resolutionNote}</p>
                {complaint.resolution.actualCost != null && (
                  <p className="mt-1 text-xs text-green-800">Actual Cost: ₹{complaint.resolution.actualCost.toLocaleString("en-IN")}</p>
                )}
                {complaint.resolution.proofImageUrl && (
                   
                  <img src={complaint.resolution.proofImageUrl} alt="Proof" className="mt-2 w-full h-32 object-cover rounded" />
                )}
                <p className="mt-1 text-xs text-green-700 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Resolved by {complaint.resolution.resolver?.name || "Official"} on {new Date(complaint.resolution.resolvedAt).toLocaleDateString()}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
              <span>Reported by <b className="text-foreground">{complaint.reporter?.name}</b></span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(complaint.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <ThumbsUp className="h-4 w-4 text-orange-600" />
              <b>{complaint._count?.votes ?? complaint.votes?.length ?? 0}</b> community votes
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
