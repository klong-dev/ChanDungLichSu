"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/lib/game-store";
import { Lobby } from "./lobby";
import { DrawingCanvas } from "./drawing-canvas";
import { Presentation } from "./presentation";
import { AdminObservation } from "./admin-observation";
import { Voting } from "./voting";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";

export function GameManager() {
  const { session, currentPlayer, initSync } = useGameStore();
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize sync on mount
  useEffect(() => {
    initSync();
  }, [initSync]);

  // Background music for admin - plays when session exists
  useEffect(() => {
    if (currentPlayer?.isAdmin && session) {
      if (!audioRef.current) {
        audioRef.current = new Audio("/music_background.mp3");
        audioRef.current.loop = true;
        audioRef.current.volume = 0.5;
      }

      // Try to play (may be blocked by browser autoplay policy)
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay blocked, user will need to click to enable
          setIsMuted(true);
        });
      }
    }

    // Cleanup when session ends or component unmounts
    return () => {
      if (!session && audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [currentPlayer?.isAdmin, session]);

  // Stop music when session is reset
  useEffect(() => {
    if (!session && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsMuted(false);
    }
  }, [session]);

  // Toggle music
  const toggleMusic = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/music_background.mp3");
      audioRef.current.loop = true;
      audioRef.current.volume = 0.5;
    }

    if (isMuted) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
    setIsMuted(!isMuted);
  };

  // Music control button for admin (floating button)
  const MusicControl = () => {
    if (!currentPlayer?.isAdmin || !session) return null;

    return (
      <Button variant="outline" size="icon" onClick={toggleMusic} className="fixed bottom-4 right-4 z-50 rounded-full w-12 h-12 shadow-lg bg-background/80 backdrop-blur-sm" title={isMuted ? "Bật nhạc" : "Tắt nhạc"}>
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </Button>
    );
  };

  // If no session or in lobby phase, show lobby
  if (!session || session.phase === "lobby") {
    return (
      <>
        <Lobby />
        <MusicControl />
      </>
    );
  }

  // Drawing phase
  if (session.phase === "drawing") {
    // Admin sees observation page, players see drawing canvas
    if (currentPlayer?.isObserver) {
      return (
        <>
          <AdminObservation />
          <MusicControl />
        </>
      );
    }
    return <DrawingCanvas />;
  }

  // Voting phase
  if (session.phase === "voting") {
    return (
      <>
        <Voting />
        <MusicControl />
      </>
    );
  }

  // Presentation phase
  if (session.phase === "presentation") {
    return (
      <>
        <Presentation />
        <MusicControl />
      </>
    );
  }

  return <Lobby />;
}
