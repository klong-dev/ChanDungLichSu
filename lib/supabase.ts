"use client";

import { createClient, SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Lazy initialization of Supabase client
let supabaseInstance: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[Supabase] Missing environment variables. Real-time sync will not work.");
    return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseInstance;
}

// Channel management
let gameChannel: RealtimeChannel | null = null;

// Presence callback types
type PresenceJoinCallback = (playerId: string, playerData: { nickname: string; isAdmin: boolean }) => void;
type PresenceLeaveCallback = (playerId: string) => void;

export function getGameChannel(sessionCode: string, onMessage: (payload: unknown) => void, onPresenceJoin?: PresenceJoinCallback, onPresenceLeave?: PresenceLeaveCallback): RealtimeChannel | null {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn("[Supabase] Cannot create channel - Supabase not configured");
    return null;
  }

  // If already subscribed to this session, return existing channel
  if (gameChannel && gameChannel.topic === `realtime:game-${sessionCode}`) {
    return gameChannel;
  }

  // Unsubscribe from previous channel if exists
  if (gameChannel) {
    supabase.removeChannel(gameChannel);
    gameChannel = null;
  }

  // Create new channel for this session
  gameChannel = supabase.channel(`game-${sessionCode}`, {
    config: {
      broadcast: {
        self: false, // Don't receive own messages
      },
      presence: {
        key: "", // Will be set when tracking
      },
    },
  });

  gameChannel
    .on("broadcast", { event: "sync" }, ({ payload }) => {
      console.log("[Supabase] Received broadcast:", payload?.type);
      onMessage(payload);
    })
    .on("presence", { event: "join" }, ({ key, newPresences }) => {
      console.log("[Supabase] Presence join:", key, newPresences);
      if (onPresenceJoin && newPresences.length > 0) {
        const presence = newPresences[0] as unknown as { id: string; nickname: string; isAdmin: boolean };
        if (presence.id) {
          onPresenceJoin(presence.id, { nickname: presence.nickname, isAdmin: presence.isAdmin });
        }
      }
    })
    .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
      console.log("[Supabase] Presence leave:", key, leftPresences);
      if (onPresenceLeave && leftPresences.length > 0) {
        const presence = leftPresences[0] as unknown as { id: string };
        if (presence.id) {
          onPresenceLeave(presence.id);
        }
      }
    })
    .subscribe((status) => {
      console.log("[Supabase] Channel status:", status);
    });

  return gameChannel;
}

// Track player presence
export function trackPresence(playerId: string, nickname: string, isAdmin: boolean): void {
  if (!gameChannel) {
    console.warn("[Supabase] Cannot track presence - no active channel");
    return;
  }

  gameChannel.track({
    id: playerId,
    nickname,
    isAdmin,
    online_at: new Date().toISOString(),
  });
}

// Untrack presence (when leaving)
export function untrackPresence(): void {
  if (!gameChannel) return;
  gameChannel.untrack();
}

export function broadcastToChannel(sessionCode: string, payload: unknown): void {
  if (!gameChannel || gameChannel.topic !== `realtime:game-${sessionCode}`) {
    console.warn("[Supabase] No active channel for session:", sessionCode);
    return;
  }

  gameChannel.send({
    type: "broadcast",
    event: "sync",
    payload,
  });
}

export function leaveGameChannel(): void {
  const supabase = getSupabase();
  if (gameChannel && supabase) {
    supabase.removeChannel(gameChannel);
    gameChannel = null;
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
