import { createServer, IncomingMessage, ServerResponse } from "http";
import { Server, Socket } from "socket.io";

// Jan Samvaad Feedback Loop — real-time notification service
// Pushes resolution alerts, vote milestones, and badge earnings to citizens.

interface JanSamvaadEvent {
  type: "RESOLUTION_ALERT" | "VOTE_MILESTONE" | "BADGE_EARNED" | "PRIORITY_UPDATE" | "NEW_COMPLAINT";
  userId: string;
  complaintId?: string;
  title: string;
  message: string;
  timestamp: string;
}

const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  // Simple health check endpoint
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "jan-samvaad", connections: io.engine.clientsCount }));
    return;
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ service: "Jan Samvaad Notification Service" }));
});

const io = new Server(httpServer, {
  path: "/",
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Map of userId -> Set of socket ids (a user may have multiple tabs open)
const userSockets = new Map<string, Set<string>>();

io.on("connection", (socket: Socket) => {
  console.log(`[Jan Samvaad] Socket connected: ${socket.id}`);

  // A client identifies itself with their userId after connecting
  socket.on("identify", (data: { userId: string }) => {
    if (!data?.userId) return;
    socket.data.userId = data.userId;
    if (!userSockets.has(data.userId)) {
      userSockets.set(data.userId, new Set());
    }
    userSockets.get(data.userId)!.add(socket.id);
    socket.join(`user:${data.userId}`);
    console.log(`[Jan Samvaad] User ${data.userId} identified on socket ${socket.id}`);
    socket.emit("identified", { ok: true });
  });

  // Municipal dashboard broadcasts a resolution alert to all voters of a complaint
  socket.on(
    "broadcast-resolution",
    (data: { complaintId: string; voterIds: string[]; title: string; message: string }) => {
      const event: JanSamvaadEvent = {
        type: "RESOLUTION_ALERT",
        userId: "broadcast",
        complaintId: data.complaintId,
        title: data.title,
        message: data.message,
        timestamp: new Date().toISOString(),
      };
      data.voterIds.forEach((uid) => {
        io.to(`user:${uid}`).emit("jan-samvaad-event", { ...event, userId: uid });
      });
      console.log(
        `[Jan Samvaad] Resolution alert broadcast to ${data.voterIds.length} voters for complaint ${data.complaintId}`
      );
    }
  );

  // Notify a single user (badge earned, etc.)
  socket.on("notify-user", (data: JanSamvaadEvent) => {
    io.to(`user:${data.userId}`).emit("jan-samvaad-event", data);
    console.log(`[Jan Samvaad] Notified user ${data.userId}: ${data.title}`);
  });

  // Simulate a live "community pulse" feed — new complaints coming in
  socket.on("new-complaint-broadcast", (data: { complaintId: string; title: string; ward: string }) => {
    io.emit("jan-samvaad-event", {
      type: "NEW_COMPLAINT",
      userId: "broadcast",
      complaintId: data.complaintId,
      title: "Nayi complaint aayi hai!",
      message: `${data.title} — Ward: ${data.ward}`,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("disconnect", () => {
    const uid = socket.data.userId as string | undefined;
    if (uid && userSockets.has(uid)) {
      userSockets.get(uid)!.delete(socket.id);
      if (userSockets.get(uid)!.size === 0) {
        userSockets.delete(uid);
      }
    }
    console.log(`[Jan Samvaad] Socket disconnected: ${socket.id}`);
  });

  socket.on("error", (err: Error) => {
    console.error(`[Jan Samvaad] Socket error (${socket.id}):`, err.message);
  });
});

const PORT = 3003;
httpServer.listen(PORT, () => {
  console.log(`🇮🇳 Jan Samvaad Notification Service running on port ${PORT}`);
});

process.on("SIGTERM", () => {
  console.log("[Jan Samvaad] SIGTERM received, shutting down...");
  httpServer.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  console.log("[Jan Samvaad] SIGINT received, shutting down...");
  httpServer.close(() => process.exit(0));
});
