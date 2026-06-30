"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Notification } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bell, CheckCircle2, Volume2, Loader2, Award, Vote, Flame, BellOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const TYPE_META: Record<string, { icon: any; color: string }> = {
  RESOLUTION_ALERT: { icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
  VOTE_MILESTONE: { icon: Vote, color: "text-orange-600 bg-orange-50" },
  BADGE_EARNED: { icon: Award, color: "text-amber-600 bg-amber-50" },
  PRIORITY_UPDATE: { icon: Flame, color: "text-purple-600 bg-purple-50" },
  NEW_COMPLAINT: { icon: Bell, color: "text-blue-600 bg-blue-50" },
};

export function NotificationsPanel() {
  const qc = useQueryClient();
  const [playing, setPlaying] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [liveAlert, setLiveAlert] = useState<Notification | null>(null);

  // We need the user id to identify with the websocket. We can get it from /api/auth/me.
  const { data: meData } = useQuery({ queryKey: ["me"], queryFn: api.me });
  const userId = meData?.user?.id;

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: api.listNotifications,
    refetchInterval: 20000,
  });

  // Connect to Jan Samvaad websocket for real-time alerts
  useEffect(() => {
    if (!userId) return;
    const socket = io("/?XTransformPort=3003", {
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      socket.emit("identify", { userId });
    });
    socket.on("jan-samvaad-event", (event: any) => {
      setLiveAlert(event);
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(event.title, { description: event.message });
    });
    return () => {
      socket.disconnect();
    };
  }, [userId, qc]);

  const markRead = async (id: string) => {
    await api.markRead(id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const playTTS = async (n: Notification) => {
    setPlaying(n.id);
    try {
      const url = await api.tts(`${n.title}. ${n.message}`);
      const audio = new Audio(url);
      await audio.play();
      audio.onended = () => setPlaying(null);
    } catch {
      toast.error("Voice playback failed");
      setPlaying(null);
    }
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-rose-600" />
            Jan Samvaad Notifications
          </h2>
          <p className="text-sm text-muted-foreground">Real-time alerts when your reported issues get resolved.</p>
        </div>
        {liveAlert && (
          <Badge className="bg-rose-100 text-rose-700 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-600 mr-1" /> Live
          </Badge>
        )}
      </div>

      {/* Live alert banner */}
      {liveAlert && (
        <Card className="border-2 border-rose-300 bg-rose-50 ai-glow">
          <CardContent className="py-4 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 shrink-0">
              <Bell className="h-5 w-5 text-rose-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-rose-900">{liveAlert.title}</div>
              <p className="text-sm text-rose-800">{liveAlert.message}</p>
              <div className="text-xs text-rose-600 mt-1">Just now · Jan Samvaad Live</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setLiveAlert(null)}>Dismiss</Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
        </div>
      ) : !notifications || notifications.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <BellOff className="mx-auto h-10 w-10 opacity-40" />
            <p className="mt-2">No notifications yet.</p>
            <p className="text-xs">You'll be alerted when issues you voted on get resolved.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const meta = TYPE_META[n.type] || TYPE_META.RESOLUTION_ALERT;
            return (
              <Card key={n.id} className={n.isRead ? "opacity-70" : "border-l-4 border-l-rose-400"}>
                <CardContent className="py-3 flex items-start gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${meta.color} shrink-0`}>
                    <meta.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{n.title}</span>
                      {!n.isRead && <Badge variant="outline" className="text-[9px] py-0">NEW</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    {n.complaint && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5">Re: {n.complaint.title}</p>
                    )}
                    <div className="text-xs text-muted-foreground/60 mt-0.5">{timeAgo(n.createdAt)}</div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => playTTS(n)} disabled={playing === n.id} className="h-7">
                      {playing === n.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Volume2 className="h-3.5 w-3.5" />}
                    </Button>
                    {!n.isRead && (
                      <Button size="sm" variant="ghost" onClick={() => markRead(n.id)} className="h-7 text-xs">
                        Mark read
                      </Button>
                    )}
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
