"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGameStore } from "@/lib/game-store";
import { Users, Copy, Check, Play, Sparkles, Clock, Wifi, WifiOff, Loader2 } from "lucide-react";

const TIME_OPTIONS = [
  { label: "1 phút", value: 60 },
  { label: "3 phút", value: 180 },
  { label: "5 phút", value: 300 },
  { label: "10 phút", value: 600 },
];

export function Lobby() {
  const { session, currentPlayer, createSession, joinSession, startSession, initSync, canStartSession, setDrawingTime, pingPlayers, broadcastSession, connectionStatus, leaveSession } = useGameStore();
  const [nickname, setNickname] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const [mode, setMode] = useState<"select" | "create" | "join">("select");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Initialize sync and poll for session updates
  useEffect(() => {
    initSync();

    // Poll localStorage for session updates
    const pollInterval = setInterval(() => {
      const storedSession = localStorage.getItem("chandunglichsu-session");
      if (storedSession && session) {
        try {
          const parsed = JSON.parse(storedSession);
          if (parsed.code === session.code) {
            // Check if phase changed
            if (parsed.phase !== session.phase) {
              // Update zustand state directly
              useGameStore.setState({
                session: parsed,
                timeRemaining: parsed.drawingTimeSeconds || 300,
              });
            }
            // Check if players list changed (compare by serializing player IDs)
            else {
              const currentIds = session.players
                .map((p) => p.id)
                .sort()
                .join(",");
              const storedIds = parsed.players
                ?.map((p: { id: string }) => p.id)
                .sort()
                .join(",");
              if (currentIds !== storedIds) {
                useGameStore.setState({ session: parsed });
              }
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }, 500); // Check every 500ms

    return () => clearInterval(pollInterval);
  }, [session, initSync]);

  // Admin: Periodically ping for players
  useEffect(() => {
    if (!currentPlayer?.isAdmin || !session) return;

    // Ping immediately when becoming admin
    const initialPing = setTimeout(() => {
      pingPlayers();
    }, 1000);

    // Then ping every 3 seconds
    const pingInterval = setInterval(() => {
      pingPlayers();
    }, 3000);

    return () => {
      clearTimeout(initialPing);
      clearInterval(pingInterval);
    };
  }, [currentPlayer?.isAdmin, session?.code, pingPlayers]);

  const handleForceSync = async () => {
    setIsSyncing(true);
    // Ping players and broadcast current state
    pingPlayers();
    broadcastSession();
    // Visual feedback
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsSyncing(false);
  };

  const handleCreateSession = () => {
    if (!nickname.trim()) {
      setError("Vui lòng nhập tên của bạn");
      return;
    }
    createSession(nickname.trim());
  };

  const handleJoinSession = async () => {
    if (!nickname.trim()) {
      setError("Vui lòng nhập tên của bạn");
      return;
    }
    if (!sessionCode.trim()) {
      setError("Vui lòng nhập mã phòng");
      return;
    }
    setIsJoining(true);
    try {
      const success = await joinSession(sessionCode.trim(), nickname.trim());
      if (!success) {
        setError("Mã phòng không hợp lệ");
      }
    } catch (e) {
      setError("Không thể kết nối. Vui lòng thử lại.");
    } finally {
      setIsJoining(false);
    }
  };

  const copySessionCode = async () => {
    if (session?.code) {
      await navigator.clipboard.writeText(session.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartGame = () => {
    if (session && session.players.length >= 1) {
      startSession();
    }
  };

  // If already in a session, show lobby waiting room
  if (session && currentPlayer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border-2 border-primary/20">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Phòng chờ</CardTitle>
              <CardDescription className="mt-2">Chờ mọi người tham gia</CardDescription>
            </div>
            {/* Connection Status */}
            <div className="flex items-center justify-center gap-2 text-xs">
              {connectionStatus === "connected" ? (
                <>
                  <Wifi className="w-3 h-3 text-green-500" />
                  <span className="text-green-600">Đã kết nối</span>
                </>
              ) : connectionStatus === "connecting" ? (
                <>
                  <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />
                  <span className="text-yellow-600">Đang kết nối...</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-red-500" />
                  <span className="text-red-600">Chưa kết nối</span>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Session Code */}
            <div className="bg-secondary/50 rounded-xl p-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">Mã phòng</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl font-bold tracking-widest text-primary">{session.code}</span>
                <Button variant="ghost" size="icon" onClick={copySessionCode} className="shrink-0">
                  {copied ? <Check className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
            </div>

            {/* Players List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Người chơi ({session.players.length})
                </p>
                {currentPlayer.isAdmin && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={handleForceSync} disabled={isSyncing}>
                    {isSyncing ? "Đang đồng bộ..." : "Tìm người chơi ↻"}
                  </Button>
                )}
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {session.players.map((player, index) => (
                  <div key={player.id} className={`flex items-center gap-3 p-3 rounded-lg ${player.id === currentPlayer.id ? "bg-primary/10 border border-primary/30" : "bg-secondary/30"}`}>
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">{index + 1}</div>
                    <span className="font-medium flex-1">{player.nickname}</span>
                    {player.isAdmin && <span className="text-xs px-2 py-1 rounded-full bg-accent text-accent-foreground">Admin</span>}
                    {player.id === currentPlayer.id && <span className="text-xs text-muted-foreground">(Bạn)</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Time Setting (Admin only) */}
            {currentPlayer.isAdmin && (
              <div className="bg-secondary/30 rounded-xl p-4">
                <p className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Thời gian vẽ
                </p>
                <div className="flex gap-2 flex-wrap">
                  {TIME_OPTIONS.map((option) => (
                    <Button key={option.value} variant={session.drawingTimeSeconds === option.value ? "default" : "outline"} size="sm" onClick={() => setDrawingTime(option.value)}>
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Start Button (Admin only) */}
            {currentPlayer.isAdmin && (
              <div className="space-y-2">
                <Button onClick={handleStartGame} className="w-full h-12 text-lg gap-2" disabled={!canStartSession()}>
                  <Play className="w-5 h-5" />
                  Bắt đầu
                </Button>
                {!canStartSession() && <p className="text-sm text-destructive text-center">Cần ít nhất 2 người chơi (không tính Admin)</p>}
              </div>
            )}

            {!currentPlayer.isAdmin && (
              <div className="space-y-3">
                <div className="text-center text-muted-foreground text-sm py-2">
                  <Sparkles className="w-5 h-5 inline-block mr-2 animate-pulse" />
                  Chờ Admin bắt đầu...
                </div>
                <Button variant="outline" className="w-full" onClick={() => leaveSession()}>
                  Rời phòng
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mode selection or form
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Chân Dung Lịch Sử</h1>
            <p className="text-muted-foreground mt-2">Vẽ và khám phá các nhân vật lịch sử</p>
          </div>
        </div>

        {mode === "select" && (
          <Card className="border-2 border-primary/20">
            <CardContent className="pt-6 space-y-4">
              <Button onClick={() => setMode("create")} className="w-full h-14 text-lg" variant="default">
                Tạo phòng mới
              </Button>
              <Button onClick={() => setMode("join")} className="w-full h-14 text-lg" variant="outline">
                Tham gia phòng
              </Button>
            </CardContent>
          </Card>
        )}

        {mode === "create" && (
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle>Tạo phòng mới</CardTitle>
              <CardDescription>Bạn sẽ là Admin của phòng chơi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tên của bạn</label>
                <Input
                  placeholder="Nhập tên hiển thị..."
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    setError("");
                  }}
                  className="h-12"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMode("select");
                    setError("");
                  }}
                  className="flex-1"
                >
                  Quay lại
                </Button>
                <Button onClick={handleCreateSession} className="flex-1">
                  Tạo phòng
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {mode === "join" && (
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle>Tham gia phòng</CardTitle>
              <CardDescription>Nhập mã phòng để tham gia</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tên của bạn</label>
                <Input
                  placeholder="Nhập tên hiển thị..."
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    setError("");
                  }}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mã phòng</label>
                <Input
                  placeholder="VD: ABC123"
                  value={sessionCode}
                  onChange={(e) => {
                    setSessionCode(e.target.value.toUpperCase());
                    setError("");
                  }}
                  className="h-12 text-center text-xl tracking-widest uppercase"
                  maxLength={6}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMode("select");
                    setError("");
                  }}
                  className="flex-1"
                  disabled={isJoining}
                >
                  Quay lại
                </Button>
                <Button onClick={handleJoinSession} className="flex-1" disabled={isJoining}>
                  {isJoining ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang kết nối...
                    </>
                  ) : (
                    "Tham gia"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <p className="text-center text-sm text-muted-foreground">Học tập Tư tưởng Hồ Chí Minh qua hình thức vẽ tranh tương tác</p>
      </div>
    </div>
  );
}
