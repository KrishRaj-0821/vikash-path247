"use client";

import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api, type Complaint } from "@/lib/api-client";
import { CATEGORY_META, SEVERITY_META } from "./vikash-store";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Send, CameraOff, CheckCircle2, RefreshCw, Bell, ShieldCheck, Upload } from "lucide-react";

// Convert a File to a data URI
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ResolutionDialog({
  complaint,
  open,
  onOpenChange,
}: {
  complaint: Complaint | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [cost, setCost] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ votersNotified: number } | null>(null);

  const startCamera = async () => {
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      toast.error("Camera blocked in this view. Use Upload Photo instead.", {
        description: "Camera access is blocked inside the preview iframe. Upload a photo from your device instead.",
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setProofImage(dataUrl);
      toast.success("Proof photo uploaded");
    } catch {
      toast.error("Could not read the image file");
    }
    e.target.value = "";
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
    setProofImage(c.toDataURL("image/jpeg", 0.85));
    stopCamera();
  };

  const submit = async () => {
    if (!complaint || !note) {
      toast.error("Please add a resolution note");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.resolve(complaint.id, {
        proofImageUrl: proofImage || undefined,
        resolutionNote: note,
        actualCost: cost ? parseFloat(cost) : undefined,
      });
      setResult({ votersNotified: res.votersNotified });
      toast.success(`Resolved! ${res.votersNotified} citizens notified via Jan Samvaad.`);
      qc.invalidateQueries({ queryKey: ["municipal-complaints"] });
      qc.invalidateQueries({ queryKey: ["complaints"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to resolve");
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    stopCamera();
    setProofImage(null);
    setNote("");
    setCost("");
    setResult(null);
    onOpenChange(false);
  };

  if (!complaint) return null;
  const cat = CATEGORY_META[complaint.category] || CATEGORY_META.OTHER;
  const sev = SEVERITY_META[complaint.severity] || SEVERITY_META.MEDIUM;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <Badge variant="outline" className="w-fit border-emerald-300 text-emerald-700 bg-emerald-50">
            <ShieldCheck className="mr-1 h-3 w-3" /> Municipal Resolution
          </Badge>
          <DialogTitle className="text-xl mt-1">Resolve Complaint</DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap">
            <Badge className={cat.color}>{cat.emoji} {cat.label}</Badge>
            <Badge variant="outline" className={sev.color}>{sev.label}</Badge>
            <span className="text-sm">{complaint.title}</span>
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="py-6 text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" />
            </div>
            <div>
              <div className="font-bold text-lg">Complaint Resolved Successfully!</div>
              <p className="text-sm text-muted-foreground">
                {result.votersNotified} citizens who voted for this issue have been notified via the Jan Samvaad feedback loop.
              </p>
            </div>
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-left">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 uppercase">
                <Bell className="h-3 w-3" /> Jan Samvaad Triggered
              </div>
              <p className="text-xs text-rose-800 mt-0.5">
                Voice alerts + notifications sent to all {result.votersNotified} voters. They'll be asked to verify the resolution on-ground.
              </p>
            </div>
            <Button onClick={close} className="bg-emerald-600 hover:bg-emerald-700 w-full">Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Proof camera */}
            <div>
              <Label className="text-sm font-semibold">Upload Resolution Proof (Photo)</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-black border-2 border-dashed border-emerald-200">
                  {cameraOn ? (
                    <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
                  ) : proofImage ? (
                     
                    <img src={proofImage} alt="proof" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground">
                      <CameraOff className="h-6 w-6 mb-1" />
                      <span className="text-xs">No proof photo</span>
                    </div>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                <div className="flex flex-col gap-1.5 justify-center">
                  {!cameraOn && !proofImage && (
                    <>
                      <Button size="sm" onClick={startCamera} variant="outline" className="border-emerald-300 text-emerald-700">
                        <Camera className="mr-1 h-3.5 w-3.5" /> Start Camera
                      </Button>
                      <Button size="sm" onClick={() => fileInputRef.current?.click()} variant="outline" className="border-emerald-300 text-emerald-700">
                        <Upload className="mr-1 h-3.5 w-3.5" /> Upload Photo
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </>
                  )}
                  {cameraOn && (
                    <>
                      <Button size="sm" onClick={capture} className="bg-emerald-600 hover:bg-emerald-700">
                        <Camera className="mr-1 h-3.5 w-3.5" /> Capture
                      </Button>
                      <Button size="sm" variant="outline" onClick={stopCamera}>Cancel</Button>
                    </>
                  )}
                  {proofImage && (
                    <Button size="sm" variant="outline" onClick={() => { setProofImage(null); }}>
                      <RefreshCw className="mr-1 h-3.5 w-3.5" /> Change Photo
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Note */}
            <div>
              <Label htmlFor="rnote" className="text-sm font-semibold">Resolution Note *</Label>
              <Textarea id="rnote" value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                placeholder="Describe the work done, materials used, team dispatched, etc." />
            </div>

            {/* Cost */}
            <div>
              <Label htmlFor="rcost" className="text-sm font-semibold">Actual Cost (₹) — Optional</Label>
              <Input id="rcost" type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="e.g., 8500" />
            </div>

            <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800 flex items-start gap-2">
              <Bell className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>On submit, the Jan Samvaad feedback loop will notify all citizens who voted for this issue (voice + notification alert).</span>
            </div>

            <div className="flex gap-2">
              <Button onClick={submit} disabled={submitting || !note} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resolving...</> : <><Send className="mr-2 h-4 w-4" /> Resolve & Notify</>}
              </Button>
              <Button variant="outline" onClick={close}>Cancel</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
