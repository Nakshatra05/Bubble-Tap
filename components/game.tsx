"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, Target, Zap, Play, Pause, RotateCcw } from "lucide-react"
import { getSigner, publicClient } from "@/lib/viem";
import { randomUUID } from "crypto";   // Node polyfill (Next.js 13+ includes it)
import { parseGwei } from "viem/utils"


interface Bubble {
  id: string
  x: number
  y: number
  size: number
  color: string
  speed: number
  type: "normal" | "bonus" | "bomb"
  points: number
}

interface GameState {
  bubbles: Bubble[]
  score: number
  lives: number
  timeLeft: number
  isPlaying: boolean
  isPaused: boolean
  gameMode: "classic" | "timeAttack" | "survival"
  level: number
  hasStarted?: boolean
}

const BUBBLE_COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"]
const GAME_DURATION = 60 // seconds for time attack mode

export default function BubbleTapGame() {
  const [currentView, setCurrentView] = useState<"menu" | "game">("menu")
  const [gameState, setGameState] = useState<GameState>({
    bubbles: [],
    score: 0,
    lives: 3,
    timeLeft: GAME_DURATION,
    isPlaying: false,
    isPaused: false,
    gameMode: "classic",
    level: 1,
  })

  const uuid = () =>
    (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()          // browser / Edge / Chrome / Safari
      : Math.random().toString(36).slice(2) + Date.now(); 


  const gameIdRef = useRef<string | null>(null);


  const gameAreaRef = useRef<HTMLDivElement>(null)
  const gameLoopRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const bubbleSpawnRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const startTimeRef = useRef<number | null>(null)



  const getBubbleSpeed = (score: number) => Math.min(2 + Math.floor(score / 100), 7)
  const getBubbleSpawnRate = (score: number) => Math.max(1000 - Math.floor(score / 50) * 70, 350)
  const getBombChance = (score: number) => Math.min(0.08 + score / 1000, 0.25)
  const getBubbleSize = (score: number) => Math.max(60 - Math.floor(score / 50) * 4, 18)

  const createBubble = useCallback((): Bubble => {
    const gameArea = gameAreaRef.current
    if (!gameArea) return {} as Bubble
    const rect = gameArea.getBoundingClientRect()
    const size = getBubbleSize(gameState.score) + Math.random() * 10 - 5
    const bombChance = getBombChance(gameState.score)
    const bonusChance = 0.08
    let type: Bubble["type"] = "normal"
    const rand = Math.random()
    if (rand < bombChance) type = "bomb"
    else if (rand < bombChance + bonusChance) type = "bonus"

    let color = BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)]
    if (type === "bonus") color = "#FFD700"
    else if (type === "bomb") color = "#FF4444"

    return {
      id: Math.random().toString(36).substr(2, 9),
      x: Math.random() * (rect.width - size),
      y: rect.height,
      size,
      points: type === "bonus" ? 5 : type === "bomb" ? -3 : 1,
      color,
      speed: getBubbleSpeed(gameState.score) + Math.random(),
      type,
    }
  }, [gameState.score])
  const spawnBubble = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused) return
    setGameState((prev) => {
      if (prev.bubbles.length === 0 || Math.random() > 0.5) {
        return {
          ...prev,
          bubbles: [...prev.bubbles, createBubble()],
        }
      }
      return prev
    })
  }, [gameState.isPlaying, gameState.isPaused, createBubble])

  const updateBubbles = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused) return

    setGameState((prev) => {
      // Move bubbles up
      const movedBubbles = prev.bubbles.map((bubble) => ({
        ...bubble,
        y: bubble.y - bubble.speed,
      }))

      // Identify bubbles that have escaped (gone off the top)
      const escapedBubbles = movedBubbles.filter(
        (bubble) => bubble.y + bubble.size < 0 && (prev.gameMode === "survival" && bubble.type !== "bomb")
      )

      // Only keep bubbles that are still visible
      const updatedBubbles = movedBubbles.filter((bubble) => bubble.y + bubble.size > 0)

      // In survival mode, lose a life for each non-bomb bubble that escapes
      let newLives = prev.lives
      if (prev.gameMode === "survival") {
        newLives = Math.max(0, prev.lives - escapedBubbles.length)
      }

      return {
        ...prev,
        bubbles: updatedBubbles,
        lives: newLives,
      }
    })
  }, [gameState.isPlaying, gameState.isPaused, gameState.gameMode])

  const endGame = useCallback(() => {
    setGameState((prev) => ({ ...prev, isPlaying: false, isPaused: false }))
    if (gameLoopRef.current) clearInterval(gameLoopRef.current)
    if (bubbleSpawnRef.current) clearInterval(bubbleSpawnRef.current)
  }, [])

  const sendTapTx = async (bubble: Bubble, score: number) => {
    try {
      const signer = getSigner();
      console.log(signer)
  
      /* 1️⃣  payload → hex */
      const payload = {
        gid: gameIdRef.current ?? crypto.randomUUID(),
        score,
      };
      const data = ("0x" + Buffer.from(JSON.stringify(payload), "utf8").toString("hex")) as `0x${string}`;
      /* 2️⃣  estimate the gas units */
      const gas = await publicClient.estimateGas({
        account: signer.account.address,
        to: signer.account.address,
        value: BigInt(0),
        data
      });

      /* 3️⃣  send with explicit caps (2 gwei tip, 20 gwei max) */
      await signer.sendTransaction({
        account: signer.account,
        to: signer.account.address,
        value: BigInt(0),                                        // ← zero MON transferred
        data,
        gas                                             // uni             // ceiling
      });
    } catch (err) {
      console.error("tap-tx error:", err);
    }
  };
  
  const popBubble = useCallback(
    (bubbleId: string) => {
      setGameState(prev => {
        const bubble = prev.bubbles.find(b => b.id === bubbleId);
        if (!bubble) return prev;
  
        const newBubbles = prev.bubbles.filter(b => b.id !== bubbleId);
  
        // 🎯 Dynamic score logic
        let points = 10 + Math.floor((60 - bubble.size) * 0.8);
        if (bubble.type === "bonus") points = 50;
        else if (bubble.type === "bomb") points = -20;
  
        const newScore = prev.score + points;
        let newLives   = prev.lives;
        if (bubble.type === "bomb") newLives = Math.max(0, prev.lives - 1);
  
        /* ---------- NEW: fire transaction (non-blocking) ---------- */
        sendTapTx(bubble, Math.max(0, newScore));
  
        if (newLives <= 0) setTimeout(() => endGame(), 0);
  
        return {
          ...prev,
          bubbles: newBubbles,
          score  : Math.max(0, newScore),
          lives  : newLives,
          hasStarted: true,
        };
      });
    },
    [endGame],
  );


  const startGame = useCallback((mode: GameState["gameMode"]) => {
    gameIdRef.current = uuid();  
    setGameState({
      bubbles: [],
      score: 0,
      lives: mode === "survival" ? 3 : 999,
      timeLeft: mode === "timeAttack" ? GAME_DURATION : 999,
      isPlaying: true,
      isPaused: false,
      gameMode: mode,
      level: 1,
      hasStarted: false,
    })
    setCurrentView("game")
    startTimeRef.current = Date.now()
  }, [])

  const pauseGame = useCallback(() => {
    setGameState((prev) => ({ ...prev, isPaused: !prev.isPaused }))
  }, [])

  const resetGame = useCallback(() => {
    endGame()
    setCurrentView("menu")
  }, [endGame])

  // Game loop
  useEffect(() => {
    if (gameState.isPlaying && !gameState.isPaused) {
      gameLoopRef.current = setInterval(updateBubbles, 50)
      let spawnRate = getBubbleSpawnRate(gameState.score)
      bubbleSpawnRef.current = setInterval(spawnBubble, spawnRate)
      let timerInterval: NodeJS.Timeout | undefined
      if (gameState.gameMode === "timeAttack") {
        timerInterval = setInterval(() => {
          setGameState((prev) => {
            if (prev.timeLeft <= 1) {
              endGame()
              return prev
            }
            return { ...prev, timeLeft: prev.timeLeft - 1 }
          })
        }, 1000)
      }
      return () => {
        clearInterval(gameLoopRef.current as NodeJS.Timeout)
        clearInterval(bubbleSpawnRef.current as NodeJS.Timeout)
        if (timerInterval) clearInterval(timerInterval)
      }
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current)
      if (bubbleSpawnRef.current) clearInterval(bubbleSpawnRef.current)
    }
  }, [gameState.isPlaying, gameState.isPaused, gameState.gameMode, gameState.score, updateBubbles, spawnBubble, endGame])

  // Check game over conditions
  useEffect(() => {
    if (gameState.isPlaying && gameState.lives <= 0) {
      endGame()
    }
  }, [gameState.isPlaying, gameState.lives, endGame])



  useEffect(() => {
    if (gameState.isPlaying && !gameState.hasStarted) {
      const timer = setTimeout(() => {
        setGameState((prev) => prev.hasStarted ? prev : { ...prev, hasStarted: true })
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [gameState.isPlaying, gameState.hasStarted])



  if (currentView === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 p-4 pt-20">

        {/* {walletError && <div className="text-red-500 text-xs text-right mb-2">{walletError}</div>} */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold text-white mb-4 drop-shadow-lg">Bubble Pop</h1>
            <p className="text-xl text-white/90">Tap the bubbles and score big!</p>
          </div>

         

       
              <div className="grid md:grid-cols-3 gap-4">
                <Card
                  className="hover:scale-105 transition-transform cursor-pointer"
                  onClick={() => startGame("classic")}
                >
                  <CardHeader className="text-center">
                    <Target className="w-12 h-12 mx-auto mb-2 text-blue-500" />
                    <CardTitle>Classic Mode</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center text-gray-600">
                      Pop bubbles at your own pace. No time limit, just pure fun!
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className="hover:scale-105 transition-transform cursor-pointer"
                  onClick={() => startGame("timeAttack")}
                >
                  <CardHeader className="text-center">
                    <Clock className="w-12 h-12 mx-auto mb-2 text-orange-500" />
                    <CardTitle>Time Attack</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center text-gray-600">60 seconds to score as many points as possible!</p>
                  </CardContent>
                </Card>

                <Card
                  className="hover:scale-105 transition-transform cursor-pointer"
                  onClick={() => startGame("survival")}
                >
                  <CardHeader className="text-center">
                    <Zap className="w-12 h-12 mx-auto mb-2 text-red-500" />
                    <CardTitle>Survival Mode</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center text-gray-600">Don't let bubbles escape! You have 3 lives.</p>
                  </CardContent>
                </Card>
              </div>
            
         
        </div>
      </div>
    )
  }



  // Game view
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 p-2 md:p-4">

      <div className="max-w-6xl mx-auto">
        {/* Game HUD */}
        <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-lg px-3 py-1">
              Score: {gameState.score}
            </Badge>
            {gameState.gameMode === "survival" && (
              <Badge variant="destructive" className="text-lg px-3 py-1">
                Lives: {gameState.lives}
              </Badge>
            )}
            {gameState.gameMode === "timeAttack" && (
              <Badge variant="outline" className="text-lg px-3 py-1">
                Time: {gameState.timeLeft}s
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={pauseGame} variant="outline" size="sm">
              {gameState.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </Button>
            <Button onClick={resetGame} variant="outline" size="sm">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>



        {/* Game Area */}
        <Card className="relative overflow-hidden">
          <div
            ref={gameAreaRef}
            className="relative h-[60vh] md:h-[70vh] bg-gradient-to-b from-sky-200 to-blue-300 cursor-crosshair"
            style={{ touchAction: "manipulation" }}
          >
            {gameState.isPaused && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="text-white text-center">
                  <h2 className="text-4xl font-bold mb-4">PAUSED</h2>
                  <Button onClick={pauseGame} size="lg">
                    Resume Game
                  </Button>
                </div>
              </div>
            )}

            {!gameState.isPlaying && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="text-white text-center">
                  <h2 className="text-4xl font-bold mb-4">GAME OVER</h2>
                  <p className="text-xl mb-4">Final Score: {gameState.score}</p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => startGame(gameState.gameMode)} size="lg">
                      Play Again
                    </Button>
                    <Button onClick={resetGame} variant="outline" size="lg">
                      Main Menu
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Bubbles */}
            {gameState.bubbles.map((bubble) => (
              <div
                key={bubble.id}
                className="absolute rounded-full cursor-pointer transition-transform hover:scale-110 active:scale-95 shadow-lg"
                style={{
                  left: bubble.x,
                  top: bubble.y,
                  width: bubble.size,
                  height: bubble.size,
                  backgroundColor: bubble.color,
                  boxShadow: `inset 0 0 ${bubble.size / 4}px rgba(255,255,255,0.3), 0 4px 8px rgba(0,0,0,0.2)`,
                }}
                onClick={() => popBubble(bubble.id)}
                onTouchStart={(e) => {
                  e.preventDefault()
                  popBubble(bubble.id)
                }}
              >
                {bubble.type === "bonus" && (
                  <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs">
                    +50
                  </div>
                )}
                {bubble.type === "bomb" && (
                  <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs">
                    💣
                  </div>
                )}
                {bubble.type === "normal" && (
                  <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs">
                    +{10 + Math.floor((60 - bubble.size) * 0.8)}
                  </div>
                )}
              </div>
            ))}

            {/* Instructions */}
            {gameState.isPlaying && !gameState.hasStarted && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white/80">
                  <p className="text-lg">Tap the bubbles to pop them!</p>
                  <p className="text-sm mt-2">
                    {gameState.gameMode === "survival" && "Don't let them escape!"}
                    {gameState.gameMode === "timeAttack" && "Score as much as possible!"}
                    {gameState.gameMode === "classic" && "Enjoy the bubble popping!"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Game tips */}
        <div className="mt-4 text-center text-white/80 text-sm">
          <p>💡 Gold bubbles = +50 points | 💣 Bomb bubbles = -20 points & lose life</p>
        </div>
      </div>
    </div>
  )
}
