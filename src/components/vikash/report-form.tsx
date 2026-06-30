"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { CATEGORY_META, useVikash } from "./vikash-store";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  CameraOff,
  RefreshCw,
  Sparkles,
  Mic,
  Square,
  Loader2,
  MapPin,
  Send,
  CheckCircle2,
  Languages,
  Upload,
  Image as ImageIcon,
  AlertTriangle,
} from "lucide-react";

const CATS = Object.keys(CATEGORY_META);

// Sample images that work without a camera (the preview iframe blocks getUserMedia)
const SAMPLE_IMAGES = [
  { url: "/samples/pothole1.png", label: "Pothole", emoji: "🕳️" },
  { url: "/samples/garbage1.png", label: "Garbage", emoji: "🗑️" },
  { url: "/samples/streetlight1.png", label: "Streetlight", emoji: "💡" },
  { url: "/samples/drainage1.png", label: "Drainage", emoji: "🌊" },
];

// Helper: convert any image URL/file to a data URI (required by the VLM API,
// which can't reach localhost URLs from the sandbox)
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function urlToDataUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0);
      try {
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

export function ReportForm() {
  const qc = useQueryClient();
  const { user, setCitizenTab, triggerRefresh } = useVikash();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{ category: string; severity: string; analysis: string; recommendedAction: string } | null>(null);

  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("POTHOLE");
  const [severity, setSeverity] = useState("MEDIUM");
  const [address, setAddress] = useState("");
  const [ward, setWard] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [audioTranscript, setAudioTranscript] = useState("");
  const [voiceLang, setVoiceLang] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const startCamera = async () => {
    try {
      // Try back camera first (mobile), then fall back to any camera (desktop)
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
    } catch (e: any) {
      // Common cause: the preview iframe blocks camera via Permissions Policy
      toast.error("Camera unavailable in this view. Use Upload or a Sample image below.", {
        description: "Camera access is blocked inside the preview iframe. You can upload a photo or pick a sample image instead.",
      });
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  // Upload a photo from the user's device (works even when camera is blocked)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setCapturedImage(dataUrl);
      setAnalysis(null);
      captureLocation();
      toast.success("Image uploaded");
    } catch {
      toast.error("Could not read the image file");
    }
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  // Pick a sample image — converts it to a data URI so the VLM API can read it
  const pickSampleImage = async (url: string) => {
    try {
      const dataUrl = await urlToDataUrl(url);
      setCapturedImage(dataUrl);
      setAnalysis(null);
      captureLocation();
      toast.success("Sample image loaded — ready for AI analysis");
    } catch {
      toast.error("Could not load sample image");
    }
  };

  const captureLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
        },
        () => {
          setLat(25.2425);
          setLng(86.9842);
        }
      );
    } else {
      setLat(25.2425);
      setLng(86.9842);
    }
  };

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
    captureLocation();
  };

  const runAnalysis = async () => {
    if (!capturedImage) return;
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await api.liveAnalysis({ imageUrl: capturedImage });
      setAnalysis(res);
      setCategory(res.category in CATEGORY_META ? res.category : "OTHER");
      setSeverity(res.severity);
      if (!description) setDescription(res.analysis);
      toast.success("AI analysis complete — form auto-filled!");
    } catch (e: any) {
      toast.error(e.message || "AI analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(",")[1];
          setTranscribing(true);
          try {
            const res = await api.bhashaTranslate({ audioBase64: base64 });
            setAudioTranscript(res.administrativeSummary);
            setVoiceLang(res.sourceLanguage);
            if (!title) setTitle(res.administrativeSummary.slice(0, 50));
            toast.success(`Bhasha translated (${res.sourceLanguage}) — form updated!`);
          } catch (e: any) {
            toast.error(e.message || "Bhasha translation failed");
          } finally {
            setTranscribing(false);
          }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (e: any) {
      toast.error("Microphone blocked in this view. Type your description in Step 3 instead.", {
        description: "Mic access is blocked inside the preview iframe. You can type the description directly.",
      });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const submit = async () => {
    if (!title || !description || !address) {
      toast.error("Please fill title, description, and address");
      return;
    }
    setSubmitting(true);
    try {
      await api.createComplaint({
        title,
        description,
        category,
        severity,
        address,
        ward: ward || undefined,
        lat: lat ?? 25.2425,
        lng: lng ?? 86.9842,
        imageUrl: capturedImage || undefined,
        audioTranscript: audioTranscript || undefined,
        voiceLang: voiceLang || undefined,
        aiAnalysis: analysis?.analysis || undefined,
      });
      toast.success("Complaint filed! +10 Swachh Coins earned 🎉");
      qc.invalidateQueries({ queryKey: ["complaints"] });
      qc.invalidateQueries({ queryKey: ["rewards"] });
      triggerRefresh();
      // Reset
      setTitle(""); setDescription(""); setAddress(""); setWard("");
      setCapturedImage(null); setAnalysis(null); setAudioTranscript("");
      setCitizenTab("feed");
    } catch (e: any) {
      toast.error(e.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Card className="border-2 border-orange-200">
        <CardHeader className="bg-orange-50/50">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-orange-600" />
            Report a Civic Issue
            <Badge variant="outline" className="ml-auto border-orange-300 text-orange-700 bg-white">
              <Sparkles className="mr-1 h-3 w-3" /> AI-assisted
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          {/* Step 1: Capture / Upload the issue */}
          <div>
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-white text-xs">1</span>
              Add a photo (Camera, Upload, or Sample)
            </Label>
            <div className="mt-2 grid md:grid-cols-2 gap-3">
              <div className="relative aspect-video rounded-lg overflow-hidden bg-black border-2 border-dashed border-orange-200">
                {cameraOn ? (
                  <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
                ) : capturedImage ? (
                  <img src={capturedImage} alt="captured" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground p-3 text-center">
                    <CameraOff className="h-8 w-8 mb-2" />
                    <span className="text-xs">No image yet — use a button on the right</span>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex flex-col gap-2 justify-center">
                {/* Input methods when no image yet */}
                {!cameraOn && !capturedImage && (
                  <>
                    <Button onClick={startCamera} className="bg-orange-600 hover:bg-orange-700">
                      <Camera className="mr-2 h-4 w-4" /> Start Camera
                    </Button>
                    <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50">
                      <Upload className="mr-2 h-4 w-4" /> Upload Photo
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <div className="mt-1">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5 flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" /> Or pick a sample (to test AI)
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {SAMPLE_IMAGES.map((s) => (
                          <button
                            key={s.url}
                            type="button"
                            onClick={() => pickSampleImage(s.url)}
                            className="flex flex-col items-center gap-0.5 rounded-lg border border-orange-200 bg-orange-50/50 p-1.5 hover:bg-orange-100 transition-colors"
                          >
                            <span className="text-lg">{s.emoji}</span>
                            <span className="text-[9px] text-orange-800">{s.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {/* Camera active controls */}
                {cameraOn && (
                  <>
                    <Button onClick={capture} className="bg-orange-600 hover:bg-orange-700">
                      <Camera className="mr-2 h-4 w-4" /> Capture Photo
                    </Button>
                    <Button onClick={stopCamera} variant="outline">Cancel</Button>
                  </>
                )}
                {/* Image captured controls */}
                {capturedImage && (
                  <>
                    <Button onClick={runAnalysis} disabled={analyzing} className="bg-purple-600 hover:bg-purple-700">
                      {analyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : <><Sparkles className="mr-2 h-4 w-4" /> Run AI Analysis</>}
                    </Button>
                    <Button onClick={() => { setCapturedImage(null); setAnalysis(null); }} variant="outline" size="sm">
                      <RefreshCw className="mr-1 h-3.5 w-3.5" /> Use different image
                    </Button>
                  </>
                )}
                {analysis && (
                  <div className="rounded-md bg-purple-50 border border-purple-200 p-2 mt-1">
                    <div className="text-[10px] font-semibold text-purple-700 uppercase flex items-center gap-1">
                      <span className="chakra-spin inline-block">⚙️</span> VLM Result
                    </div>
                    <p className="text-xs text-purple-900 mt-0.5">{analysis.analysis}</p>
                    <p className="text-xs text-purple-700 mt-1">👉 {analysis.recommendedAction}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground bg-amber-50/60 border border-amber-100 rounded-md p-2">
              <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Camera may be blocked inside the preview iframe. If "Start Camera" fails, use <b>Upload Photo</b> or a <b>Sample</b> image — the AI analysis works with all three.
              </span>
            </div>
          </div>

          {/* Step 2: Voice input */}
          <div>
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-white text-xs">2</span>
              Voice input (Bhasha Translation — Hindi/Hinglish/Maithili/Bhojpuri)
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">(optional)</span>
            </Label>
            <div className="mt-2 flex items-center gap-2">
              {!recording ? (
                <Button onClick={startRecording} variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50">
                  <Mic className="mr-2 h-4 w-4" /> Start Recording
                </Button>
              ) : (
                <Button onClick={stopRecording} className="bg-red-600 hover:bg-red-700">
                  <Square className="mr-2 h-4 w-4" /> Stop & Translate
                </Button>
              )}
              {transcribing && (
                <span className="flex items-center gap-1.5 text-sm text-amber-700">
                  <Loader2 className="h-4 w-4 animate-spin" /> Translating via Bhasha engine...
                </span>
              )}
              {recording && (
                <span className="flex items-center gap-1.5 text-sm text-red-600 animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-red-600" /> Recording...
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Mic blocked in this view? Skip this step and type your description directly in Step 3 below.
            </p>
            {audioTranscript && (
              <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 p-2">
                <div className="text-[10px] font-semibold text-amber-700 uppercase flex items-center gap-1">
                  <Languages className="h-3 w-3" /> Administrative Summary {voiceLang && `(${voiceLang})`}
                </div>
                <p className="text-xs text-amber-900 mt-0.5">{audioTranscript}</p>
              </div>
            )}
          </div>

          {/* Step 3: Details */}
          <div>
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-white text-xs">3</span>
              Complaint Details
            </Label>
            <div className="mt-2 grid gap-3">
              <div>
                <Label htmlFor="r-title">Title *</Label>
                <Input id="r-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short title for the issue" />
              </div>
              <div>
                <Label htmlFor="r-desc">Description *</Label>
                <Textarea id="r-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue in detail" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CATEGORY_META[c].emoji} {CATEGORY_META[c].label} ({c})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Severity</Label>
                  <Select value={severity} onValueChange={setSeverity}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="r-addr">Address *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="r-addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, area, landmark" className="pl-9" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="r-ward">Ward</Label>
                  <Input id="r-ward" value={ward} onChange={(e) => setWard(e.target.value)} placeholder="e.g., Ward 12" />
                </div>
                <div>
                  <Label>GPS Location</Label>
                  <div className="flex h-9 items-center px-3 rounded-md border bg-muted/30 text-xs text-muted-foreground">
                    {lat != null && lng != null ? (
                      <><MapPin className="mr-1 h-3 w-3 text-emerald-600" /> {lat.toFixed(4)}, {lng.toFixed(4)}</>
                    ) : "Will auto-capture on photo"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button onClick={submit} disabled={submitting} className="flex-1 bg-orange-600 hover:bg-orange-700" size="lg">
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : <><Send className="mr-2 h-4 w-4" /> Submit Complaint (+10 Coins)</>}
            </Button>
            <Button variant="outline" size="lg" onClick={() => setCitizenTab("feed")}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
