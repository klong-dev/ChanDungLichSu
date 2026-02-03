"use client";

import { create } from "zustand";
import type { Session, Player, GamePhase } from "./types";
import { HISTORICAL_FIGURES } from "./types";
import { getGameChannel, broadcastToChannel, leaveGameChannel, isSupabaseConfigured, trackPresence, untrackPresence } from "./supabase";

function generateSessionCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Session sync keys for localStorage
const SESSION_STORAGE_KEY = "chandunglichsu-session";
const PLAYER_STORAGE_KEY = "chandunglichsu-player";

type SyncMessage =
  | { type: "SESSION_UPDATE"; session: Session }
  | { type: "PLAYER_JOINED"; player: Player; sessionCode: string }
  | { type: "PLAYER_LEFT"; playerId: string; sessionCode: string }
  | { type: "ARTWORK_UPDATE"; playerId: string; artwork: string; sessionCode: string }
  | { type: "REQUEST_SYNC"; sessionCode: string; playerId: string }
  | { type: "SYNC_RESPONSE"; session: Session; forPlayerId: string }
  | { type: "ADMIN_PING"; sessionCode: string }
  | { type: "PLAYER_PONG"; player: Player; sessionCode: string };

interface GameStore {
  session: Session | null;
  currentPlayer: Player | null;
  timeRemaining: number;
  syncInitialized: boolean;
  connectionStatus: "disconnected" | "connecting" | "connected";

  // Actions
  createSession: (adminNickname: string) => void;
  joinSession: (sessionCode: string, nickname: string) => Promise<boolean>;
  startSession: () => boolean;
  assignTopics: () => void;
  updateArtwork: (playerId: string, artwork: string) => void;
  setTimeRemaining: (time: number) => void;
  setPhase: (phase: GamePhase) => void;
  resetSession: () => void;
  submitVote: (winnerId: string, loserId: string) => void;
  canStartSession: () => boolean;
  getPlayersForVoting: () => Player[];
  setDrawingTime: (seconds: number) => void;
  removePlayer: (playerId: string) => void;
  leaveSession: () => void;

  // Sync actions
  initSync: () => void;
  handleSyncMessage: (message: SyncMessage) => void;
  broadcastSession: () => void;
  requestSync: () => void;
  pingPlayers: () => void;
  setConnectionStatus: (status: "disconnected" | "connecting" | "connected") => void;
  handlePresenceLeave: (playerId: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  session: null,
  currentPlayer: null,
  timeRemaining: 300,
  syncInitialized: false,
  connectionStatus: "disconnected",

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  handlePresenceLeave: (playerId: string) => {
    const { session, currentPlayer } = get();
    if (!session || !currentPlayer?.isAdmin) return;

    // Don't remove admin
    const player = session.players.find((p) => p.id === playerId);
    if (!player || player.isAdmin) return;

    console.log("[Sync] Player left (presence):", player.nickname);
    get().removePlayer(playerId);
  },

  initSync: () => {
    if (typeof window === "undefined") return;
    if (get().syncInitialized) return;

    console.log("[Sync] Initializing...");

    // Load player from storage (player ID is persistent)
    const storedPlayer = localStorage.getItem(PLAYER_STORAGE_KEY);
    const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);

    if (storedPlayer && storedSession) {
      try {
        const session = JSON.parse(storedSession) as Session;
        const player = JSON.parse(storedPlayer) as Player;

        // Validate that parsed data has required fields
        if (session?.code && session?.phase && player?.id && player?.nickname) {
          console.log("[Sync] Restored session:", session.code, "as", player.nickname);
          set({ session, currentPlayer: player, syncInitialized: true });

          // Connect to Supabase channel with presence tracking
          if (isSupabaseConfigured()) {
            set({ connectionStatus: "connecting" });
            const channel = getGameChannel(
              session.code,
              (payload) => {
                get().handleSyncMessage(payload as SyncMessage);
              },
              undefined, // onPresenceJoin - handled via PLAYER_JOINED message
              (leftPlayerId) => {
                get().handlePresenceLeave(leftPlayerId);
              },
            );

            if (channel) {
              set({ connectionStatus: "connected" });
              // Track our presence
              trackPresence(player.id, player.nickname, player.isAdmin);
            }
          }

          // Request latest session from admin if we're not admin
          if (!player.isAdmin) {
            setTimeout(() => {
              get().requestSync();
            }, 500);
          }
          return;
        }
      } catch (e) {
        console.warn("[Sync] Cleared corrupted session data");
      }
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(PLAYER_STORAGE_KEY);
    }

    set({ syncInitialized: true });
  },

  requestSync: () => {
    const { session, currentPlayer } = get();
    if (!session || !currentPlayer) return;

    console.log("[Sync] Requesting sync from admin...");
    broadcastToChannel(session.code, {
      type: "REQUEST_SYNC",
      sessionCode: session.code,
      playerId: currentPlayer.id,
    } as SyncMessage);
  },

  pingPlayers: () => {
    const { session, currentPlayer } = get();
    if (!session || !currentPlayer?.isAdmin) return;

    console.log("[Sync] Admin pinging players...");
    broadcastToChannel(session.code, {
      type: "ADMIN_PING",
      sessionCode: session.code,
    } as SyncMessage);
  },

  handleSyncMessage: (message: SyncMessage) => {
    const { session, currentPlayer } = get();

    switch (message.type) {
      case "SESSION_UPDATE":
        // Update if we're in the same session
        if (session && message.session.code === session.code) {
          console.log("[Sync] Received SESSION_UPDATE");
          const updatedSession = { ...message.session };
          set({ session: updatedSession, timeRemaining: message.session.drawingTimeSeconds });
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
        }
        break;

      case "PLAYER_JOINED":
        // Admin receives new player join
        if (session && currentPlayer?.isAdmin && message.sessionCode === session.code) {
          console.log("[Sync] Admin processing PLAYER_JOINED:", message.player.nickname);

          const existsById = session.players.some((p) => p.id === message.player.id);
          const existsByNickname = session.players.some((p) => p.nickname === message.player.nickname && !p.isAdmin);

          if (!existsById && !existsByNickname) {
            const updatedSession = {
              ...session,
              players: [...session.players, message.player],
            };
            set({ session: updatedSession });
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
            get().broadcastSession();
            console.log("[Sync] Player added, total players:", updatedSession.players.length);
          } else if (existsByNickname && !existsById) {
            console.log("[Sync] Player rejoined, updating ID");
            const updatedSession = {
              ...session,
              players: session.players.map((p) => (p.nickname === message.player.nickname && !p.isAdmin ? { ...p, id: message.player.id } : p)),
            };
            set({ session: updatedSession });
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
            get().broadcastSession();
          } else {
            console.log("[Sync] Player already exists in session");
            // Still broadcast to ensure the player gets the latest session
            get().broadcastSession();
          }
        }
        break;

      case "PLAYER_LEFT":
        // Handle player leaving (for non-admin clients to update their view)
        if (session && message.sessionCode === session.code) {
          console.log("[Sync] Processing PLAYER_LEFT:", message.playerId);
          const updatedSession = {
            ...session,
            players: session.players.filter((p) => p.id !== message.playerId),
          };
          set({ session: updatedSession });
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
        }
        break;

      case "ARTWORK_UPDATE":
        if (session && message.sessionCode === session.code) {
          const updatedPlayers = session.players.map((player) => (player.id === message.playerId ? { ...player, artwork: message.artwork } : player));
          const updatedSession = { ...session, players: updatedPlayers };
          set({ session: updatedSession });
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
        }
        break;

      case "REQUEST_SYNC":
        // Admin responds with current session
        if (session && currentPlayer?.isAdmin && message.sessionCode === session.code) {
          console.log("[Sync] Admin responding to REQUEST_SYNC for:", message.playerId);
          broadcastToChannel(session.code, {
            type: "SYNC_RESPONSE",
            session,
            forPlayerId: message.playerId,
          } as SyncMessage);
        }
        break;

      case "SYNC_RESPONSE":
        // Player receives sync from admin
        if (currentPlayer && message.forPlayerId === currentPlayer.id) {
          console.log("[Sync] Received sync response from admin");
          const updatedSession = {
            ...message.session,
            players: message.session.players.map((p) => {
              if (p.id === currentPlayer.id) {
                const myData = session?.players.find((mp) => mp.id === currentPlayer.id);
                return myData ? { ...p, artwork: myData.artwork } : p;
              }
              return p;
            }),
          };
          set({ session: updatedSession, timeRemaining: message.session.drawingTimeSeconds });
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
        }
        break;

      case "ADMIN_PING":
        // Player responds to admin ping
        if (session && currentPlayer && !currentPlayer.isAdmin && message.sessionCode === session.code) {
          console.log("[Sync] Responding to admin ping");
          broadcastToChannel(session.code, {
            type: "PLAYER_PONG",
            player: currentPlayer,
            sessionCode: session.code,
          } as SyncMessage);
        }
        break;

      case "PLAYER_PONG":
        // Admin receives player response
        if (session && currentPlayer?.isAdmin && message.sessionCode === session.code) {
          console.log("[Sync] Admin received pong from:", message.player.nickname);
          const exists = session.players.some((p) => p.id === message.player.id);

          if (!exists) {
            const updatedSession = {
              ...session,
              players: [...session.players, message.player],
            };
            set({ session: updatedSession });
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
            get().broadcastSession();
          }
        }
        break;
    }
  },

  broadcastSession: () => {
    const { session } = get();
    if (!session) return;

    console.log("[Sync] Broadcasting session update");
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    broadcastToChannel(session.code, { type: "SESSION_UPDATE", session } as SyncMessage);
  },

  createSession: (adminNickname: string) => {
    const adminPlayer: Player = {
      id: generateId(),
      nickname: adminNickname,
      isAdmin: true,
      isObserver: true,
    };

    const newSession: Session = {
      id: generateId(),
      code: generateSessionCode(),
      phase: "lobby",
      players: [adminPlayer],
      selectedTopics: [],
      drawingTimeSeconds: 300,
    };

    set({ session: newSession, currentPlayer: adminPlayer, syncInitialized: true });
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(adminPlayer));

    // Connect to Supabase channel with presence tracking
    if (isSupabaseConfigured()) {
      set({ connectionStatus: "connecting" });
      const channel = getGameChannel(
        newSession.code,
        (payload) => {
          useGameStore.getState().handleSyncMessage(payload as SyncMessage);
        },
        undefined,
        (leftPlayerId) => {
          useGameStore.getState().handlePresenceLeave(leftPlayerId);
        },
      );

      if (channel) {
        set({ connectionStatus: "connected" });
        // Track admin presence
        trackPresence(adminPlayer.id, adminPlayer.nickname, true);
      }
    }
  },

  joinSession: async (sessionCode: string, nickname: string) => {
    const upperCode = sessionCode.toUpperCase();

    // Create new player
    const newPlayer: Player = {
      id: generateId(),
      nickname,
      isAdmin: false,
      isObserver: false,
    };

    // Create a placeholder session
    const placeholderSession: Session = {
      id: generateId(),
      code: upperCode,
      phase: "lobby",
      players: [newPlayer],
      selectedTopics: [],
      drawingTimeSeconds: 300,
    };

    set({ session: placeholderSession, currentPlayer: newPlayer, syncInitialized: true });
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(placeholderSession));
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(newPlayer));

    // Connect to Supabase channel with presence tracking
    if (isSupabaseConfigured()) {
      set({ connectionStatus: "connecting" });
      const channel = getGameChannel(
        upperCode,
        (payload) => {
          useGameStore.getState().handleSyncMessage(payload as SyncMessage);
        },
        undefined,
        (leftPlayerId) => {
          useGameStore.getState().handlePresenceLeave(leftPlayerId);
        },
      );

      if (channel) {
        set({ connectionStatus: "connected" });

        // Wait a bit for channel to be ready, then track presence and notify admin
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Track our presence
        trackPresence(newPlayer.id, newPlayer.nickname, false);

        console.log("[Sync] Sending PLAYER_JOINED:", newPlayer.nickname);
        broadcastToChannel(upperCode, {
          type: "PLAYER_JOINED",
          player: newPlayer,
          sessionCode: upperCode,
        } as SyncMessage);

        // Request sync from admin
        setTimeout(() => {
          useGameStore.getState().requestSync();
        }, 300);
      }
    }

    return true;
  },

  assignTopics: () => {
    const { session } = get();
    if (!session) return;

    const actualPlayers = session.players.filter((p) => !p.isObserver);
    const playerCount = actualPlayers.length;

    let numTopics: number;
    if (playerCount <= 3) {
      numTopics = 1;
    } else if (playerCount <= 6) {
      numTopics = 2;
    } else {
      numTopics = 3;
    }

    const shuffled = [...HISTORICAL_FIGURES].sort(() => Math.random() - 0.5);
    const selectedTopics = shuffled.slice(0, numTopics);

    let topicIndex = 0;
    const updatedPlayers = session.players.map((player) => {
      if (player.isObserver) {
        return { ...player, score: 0 };
      }
      const topic = selectedTopics[topicIndex % numTopics];
      topicIndex++;
      return {
        ...player,
        assignedTopic: topic.id,
        score: 0,
        votedPairs: [],
      };
    });

    set({
      session: {
        ...session,
        selectedTopics,
        players: updatedPlayers,
      },
    });
  },

  canStartSession: () => {
    const { session } = get();
    if (!session) return false;
    const actualPlayers = session.players.filter((p) => !p.isObserver);
    return actualPlayers.length >= 2;
  },

  getPlayersForVoting: () => {
    const { session, currentPlayer } = get();
    if (!session || !currentPlayer) return [];
    return session.players.filter((p) => p.id !== currentPlayer.id && !p.isObserver && p.artwork);
  },

  startSession: () => {
    const { session, assignTopics, broadcastSession, canStartSession } = get();
    if (!session) return false;

    if (!canStartSession()) {
      return false;
    }

    assignTopics();

    const updatedSession = {
      ...get().session!,
      phase: "drawing" as GamePhase,
      startedAt: Date.now(),
    };

    set({
      session: updatedSession,
      timeRemaining: session.drawingTimeSeconds,
    });

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
    broadcastSession();
    return true;
  },

  updateArtwork: (playerId: string, artwork: string) => {
    const { session } = get();
    if (!session) return;

    const updatedPlayers = session.players.map((player) => (player.id === playerId ? { ...player, artwork } : player));

    const updatedSession = {
      ...session,
      players: updatedPlayers,
    };

    set({ session: updatedSession });
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession));

    // Broadcast artwork update
    broadcastToChannel(session.code, {
      type: "ARTWORK_UPDATE",
      playerId,
      artwork,
      sessionCode: session.code,
    } as SyncMessage);
  },

  setTimeRemaining: (time: number) => {
    set({ timeRemaining: time });
  },

  setPhase: (phase: GamePhase) => {
    const { session, broadcastSession } = get();
    if (!session) return;

    const updatedSession = {
      ...session,
      phase,
    };

    set({ session: updatedSession });
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
    broadcastSession();
  },

  setDrawingTime: (seconds: number) => {
    const { session, broadcastSession } = get();
    if (!session) return;

    const updatedSession = {
      ...session,
      drawingTimeSeconds: seconds,
    };

    set({ session: updatedSession });
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
    broadcastSession();
  },

  removePlayer: (playerId: string) => {
    const { session, currentPlayer, broadcastSession } = get();
    if (!session || !currentPlayer?.isAdmin) return;

    // Don't remove admin
    const playerToRemove = session.players.find((p) => p.id === playerId);
    if (!playerToRemove || playerToRemove.isAdmin) return;

    console.log("[Sync] Removing player:", playerToRemove.nickname);

    const updatedSession = {
      ...session,
      players: session.players.filter((p) => p.id !== playerId),
    };

    set({ session: updatedSession });
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession));

    // Broadcast to notify all clients
    broadcastSession();

    // Also send specific PLAYER_LEFT message
    broadcastToChannel(session.code, {
      type: "PLAYER_LEFT",
      playerId,
      sessionCode: session.code,
    } as SyncMessage);
  },

  leaveSession: () => {
    const { session, currentPlayer } = get();

    // Notify others before leaving
    if (session && currentPlayer && !currentPlayer.isAdmin) {
      // Untrack presence first
      untrackPresence();

      broadcastToChannel(session.code, {
        type: "PLAYER_LEFT",
        playerId: currentPlayer.id,
        sessionCode: session.code,
      } as SyncMessage);
    }

    // Then reset
    get().resetSession();
  },

  resetSession: () => {
    untrackPresence();
    leaveGameChannel();
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(PLAYER_STORAGE_KEY);
    set({
      session: null,
      currentPlayer: null,
      timeRemaining: 300,
      syncInitialized: false,
      connectionStatus: "disconnected",
    });
  },

  submitVote: (winnerId: string, loserId: string) => {
    const { session, currentPlayer, broadcastSession } = get();
    if (!session || !currentPlayer) return;

    const pairKey = [winnerId, loserId].sort().join("-");

    const playerInSession = session.players.find((p) => p.id === currentPlayer.id);
    if (playerInSession?.votedPairs?.includes(pairKey)) {
      return;
    }

    const updatedPlayers = session.players.map((player) => {
      if (player.id === winnerId) {
        return { ...player, score: (player.score || 0) + 1 };
      }
      if (player.id === currentPlayer.id) {
        return {
          ...player,
          votedPairs: [...(player.votedPairs || []), pairKey],
        };
      }
      return player;
    });

    const updatedCurrentPlayer = {
      ...currentPlayer,
      votedPairs: [...(currentPlayer.votedPairs || []), pairKey],
    };

    const updatedSession = { ...session, players: updatedPlayers };

    set({
      session: updatedSession,
      currentPlayer: updatedCurrentPlayer,
    });
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(updatedCurrentPlayer));
    broadcastSession();
  },
}));
