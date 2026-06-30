"use client";

import { useVikash } from "./vikash-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Coins, LogOut, ShieldCheck, User as UserIcon, ChevronDown, Bell } from "lucide-react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

// Precompute Ashoka Chakra spoke endpoints at module scope with rounding.
// Math.cos/sin produce slightly different floating-point values on the server
// (Node.js) vs client (browser V8), which causes a hydration mismatch.
// Rounding to 2 decimals yields identical, deterministic values on both sides.
const CHAKRA_SPOKES_24 = Array.from({ length: 24 }, (_, i) => {
  const a = (i * 15 * Math.PI) / 180;
  return {
    x2: Math.round((12 + 9 * Math.cos(a)) * 100) / 100,
    y2: Math.round((12 + 9 * Math.sin(a)) * 100) / 100,
  };
});

export function Header() {
  const { user, setUser, setView } = useVikash();

  const { data: notifData } = useQuery({
    queryKey: ["notifications-count", user?.id],
    queryFn: async () => {
      const list = await api.listNotifications();
      return list.filter((n) => !n.isRead).length;
    },
    enabled: !!user && user.role === "CITIZEN",
    refetchInterval: 15000,
  });

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
      toast.success("Logged out successfully");
    } catch {
      toast.error("Logout failed");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="tricolor-bar h-1.5 w-full" />
      <div className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <button
            onClick={() => setView(user ? (user.role === "MUNICIPAL" ? "municipal" : "citizen") : "landing")}
            className="flex items-center gap-2.5 group"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-background overflow-hidden shadow-sm">
              <img
                src="/logo.svg"
                alt="Vikash Path Logo"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="text-left">
              <div className="font-bold leading-tight text-foreground text-lg">
                विकास पथ
              </div>
              <div className="text-[10px] leading-tight text-muted-foreground font-medium tracking-wide uppercase">
                Vikash Path
              </div>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                {user.role === "CITIZEN" && (
                  <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1">
                    <Coins className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-sm font-bold text-amber-700">{user.swachhCoins}</span>
                    <span className="text-xs text-amber-600">Swachh Coins</span>
                  </div>
                )}
                {user.role === "MUNICIPAL" && (
                  <Badge variant="outline" className="hidden sm:flex items-center gap-1 border-emerald-300 bg-emerald-50 text-emerald-700">
                    <ShieldCheck className="h-3 w-3" />
                    {user.department}
                  </Badge>
                )}
                {notifData ? (
                  <div className="flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-1">
                    <Bell className="h-3.5 w-3.5 text-red-600" />
                    <span className="text-xs font-bold text-red-700">{notifData}</span>
                  </div>
                ) : null}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2 px-2 hover:bg-accent">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                          {user.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden md:inline text-sm font-medium max-w-[120px] truncate">
                        {user.name}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="flex flex-col gap-0.5">
                      <span>{user.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {user.email || user.phone || "Guest"}
                      </span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2 text-muted-foreground" disabled>
                      <UserIcon className="h-4 w-4" />
                      {user.role === "CITIZEN" ? "Nagrik (Citizen)" : "Municipal Officer"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="gap-2 text-red-600 focus:text-red-700">
                      <LogOut className="h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button onClick={() => setView("landing")} variant="ghost" size="sm">
                Home
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
