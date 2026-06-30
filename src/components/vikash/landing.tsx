"use client";

import { useState } from "react";
import { useVikash } from "./vikash-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { api, type Stats } from "@/lib/api-client";
import { signInWithGoogle } from "@/lib/firebase";
import { toast } from "sonner";
import {
  Camera,
  Mic,
  Vote,
  ShieldCheck,
  Calculator,
  Bell,
  Users,
  Building2,
  TrendingUp,
  Sparkles,
  Phone,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const AI_AGENTS = [
  {
    icon: Camera,
    title: "Multimodal Live Agent",
    desc: "Real-time camera analysis of infrastructure damage — potholes, garbage, drainage — auto-fills your complaint.",
    color: "text-orange-600 bg-orange-50",
  },
  {
    icon: Sparkles,
    title: "Semantic Clustering Engine",
    desc: "Groups duplicate complaints within 50m. Surfaces the top 5-10 critical regional issues for community voting.",
    color: "text-purple-600 bg-purple-50",
  },
  {
    icon: Calculator,
    title: "AI Budget & Feasibility Estimator",
    desc: "Generates engineering drafts with cost, materials & timeline for highly-voted issues.",
    color: "text-emerald-600 bg-emerald-50",
  },
  {
    icon: Mic,
    title: "Bhasha Translation Engine",
    desc: "Accepts Hindi, Hinglish, Maithili, Bhojpuri voice inputs → professional administrative summary.",
    color: "text-amber-600 bg-amber-50",
  },
  {
    icon: Bell,
    title: "Jan Samvaad Feedback Loop",
    desc: "When an issue is resolved, all voters get an autonomous voice + notification alert.",
    color: "text-rose-600 bg-rose-50",
  },
];

export function Landing() {
  const { setUser, setLoading } = useVikash();
  const [showCitizenLogin, setShowCitizenLogin] = useState(false);
  const [showMunicipalLogin, setShowMunicipalLogin] = useState(false);

  const { data: stats } = useQuery<Stats>({
    queryKey: ["stats"],
    queryFn: api.stats,
  });

  const guestLogin = async () => {
    setLoading(true);
    try {
      const { user } = await api.citizenLogin({ guest: true });
      setUser(user);
      toast.success(`Swagat hai, ${user.name}!`);
    } catch (e) {
      toast.error("Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-orange-50/60 via-white to-emerald-50/40" />
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-orange-200/30 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
        </div>
        <div className="container mx-auto px-4 py-12 md:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-primary">
              <span className="mr-1">🇮🇳</span> Proudly Indian · Swachh Bharat Mission
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
              विकास पथ
              <span className="block mt-2 text-2xl md:text-4xl bg-gradient-to-r from-orange-600 via-amber-600 to-emerald-600 bg-clip-text text-transparent">
                Vikash Path
              </span>
            </h1>
            <p className="mt-5 text-lg md:text-xl text-muted-foreground font-medium">
              Janta ki pukaar, AI ka vishleshan, aur verified prashasan.
            </p>
            <p className="mt-2 text-sm md:text-base text-muted-foreground/80 max-w-2xl mx-auto">
              An AI-powered hyperlocal progress tracker. Citizens report civic issues, AI prioritizes them,
              and verified municipal officers resolve — with full transparency.
            </p>

            {/* Role selection */}
            <div className="mt-10 grid gap-4 md:grid-cols-3 max-w-3xl mx-auto">
              <Card className="border-2 hover:border-orange-300 hover:shadow-lg transition-all cursor-pointer group" onClick={() => setShowCitizenLogin(true)}>
                <CardHeader className="pb-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 group-hover:scale-110 transition-transform">
                    <Users className="h-7 w-7 text-orange-600" />
                  </div>
                  <CardTitle className="text-center text-lg">Citizen Portal</CardTitle>
                </CardHeader>
                <CardContent className="text-center pt-0">
                  <p className="text-sm text-muted-foreground">Report issues, vote for priorities, earn Swachh Coins</p>
                  <Button className="mt-3 w-full bg-orange-600 hover:bg-orange-700" size="sm">
                    Login as Nagrik <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-amber-300 hover:shadow-lg transition-all cursor-pointer group" onClick={guestLogin}>
                <CardHeader className="pb-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 group-hover:scale-110 transition-transform">
                    <Sparkles className="h-7 w-7 text-amber-600" />
                  </div>
                  <CardTitle className="text-center text-lg">Guest Access</CardTitle>
                </CardHeader>
                <CardContent className="text-center pt-0">
                  <p className="text-sm text-muted-foreground">Explore the platform instantly, no signup needed</p>
                  <Button variant="outline" className="mt-3 w-full border-amber-300 text-amber-700 hover:bg-amber-50" size="sm">
                    Continue as Guest
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-emerald-300 hover:shadow-lg transition-all cursor-pointer group" onClick={() => setShowMunicipalLogin(true)}>
                <CardHeader className="pb-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 group-hover:scale-110 transition-transform">
                    <Building2 className="h-7 w-7 text-emerald-600" />
                  </div>
                  <CardTitle className="text-center text-lg">Municipal Dashboard</CardTitle>
                </CardHeader>
                <CardContent className="text-center pt-0">
                  <p className="text-sm text-muted-foreground">Strict official access for verified govt officers</p>
                  <Button className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700" size="sm">
                    Official Login <ShieldCheck className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Stats strip */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <StatCard icon={TrendingUp} label="Total Complaints" value={stats?.totalComplaints ?? "—"} color="text-orange-600" />
            <StatCard icon={CheckCircle2} label="Resolved" value={stats?.resolvedCount ?? "—"} color="text-emerald-600" />
            <StatCard icon={Users} label="Active Citizens" value={stats?.totalCitizens ?? "—"} color="text-amber-600" />
            <StatCard icon={Building2} label="Verified Officials" value={stats?.totalOfficials ?? "—"} color="text-purple-600" />
          </div>
        </div>
      </section>

      {/* AI Agents */}
      <section className="container mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-3 border-primary/30 bg-primary/5 text-primary">
            <Sparkles className="mr-1 h-3 w-3" /> 5 Core AI Agents
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight">AI-Powered Civic Intelligence</h2>
          <p className="mt-2 text-muted-foreground">Five autonomous agents working together for transparent governance</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {AI_AGENTS.map((agent) => (
            <Card key={agent.title} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${agent.color}`}>
                  <agent.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-base mt-1">{agent.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{agent.desc}</p>
              </CardContent>
            </Card>
          ))}
          <Card className="border-dashed bg-muted/30">
            <CardHeader>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <Vote className="h-6 w-6" />
              </div>
              <CardTitle className="text-base mt-1">Gamification & Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Earn Swachh Coins for genuine reports. Unlock badges: Swachhta Yodha, Gram Veer, Community Leader.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/30 border-y">
        <div className="container mx-auto px-4 py-12">
          <h2 className="text-center text-3xl font-bold tracking-tight mb-10">How Vikash Path Works</h2>
          <div className="grid gap-6 md:grid-cols-4 max-w-5xl mx-auto">
            {[
              { n: "1", t: "Report", d: "Citizen snaps a photo or speaks — AI auto-fills the complaint.", c: "border-orange-200 bg-orange-50" },
              { n: "2", t: "Cluster & Prioritize", d: "AI groups duplicates & ranks the most critical issues daily.", c: "border-purple-200 bg-purple-50" },
              { n: "3", t: "Vote & Estimate", d: "Community votes; AI generates cost & feasibility drafts.", c: "border-amber-200 bg-amber-50" },
              { n: "4", t: "Resolve & Notify", d: "Officers fix & upload proof — voters get voice alerts.", c: "border-emerald-200 bg-emerald-50" },
            ].map((s) => (
              <div key={s.n} className={`rounded-xl border-2 p-5 ${s.c}`}>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-primary font-bold border border-primary/30">
                  {s.n}
                </div>
                <h3 className="mt-3 font-bold text-lg">{s.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {showCitizenLogin && (
        <CitizenLoginDialog onClose={() => setShowCitizenLogin(false)} />
      )}
      {showMunicipalLogin && (
        <MunicipalLoginDialog onClose={() => setShowMunicipalLogin(false)} />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  return (
    <Card className="text-center">
      <CardContent className="pt-5 pb-5">
        <Icon className={`mx-auto h-6 w-6 ${color}`} />
        <div className="mt-2 text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function CitizenLoginDialog({ onClose }: { onClose: () => void }) {
  const { setUser, setLoading } = useVikash();
  const [mode, setMode] = useState<"phone" | "guest">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setLoading(true);
    try {
      const { user } = await api.citizenLogin({ phone, name, otp });
      setUser(user);
      toast.success(`Swagat hai, ${user.name}!`);
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Login failed");
      setLoading(false);
    } finally {
      setBusy(false);
    }
  };

  const guest = async () => {
    setBusy(true);
    setLoading(true);
    try {
      const { user } = await api.citizenLogin({ guest: true });
      setUser(user);
      toast.success(`Swagat hai, ${user.name}!`);
      onClose();
    } catch {
      toast.error("Login failed");
      setLoading(false);
    } finally {
      setBusy(false);
    }
  };

  const googleSignIn = async () => {
    setBusy(true);
    setLoading(true);
    try {
      const googleUser = await signInWithGoogle();
      if (!googleUser.email) {
        throw new Error("No email returned from Google account");
      }
      const { user } = await api.citizenLogin({
        email: googleUser.email,
        name: googleUser.displayName || undefined,
      });
      setUser(user);
      toast.success(`Swagat hai, ${user.name}!`);
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Google Sign-In failed");
      setLoading(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
              <Users className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <CardTitle>Citizen Login</CardTitle>
              <p className="text-xs text-muted-foreground">Nagrik portal — report & vote</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button size="sm" variant={mode === "phone" ? "default" : "outline"} onClick={() => setMode("phone")} className={mode === "phone" ? "bg-orange-600 hover:bg-orange-700" : ""}>
              <Phone className="mr-1 h-3.5 w-3.5" /> Phone OTP
            </Button>
            <Button size="sm" variant={mode === "guest" ? "default" : "outline"} onClick={() => setMode("guest")} className={mode === "guest" ? "bg-orange-600 hover:bg-orange-700" : ""}>
              <Sparkles className="mr-1 h-3.5 w-3.5" /> Guest
            </Button>
          </div>

          {mode === "phone" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="cname">Naam (Name)</Label>
                <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aapka naam" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cphone">Mobile Number</Label>
                <Input id="cphone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" maxLength={10} />
              </div>
              {otpSent && (
                <div className="space-y-2">
                  <Label htmlFor="cotp">OTP (any 4 digits for demo)</Label>
                  <Input id="cotp" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="1234" maxLength={4} />
                </div>
              )}
              {!otpSent ? (
                <Button className="w-full bg-orange-600 hover:bg-orange-700" disabled={!phone || phone.length < 10 || busy} onClick={() => { setOtpSent(true); toast.success("OTP sent! Use any 4 digits for demo."); }}>
                  Send OTP
                </Button>
              ) : (
                <Button className="w-full bg-orange-600 hover:bg-orange-700" disabled={otp.length < 4 || busy} onClick={submit}>
                  {busy ? "Verifying..." : "Verify & Login"}
                </Button>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Guest access lets you explore the citizen portal instantly. Your reports will be tagged as "Guest Nagrik".</p>
              <Button className="w-full bg-orange-600 hover:bg-orange-700" disabled={busy} onClick={guest}>
                {busy ? "Logging in..." : "Continue as Guest"}
              </Button>
            </>
          )}

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-muted" />
            <span className="flex-shrink mx-4 text-muted-foreground text-xs uppercase">Or</span>
            <div className="flex-grow border-t border-muted" />
          </div>

          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2 border-2 hover:bg-muted"
            disabled={busy}
            onClick={googleSignIn}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Sign in with Google
          </Button>

          <Button variant="ghost" className="w-full" onClick={onClose}>Cancel</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function MunicipalLoginDialog({ onClose }: { onClose: () => void }) {
  const { setUser, setLoading } = useVikash();
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setLoading(true);
    try {
      const { user } = await api.municipalLogin({ email, employeeId });
      setUser(user);
      toast.success(`Verified access granted — ${user.name}`);
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Verification failed");
      setLoading(false);
    } finally {
      setBusy(false);
    }
  };

  const useDemo = () => {
    setEmail("a.p.mehta@nagarnigam.gov.in");
    setEmployeeId("MUN-BHR-2014-0892");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <Card className="w-full max-w-md border-2 border-emerald-200" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle>Municipal Officer Login</CardTitle>
              <p className="text-xs text-muted-foreground">Strict verification · Govt officials only</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Casual signups are <b>strictly blocked</b>. Only official <code>.gov.in</code> domain emails with valid Employee ID are accepted.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="memail">Official Govt Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="memail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@nagarnigam.gov.in" className="pl-9" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="meid">Employee ID</Label>
            <Input id="meid" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="MUN-XXX-YYYY-NNNN" />
          </div>
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={!email || !employeeId || busy} onClick={submit}>
            {busy ? "Verifying credentials..." : "Verify & Access Dashboard"}
          </Button>
          <button onClick={useDemo} className="w-full text-xs text-emerald-700 hover:underline">
            Use demo official credentials (Anil Prasad Mehta, Roads & Infrastructure)
          </button>
          <Button variant="ghost" className="w-full" onClick={onClose}>Cancel</Button>
        </CardContent>
      </Card>
    </div>
  );
}
