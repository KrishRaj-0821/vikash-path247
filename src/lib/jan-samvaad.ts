import { io, Socket } from "socket.io-client";

/**
 * Jan Samvaad — server-side WebSocket client helper.
 *
 * Connects (lazily) to the Jan Samvaad socket.io service on port 3003,
 * and exposes helpers to broadcast events from Next.js API routes.
 *
 * Designed to be fault-tolerant: lazy connect, auto-reconnect, and best-effort
 * fire-and-forget semantics (DB rows are always the source of truth).
 */

const JAN_SAMVAAD_URL =
  process.env.JAN_SAMVAAD_URL || "http://localhost:3003";

let socket: Socket | null = null;
let connecting: Promise<Socket> | null = null;

function getSocket(): Promise<Socket> {
  if (socket && socket.connected) return Promise.resolve(socket);

  if (connecting) return connecting;

  connecting = new Promise<Socket>((resolve, reject) => {
    const s = io(JAN_SAMVAAD_URL, {
      path: "/",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 4000,
      autoConnect: true,
    });

    s.once("connect", () => {
      socket = s;
      connecting = null;
      console.log("[Jan Samvaad client] Connected to", JAN_SAMVAAD_URL);
      resolve(s);
    });

    s.once("connect_error", (err: Error) => {
      connecting = null;
      console.error("[Jan Samvaad client] Connect error:", err.message);
      reject(err);
    });

    s.on("disconnect", (reason: string) => {
      console.warn("[Jan Samvaad client] Disconnected:", reason);
      if (socket === s) socket = null;
    });

    s.on("reconnect", (attempt: number) => {
      console.log(`[Jan Samvaad client] Reconnected after ${attempt} attempts`);
      socket = s;
      connecting = null;
    });
  });

  return connecting;
}

export interface BroadcastResolutionInput {
  complaintId: string;
  voterIds: string[];
  title: string;
  message: string;
}

/**
 * Broadcast a resolution alert to all voters of a complaint.
 * Best-effort: failures are logged but do not throw.
 */
export async function broadcastResolution(
  input: BroadcastResolutionInput
): Promise<void> {
  if (input.voterIds.length === 0) return;
  try {
    const s = await getSocket();
    s.emit("broadcast-resolution", input);
  } catch (err) {
    console.error(
      "[Jan Samvaad client] broadcastResolution skipped (service unavailable):",
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Notify a single user (e.g., badge earned, vote milestone).
 */
export async function notifyUser(event: {
  userId: string;
  type: string;
  title: string;
  message: string;
  complaintId?: string;
}): Promise<void> {
  try {
    const s = await getSocket();
    s.emit("notify-user", {
      ...event,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error(
      "[Jan Samvaad client] notifyUser skipped (service unavailable):",
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Broadcast a new-complaint community pulse event.
 */
export async function broadcastNewComplaint(input: {
  complaintId: string;
  title: string;
  ward: string;
}): Promise<void> {
  try {
    const s = await getSocket();
    s.emit("new-complaint-broadcast", input);
  } catch (err) {
    console.error(
      "[Jan Samvaad client] broadcastNewComplaint skipped (service unavailable):",
      err instanceof Error ? err.message : err
    );
  }
}
