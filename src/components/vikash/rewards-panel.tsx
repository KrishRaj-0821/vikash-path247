"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BADGE_META } from "./vikash-store";
import { Coins, Award, TrendingUp, Calendar } from "lucide-react";

export function RewardsPanel() {
  const { data } = useQuery({
    queryKey: ["rewards"],
    queryFn: api.rewards,
  });

  const coins = data?.swachhCoins ?? 0;
  const nextBadge = coins < 100 ? "Gram Veer" : coins < 250 ? "Swachhta Yodha" : coins < 500 ? "Community Leader" : "Maxed out!";
  const progress = Math.min(100, (coins % 250) / 2.5);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Award className="h-6 w-6 text-amber-600" />
          My Swachh Rewards
        </h2>
        <p className="text-sm text-muted-foreground">Earn Swachh Coins for genuine reports & upvotes. Unlock badges.</p>
      </div>

      {/* Coin balance card */}
      <Card className="overflow-hidden border-2 border-amber-300">
        <div className="bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm uppercase tracking-wide opacity-90">Swachh Coins Balance</div>
              <div className="text-5xl font-bold mt-1 flex items-center gap-2">
                <Coins className="h-9 w-9" />
                {coins}
              </div>
            </div>
            <div className="text-right text-sm opacity-90">
              <div className="text-xs">Next badge</div>
              <div className="font-semibold">{nextBadge}</div>
            </div>
          </div>
          <div className="mt-4 h-2 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs mt-1.5 opacity-90">Keep reporting & voting to earn more!</p>
        </div>
      </Card>

      {/* Earning rules */}
      <div className="grid md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-5 text-center">
            <div className="text-2xl font-bold text-orange-600">+10</div>
            <div className="text-xs text-muted-foreground">Per genuine complaint filed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <div className="text-2xl font-bold text-orange-600">+2</div>
            <div className="text-xs text-muted-foreground">Per upvote you cast</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <div className="text-2xl font-bold text-orange-600">+50</div>
            <div className="text-xs text-muted-foreground">When your report gets resolved</div>
          </CardContent>
        </Card>
      </div>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="h-5 w-5 text-amber-600" /> Earned Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(BADGE_META).filter(([k]) => k !== "VERIFIED_OFFICIAL").map(([key, meta]) => {
              const earned = data?.badges?.some((b) => b.badgeType === key);
              return (
                <div
                  key={key}
                  className={`rounded-lg border-2 p-4 text-center transition-all ${
                    earned ? "border-amber-300 bg-amber-50" : "border-dashed border-muted bg-muted/20 opacity-60"
                  }`}
                >
                  <div className={`text-4xl ${earned ? "" : "grayscale"}`}>{meta.emoji}</div>
                  <div className="mt-1 font-semibold text-sm">{meta.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{meta.desc}</div>
                  {earned && (
                    <Badge className="mt-2 bg-amber-500 text-white text-[10px]">Earned</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
