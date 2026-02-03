'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useGameStore } from '@/lib/game-store'
import { Clock, Users, Eye, Grid3X3, User, ArrowLeft, Maximize2 } from 'lucide-react'

type ViewMode = 'grid' | 'spotlight'

export function AdminObservation() {
  const { session, timeRemaining, setTimeRemaining, setPhase } = useGameStore()
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [spotlightPlayer, setSpotlightPlayer] = useState<string | null>(null)

  // Timer effect
  useEffect(() => {
    if (timeRemaining <= 0) {
      setPhase('presentation')
      return
    }

    const timer = setInterval(() => {
      setTimeRemaining(timeRemaining - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining, setTimeRemaining, setPhase])

  // Auto-refresh to get artwork updates
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      // Force re-render to show latest artworks from other tabs
      const storedSession = localStorage.getItem('chandunglichsu-session')
      if (storedSession) {
        try {
          const parsed = JSON.parse(storedSession)
          if (session && parsed.code === session.code) {
            // Check if any artwork has changed
            const currentArtworks = session.players.map(p => p.artwork).join('')
            const storedArtworks = parsed.players.map((p: any) => p.artwork).join('')
            if (currentArtworks !== storedArtworks) {
              window.location.reload()
            }
          }
        } catch (e) {
          console.error('Failed to refresh:', e)
        }
      }
    }, 2000) // Refresh every 2 seconds

    return () => clearInterval(refreshInterval)
  }, [session])

  if (!session) return null

  // Get only non-observer players (actual players who draw)
  const drawingPlayers = session.players.filter(p => !p.isObserver)
  
  // Get player by ID for spotlight view
  const selectedPlayer = spotlightPlayer 
    ? drawingPlayers.find(p => p.id === spotlightPlayer)
    : null
  
  // Get topic for a player
  const getPlayerTopic = (playerId: string) => {
    const player = session.players.find(p => p.id === playerId)
    if (!player?.assignedTopic) return null
    return session.selectedTopics.find(t => t.id === player.assignedTopic)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const timerColor = timeRemaining <= 60 ? 'text-destructive' : 'text-timer'

  const handleSpotlight = (playerId: string) => {
    setSpotlightPlayer(playerId)
    setViewMode('spotlight')
  }

  const handleBackToGrid = () => {
    setSpotlightPlayer(null)
    setViewMode('grid')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Quan sát trực tiếp
            </h1>
            <span className="text-sm text-muted-foreground">
              {drawingPlayers.length} người chơi
            </span>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="gap-1"
            >
              <Grid3X3 className="w-4 h-4" />
              Tất cả
            </Button>
            <Button
              variant={viewMode === 'spotlight' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('spotlight')}
              disabled={!spotlightPlayer}
              className="gap-1"
            >
              <Maximize2 className="w-4 h-4" />
              Chi tiết
            </Button>
          </div>
          
          {/* Timer */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-secondary ${timerColor}`}>
            <Clock className="w-5 h-5" />
            <span className="text-xl font-bold tabular-nums">{formatTime(timeRemaining)}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 max-w-7xl mx-auto w-full">
        {viewMode === 'grid' ? (
          /* Grid View - All Players */
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-5 h-5" />
              <span>Click vào tranh để xem chi tiết</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {drawingPlayers.map((player) => {
                const topic = getPlayerTopic(player.id)
                return (
                  <Card
                    key={player.id}
                    className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                    onClick={() => handleSpotlight(player.id)}
                  >
                    <CardHeader className="p-3 pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {player.nickname}
                      </CardTitle>
                      {topic && (
                        <p className="text-xs text-muted-foreground truncate">
                          Đề tài: {topic.name}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="p-2">
                      <div className="aspect-square bg-canvas rounded-lg overflow-hidden border relative">
                        {player.artwork ? (
                          <Image
                            src={player.artwork}
                            alt={`Tranh của ${player.nickname}`}
                            fill
                            className="object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            Đang vẽ...
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
              
              {drawingPlayers.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Chưa có người chơi nào</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Spotlight View - Single Player */
          <div className="space-y-4">
            <Button
              variant="ghost"
              onClick={handleBackToGrid}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại xem tất cả
            </Button>
            
            {selectedPlayer ? (
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Large Canvas */}
                <div className="lg:col-span-2">
                  <Card className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="aspect-square bg-canvas rounded-lg overflow-hidden border relative">
                        {selectedPlayer.artwork ? (
                          <Image
                            src={selectedPlayer.artwork}
                            alt={`Tranh của ${selectedPlayer.nickname}`}
                            fill
                            className="object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            Đang vẽ...
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Player Info */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        {selectedPlayer.nickname}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {getPlayerTopic(selectedPlayer.id) && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Đề tài được giao:</p>
                          <p className="text-lg text-primary font-semibold">
                            {getPlayerTopic(selectedPlayer.id)?.name}
                          </p>
                          {getPlayerTopic(selectedPlayer.id)?.imageHint && (
                            <p className="text-sm text-muted-foreground italic">
                              Gợi ý: {getPlayerTopic(selectedPlayer.id)?.imageHint}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Quick Switch to Other Players */}
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Người chơi khác</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-2">
                      {drawingPlayers
                        .filter(p => p.id !== selectedPlayer.id)
                        .map((player) => (
                          <button
                            key={player.id}
                            onClick={() => setSpotlightPlayer(player.id)}
                            className="aspect-square bg-canvas rounded-lg overflow-hidden border relative hover:ring-2 hover:ring-primary/50 transition-all"
                          >
                            {player.artwork ? (
                              <Image
                                src={player.artwork}
                                alt={`Tranh của ${player.nickname}`}
                                fill
                                className="object-contain"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                ...
                              </div>
                            )}
                          </button>
                        ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Chọn một người chơi từ danh sách để xem chi tiết</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
