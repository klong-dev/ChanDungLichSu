"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGameStore } from "@/lib/game-store";
import { Check, Loader2, Trophy, RefreshCw } from "lucide-react";

// Maximum pairs any player should vote on
const MAX_PAIRS_PER_PLAYER = 3;

// Generate all unique pairs from player IDs
function generateAllPairs(playerIds: string[]): [string, string][] {
  const pairs: [string, string][] = [];
  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      pairs.push([playerIds[i], playerIds[j]]);
    }
  }
  return pairs;
}

// Deterministic hash function for consistent pair assignment
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Assign pairs to voters deterministically
// Each pair should be voted by at least 1 voter (excluding pair members)
function assignPairsToVoter(voterId: string, allPlayerIds: string[], sessionCode: string): [string, string][] {
  const allPairs = generateAllPairs(allPlayerIds);

  // Filter out pairs that include the voter
  const votablePairs = allPairs.filter(([id1, id2]) => id1 !== voterId && id2 !== voterId);

  // If few pairs, vote all of them
  if (votablePairs.length <= MAX_PAIRS_PER_PLAYER) {
    return votablePairs;
  }

  // For larger numbers, distribute fairly using deterministic selection
  // Use voter ID + session code as seed for consistent assignment
  const seed = hashCode(voterId + sessionCode);

  // Shuffle pairs deterministically based on seed
  const shuffled = [...votablePairs].sort((a, b) => {
    const hashA = hashCode(a.join("-") + seed.toString());
    const hashB = hashCode(b.join("-") + seed.toString());
    return hashA - hashB;
  });

  // Take first N pairs
  return shuffled.slice(0, MAX_PAIRS_PER_PLAYER);
}

export function Voting() {
  const { session, currentPlayer, submitVote, setPhase } = useGameStore();
  const [votingComplete, setVotingComplete] = useState(false);

  // Get all player IDs who have artwork
  const playerIdsWithArtwork = useMemo(() => {
    if (!session) return [];
    return session.players.filter((p) => !p.isObserver && p.artwork).map((p) => p.id);
  }, [session]);

  // Get pairs assigned to THIS voter
  const assignedPairs = useMemo(() => {
    if (!currentPlayer || !session) return [];
    return assignPairsToVoter(currentPlayer.id, playerIdsWithArtwork, session.code);
  }, [currentPlayer, playerIdsWithArtwork, session]);

  // Find pairs not yet voted on
  const playerInSession = session?.players.find((p) => p.id === currentPlayer?.id);
  const votedPairs = playerInSession?.votedPairs || [];

  const remainingPairs = useMemo(() => {
    return assignedPairs.filter(([id1, id2]) => {
      const pairKey = [id1, id2].sort().join("-");
      return !votedPairs.includes(pairKey);
    });
  }, [assignedPairs, votedPairs]);

  // Current pair to vote on
  const currentPair = remainingPairs[0];

  // Randomize order of display for current pair
  const [displayOrder, setDisplayOrder] = useState<[string, string] | null>(null);

  useEffect(() => {
    if (currentPair) {
      // Randomly swap order for visual variety
      const shouldSwap = Math.random() > 0.5;
      setDisplayOrder(shouldSwap ? [currentPair[1], currentPair[0]] : currentPair);
    } else {
      setDisplayOrder(null);
    }
  }, [currentPair?.join("-")]);

  // Check if voting is complete
  useEffect(() => {
    if (remainingPairs.length === 0 && assignedPairs.length > 0) {
      setVotingComplete(true);
    }
  }, [remainingPairs.length, assignedPairs.length]);

  // Admin can transition to presentation
  const isAdmin = currentPlayer?.isAdmin || currentPlayer?.isObserver;

  const handleVote = (winnerId: string) => {
    if (!displayOrder) return;
    const loserId = displayOrder[0] === winnerId ? displayOrder[1] : displayOrder[0];
    submitVote(winnerId, loserId);
  };

  // Get player artwork by id
  const getPlayerArtwork = (playerId: string) => {
    return session?.players.find((p) => p.id === playerId)?.artwork;
  };

  // Admin/Observer view - show leaderboard and control
  if (isAdmin) {
    const rankedPlayers = [...(session?.players || [])].filter((p) => !p.isObserver).sort((a, b) => (b.score || 0) - (a.score || 0));

    // Calculate total pairs and estimate voting progress
    const totalPairs = generateAllPairs(playerIdsWithArtwork).length;
    const voters = session?.players.filter((p) => !p.isObserver) || [];
    const totalVotes = voters.reduce((sum, p) => sum + (p.votedPairs?.length || 0), 0);

    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                Bảng xếp hạng - Đang bình chọn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm text-muted-foreground mb-4">
                <span>Tổng số vote: {totalVotes}</span>
                <span>Số cặp: {totalPairs}</span>
              </div>

              <div className="space-y-2">
                {rankedPlayers.map((player, index) => (
                  <div key={player.id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                    <span className="w-8 h-8 flex items-center justify-center font-bold text-lg">
                      {index === 0 && "🥇"}
                      {index === 1 && "🥈"}
                      {index === 2 && "🥉"}
                      {index > 2 && `${index + 1}.`}
                    </span>
                    <span className="flex-1 font-medium">{player.nickname}</span>
                    <span className="text-xs text-muted-foreground mr-2">({player.votedPairs?.length || 0} votes)</span>
                    <span className="text-primary font-bold">{player.score || 0} điểm</span>
                  </div>
                ))}
              </div>

              <Button className="w-full mt-6" onClick={() => setPhase("presentation")}>
                Kết thúc bình chọn → Trình bày
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Voting complete view
  if (votingComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Đã hoàn thành bình chọn!</h2>
            <p className="text-muted-foreground">Bạn đã vote {votedPairs.length} cặp. Vui lòng đợi Admin kết thúc...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No pairs to vote (not enough players) - request sync
  const { requestSync } = useGameStore();

  useEffect(() => {
    // Auto-request sync if no artworks found (might be stale data)
    if (assignedPairs.length === 0 && playerIdsWithArtwork.length < 2 && session) {
      const timer = setTimeout(() => {
        console.log("[Voting] No artworks found, requesting sync...");
        requestSync();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [assignedPairs.length, playerIdsWithArtwork.length, session, requestSync]);

  if (assignedPairs.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Đang tải dữ liệu...</h2>
            <p className="text-muted-foreground mb-4">{playerIdsWithArtwork.length < 2 ? "Đang đồng bộ tác phẩm từ người chơi khác..." : "Cần ít nhất 2 tác phẩm khác để bình chọn."}</p>
            <Button variant="outline" onClick={() => requestSync()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Tải lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main voting UI - loading state
  if (!displayOrder) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const progress = assignedPairs.length - remainingPairs.length;
  const total = assignedPairs.length;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Bình chọn tác phẩm</h1>
          <p className="text-muted-foreground">
            Chọn tác phẩm bạn thấy đẹp hơn ({progress + 1}/{total})
          </p>
        </div>

        {/* Two artworks side by side */}
        <div className="grid md:grid-cols-2 gap-6">
          {displayOrder.map((playerId) => {
            const artwork = getPlayerArtwork(playerId);

            return (
              <Card key={playerId} className="cursor-pointer transition-all hover:ring-2 hover:ring-primary hover:scale-[1.02]" onClick={() => handleVote(playerId)}>
                <CardContent className="p-4">
                  <div className="aspect-square bg-white rounded-lg overflow-hidden mb-4 border">{artwork ? <Image src={artwork} alt="Artwork" width={400} height={400} className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground">Không có tranh</div>}</div>
                  <Button className="w-full" variant="outline">
                    Chọn tác phẩm này
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
