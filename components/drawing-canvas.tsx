'use client'

import React from "react"

import { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useGameStore } from '@/lib/game-store'
import { HISTORICAL_FIGURES } from '@/lib/types'
import { Pencil, Eraser, Trash2, Clock, Lightbulb } from 'lucide-react'

// Grayscale colors for black-and-white portrait drawing
const GRAYSCALE_COLORS = [
  { name: 'Đen', color: '#000000' },
  { name: 'Xám đậm', color: '#333333' },
  { name: 'Xám than', color: '#555555' },
  { name: 'Xám trung', color: '#777777' },
  { name: 'Xám nhạt', color: '#999999' },
  { name: 'Xám bạc', color: '#BBBBBB' },
  { name: 'Xám sáng', color: '#DDDDDD' },
  { name: 'Trắng', color: '#FFFFFF' },
]

type Tool = 'pen' | 'eraser'

export function DrawingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { session, currentPlayer, timeRemaining, setTimeRemaining, setPhase, updateArtwork } = useGameStore()
  
  const [tool, setTool] = useState<Tool>('pen')
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushSize, setBrushSize] = useState(4)
  const [showHint, setShowHint] = useState(false)
  const [selectedColor, setSelectedColor] = useState('#000000')
  
  // Get current player's assigned topic from session (not from currentPlayer state)
  // This ensures we get the synced data after admin starts session
  const playerInSession = session?.players.find(p => p.id === currentPlayer?.id)
  const assignedTopic = session?.selectedTopics.find(
    topic => topic.id === playerInSession?.assignedTopic
  )

  // Timer effect
  useEffect(() => {
    if (timeRemaining <= 0) {
      // Save artwork before transitioning
      if (canvasRef.current && currentPlayer) {
        const artwork = canvasRef.current.toDataURL('image/png')
        updateArtwork(currentPlayer.id, artwork)
      }
      setPhase('voting') // Transition to voting phase instead of presentation
      return
    }

    const timer = setInterval(() => {
      setTimeRemaining(timeRemaining - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining, setTimeRemaining, setPhase, currentPlayer, updateArtwork])

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    
    // Set white background
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, rect.width, rect.height)
  }, [])

  const getCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    
    const rect = canvas.getBoundingClientRect()
    
    if ('touches' in e) {
      const touch = e.touches[0]
      if (!touch) return null
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      }
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }, [])

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoordinates(e)
    if (!coords) return
    
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    
    setIsDrawing(true)
    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = tool === 'eraser' ? brushSize * 4 : brushSize
    ctx.strokeStyle = tool === 'pen' ? selectedColor : '#FFFFFF'
  }, [getCoordinates, tool, brushSize, selectedColor])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    
    const coords = getCoordinates(e)
    if (!coords) return
    
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    
    ctx.lineTo(coords.x, coords.y)
    ctx.stroke()
  }, [isDrawing, getCoordinates])

  const stopDrawing = useCallback(() => {
    if (isDrawing && canvasRef.current && currentPlayer) {
      const artwork = canvasRef.current.toDataURL('image/png')
      updateArtwork(currentPlayer.id, artwork)
    }
    setIsDrawing(false)
  }, [isDrawing, currentPlayer, updateArtwork])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return
    
    const rect = canvas.getBoundingClientRect()
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, rect.width, rect.height)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const timerColor = timeRemaining <= 60 ? 'text-destructive' : 'text-timer'

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-foreground">Chân Dung Lịch Sử</h1>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {currentPlayer?.nickname}
            </span>
          </div>
          
          {/* Timer */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-secondary ${timerColor}`}>
            <Clock className="w-5 h-5" />
            <span className="text-xl font-bold tabular-nums">{formatTime(timeRemaining)}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-6xl mx-auto w-full">
        {/* Topic Card */}
        <div className="lg:w-80 shrink-0">
          <Card className="p-4 border-2 border-primary/30 bg-card">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Đề tài của bạn</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHint(!showHint)}
                  className="text-primary hover:text-primary/80"
                >
                  <Lightbulb className="w-4 h-4 mr-1" />
                  Gợi ý
                </Button>
              </div>
              <h2 className="text-2xl font-bold text-primary">
                {assignedTopic?.name || 'Đang tải...'}
              </h2>
              {showHint && assignedTopic?.imageHint && (
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm text-muted-foreground italic">
                    {assignedTopic.imageHint}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Tools */}
          <Card className="p-4 mt-4 border bg-card">
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">Công cụ</p>
              
              <div className="flex gap-2">
                <Button
                  variant={tool === 'pen' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setTool('pen')}
                  className="flex-1"
                >
                  <Pencil className="w-5 h-5 mr-2" />
                  Bút
                </Button>
                <Button
                  variant={tool === 'eraser' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setTool('eraser')}
                  className="flex-1"
                >
                  <Eraser className="w-5 h-5 mr-2" />
                  Tẩy
                </Button>
              </div>

              {/* Brush Size */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Kích thước nét</p>
                <div className="flex gap-2">
                  {[2, 4, 8, 12].map((size) => (
                    <button
                      key={size}
                      onClick={() => setBrushSize(size)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 transition-colors ${
                        brushSize === size
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div
                        className="rounded-full bg-foreground"
                        style={{ width: size + 4, height: size + 4 }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Picker */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Bảng màu xám</p>
                <div className="grid grid-cols-4 gap-2">
                  {GRAYSCALE_COLORS.map((item) => (
                    <button
                      key={item.color}
                      onClick={() => {
                        setSelectedColor(item.color)
                        setTool('pen')
                      }}
                      title={item.name}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 transition-all ${
                        selectedColor === item.color && tool === 'pen'
                          ? 'border-primary ring-2 ring-primary/30 scale-110'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-md border border-border/50"
                        style={{ backgroundColor: item.color }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <Button
                variant="outline"
                onClick={clearCanvas}
                className="w-full text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10 bg-transparent"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Xóa toàn bộ
              </Button>
            </div>
          </Card>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex flex-col min-h-0">
          <Card className="flex-1 p-2 border-2 bg-card overflow-hidden">
            <div className="w-full h-full min-h-[400px] lg:min-h-0 bg-canvas rounded-lg overflow-hidden relative">
              <canvas
                ref={canvasRef}
                className="w-full h-full touch-none cursor-crosshair"
                style={{ touchAction: 'none' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
          </Card>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Vẽ theo trí tưởng tượng của bạn về nhân vật
          </p>
        </div>
      </main>
    </div>
  )
}
