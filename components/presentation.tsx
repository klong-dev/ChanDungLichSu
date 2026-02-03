"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useGameStore } from "@/lib/game-store";
import { ChevronLeft, ChevronRight, RotateCcw, User, BookOpen, Link2, ImageIcon, X, Trophy } from "lucide-react";

export function Presentation() {
  const { session, currentPlayer, resetSession } = useGameStore();
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const [selectedArtwork, setSelectedArtwork] = useState<{ artwork: string; nickname: string } | null>(null);

  if (!session) return null;

  const topics = session.selectedTopics;
  const currentTopic = topics[currentTopicIndex];

  // Get artworks for current topic
  const topicArtworks = session.players
    .filter((player) => player.assignedTopic === currentTopic?.id && player.artwork)
    .map((player) => ({
      nickname: player.nickname,
      artwork: player.artwork!,
      isCurrentPlayer: player.id === currentPlayer?.id,
    }));

  const nextTopic = () => {
    if (currentTopicIndex < topics.length - 1) {
      setCurrentTopicIndex(currentTopicIndex + 1);
    }
  };

  const prevTopic = () => {
    if (currentTopicIndex > 0) {
      setCurrentTopicIndex(currentTopicIndex - 1);
    }
  };

  const handleRestart = () => {
    resetSession();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-foreground">Triển lãm Chân Dung Lịch Sử</h1>
          </div>

          {/* Topic Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prevTopic} disabled={currentTopicIndex === 0}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-sm text-muted-foreground px-3">
              {currentTopicIndex + 1} / {topics.length}
            </span>
            <Button variant="outline" size="icon" onClick={nextTopic} disabled={currentTopicIndex === topics.length - 1}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {currentPlayer?.isAdmin ? (
            <Button variant="outline" onClick={handleRestart} className="gap-2 bg-transparent">
              <RotateCcw className="w-4 h-4" />
              Chơi lại
            </Button>
          ) : (
            <Button variant="outline" onClick={handleRestart} className="gap-2 bg-transparent">
              <RotateCcw className="w-4 h-4" />
              Thoát
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 lg:p-6">
        {currentTopic && (
          <div className="space-y-6">
            {/* Topic Header */}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground uppercase tracking-wide">Nhân vật lịch sử</p>
              <h2 className="text-4xl lg:text-5xl font-bold text-primary">{currentTopic.name}</h2>
            </div>

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Biography Section */}
              <div className="space-y-4">
                <Card className="border-2 border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BookOpen className="w-5 h-5 text-primary" />
                      Tiểu sử
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{currentTopic.biography}</p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-accent/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Link2 className="w-5 h-5 text-accent" />
                      Mối liên hệ với Nguyễn Ái Quốc
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{currentTopic.connectionToHoChiMinh}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Gallery Section */}
              <div>
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ImageIcon className="w-5 h-5 text-primary" />
                      Tranh vẽ ({topicArtworks.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {topicArtworks.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {topicArtworks.map((item, index) => (
                          <button key={index} onClick={() => setSelectedArtwork(item)} className="group relative aspect-square rounded-xl overflow-hidden border-2 border-border hover:border-primary transition-colors bg-canvas">
                            <Image src={item.artwork || "/placeholder.svg"} alt={`Tranh của ${item.nickname}`} fill className="object-contain" />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/80 to-transparent p-2">
                              <p className="text-xs text-background font-medium truncate flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {item.nickname}
                                {item.isCurrentPlayer && <span className="text-primary-foreground/70">(Bạn)</span>}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Chưa có tranh nào cho đề tài này</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Leaderboard */}
            <Card className="max-w-xl mx-auto border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-50/50 to-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Bảng xếp hạng
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[...session.players]
                    .filter((p) => !p.isObserver)
                    .sort((a, b) => (b.score || 0) - (a.score || 0))
                    .map((player, index) => (
                      <div key={player.id} className={`flex items-center gap-3 p-3 rounded-lg ${player.id === currentPlayer?.id ? "bg-primary/10 border border-primary/30" : "bg-secondary/30"}`}>
                        <span className="w-8 h-8 flex items-center justify-center font-bold text-lg">
                          {index === 0 && "🥇"}
                          {index === 1 && "🥈"}
                          {index === 2 && "🥉"}
                          {index > 2 && `${index + 1}.`}
                        </span>
                        <span className="flex-1 font-medium">{player.nickname}</span>
                        <span className="text-primary font-bold">{player.score || 0} điểm</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Topic Progress Dots */}
            <div className="flex justify-center gap-2 pt-4">
              {topics.map((_, index) => (
                <button key={index} onClick={() => setCurrentTopicIndex(index)} className={`w-3 h-3 rounded-full transition-colors ${index === currentTopicIndex ? "bg-primary" : "bg-border hover:bg-primary/50"}`} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Artwork Modal */}
      <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Tranh của {selectedArtwork?.nickname}
            </DialogTitle>
          </DialogHeader>
          {selectedArtwork && (
            <div className="relative aspect-square w-full bg-canvas rounded-lg overflow-hidden">
              <Image src={selectedArtwork.artwork || "/placeholder.svg"} alt={`Tranh của ${selectedArtwork.nickname}`} fill className="object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
