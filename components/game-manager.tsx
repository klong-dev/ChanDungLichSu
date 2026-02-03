'use client'

import { useEffect } from 'react'
import { useGameStore } from '@/lib/game-store'
import { Lobby } from './lobby'
import { DrawingCanvas } from './drawing-canvas'
import { Presentation } from './presentation'
import { AdminObservation } from './admin-observation'
import { Voting } from './voting'

export function GameManager() {
  const { session, currentPlayer, initSync } = useGameStore()

  // Initialize sync on mount
  useEffect(() => {
    initSync()
  }, [initSync])

  // If no session or in lobby phase, show lobby
  if (!session || session.phase === 'lobby') {
    return <Lobby />
  }

  // Drawing phase
  if (session.phase === 'drawing') {
    // Admin sees observation page, players see drawing canvas
    if (currentPlayer?.isObserver) {
      return <AdminObservation />
    }
    return <DrawingCanvas />
  }

  // Voting phase
  if (session.phase === 'voting') {
    return <Voting />
  }

  // Presentation phase
  if (session.phase === 'presentation') {
    return <Presentation />
  }

  return <Lobby />
}
