"use client";

import { useEffect } from "react";
import { useVikash } from "@/components/vikash/vikash-store";
import { Header } from "@/components/vikash/header";
import { Footer } from "@/components/vikash/footer";
import { Landing } from "@/components/vikash/landing";
import { CitizenPortal } from "@/components/vikash/citizen-portal";
import { MunicipalDashboard } from "@/components/vikash/municipal-dashboard";
import { api } from "@/lib/api-client";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, loading, view, setUser, setLoading } = useVikash();

  useEffect(() => {
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [setUser]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Vikash Path load ho raha hai...</p>
          </div>
        ) : !user || view === "landing" ? (
          <Landing />
        ) : view === "citizen" ? (
          <CitizenPortal />
        ) : (
          <MunicipalDashboard />
        )}
      </main>
      <Footer />
    </div>
  );
}
