"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Trophy, Clock, Target, Zap, Play, Pause, RotateCcw } from "lucide-react"
import { ethers } from "ethers"

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

interface Player {
  id: string
  name: string
  score: number
  isReady: boolean
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

interface MultiplayerRoom {
  id: string
  name: string
  players: Player[]
  maxPlayers: number
  isActive: boolean
}

const BUBBLE_COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"]
const GAME_DURATION = 60 // seconds for time attack mode

export default function BubbleTapGame() {
  const [currentView, setCurrentView] = useState<"menu" | "game" | "multiplayer">("menu")
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

  // Multiplayer state
  const [playerName, setPlayerName] = useState("")
  const [currentRoom, setCurrentRoom] = useState<MultiplayerRoom | null>(null)
  const [availableRooms, setAvailableRooms] = useState<MultiplayerRoom[]>([])
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [walletError, setWalletError] = useState<string | null>(null)

  const gameAreaRef = useRef<HTMLDivElement>(null)
  const gameLoopRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const bubbleSpawnRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const startTimeRef = useRef<number | null>(null)

  // Always call useRef at the top level for playerId fallback
  const randomIdRef = useRef(Math.random().toString(36).substr(2, 9));
  const playerId = walletAddress || playerName || randomIdRef.current;

  // Initialize demo rooms
  useEffect(() => {
    setAvailableRooms([
      {
        id: "room1",
        name: "Bubble Masters",
        players: [
          { id: "player1", name: "Alice", score: 1250, isReady: true },
          { id: "player2", name: "Bob", score: 980, isReady: false },
        ],
        maxPlayers: 4,
        isActive: false,
      },
      {
        id: "room2",
        name: "Speed Poppers",
        players: [{ id: "player3", name: "Charlie", score: 2100, isReady: true }],
        maxPlayers: 6,
        isActive: true,
      },
    ])
  }, [])

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

  const popBubble = useCallback(
    (bubbleId: string) => {
      setGameState((prev) => {
        const bubble = prev.bubbles.find((b) => b.id === bubbleId)
        if (!bubble) return prev

        const newBubbles = prev.bubbles.filter((b) => b.id !== bubbleId)

        // 🎯 Dynamic score logic
        let points = 10 + Math.floor((60 - bubble.size) * 0.8) // smaller = more points
        if (bubble.type === "bonus") points = 50
        else if (bubble.type === "bomb") points = -20

        const newScore = prev.score + points
        let newLives = prev.lives
        if (bubble.type === "bomb") newLives = Math.max(0, prev.lives - 1)

        if (currentRoom) {
          setCurrentRoom((room) => {
            if (!room) return room
            return {
              ...room,
              players: room.players.map((p) =>
                p.id === playerId ? { ...p, score: newScore } : p,
              ),
            }
          })
        }

        if (newLives <= 0) setTimeout(() => endGame(), 0)

        return {
          ...prev,
          bubbles: newBubbles,
          score: Math.max(0, newScore),
          lives: newLives,
          hasStarted: true,
        }
      })
    },
    [currentRoom, playerId, endGame],
  )


  const startGame = useCallback((mode: GameState["gameMode"]) => {
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

  // Multiplayer functions
  const joinRoom = useCallback(
    (room: MultiplayerRoom) => {
      if (room.players.length >= room.maxPlayers || !playerName.trim()) return
      const newPlayer: Player = {
        id: playerId,
        name: playerName.trim(),
        score: 0,
        isReady: false,
      }
      const updatedRoom = {
        ...room,
        players: [...room.players, newPlayer],
      }
      setCurrentRoom(updatedRoom)
      setAvailableRooms((rooms) => rooms.map((r) => (r.id === room.id ? updatedRoom : r)))
      setCurrentView("multiplayer")
    },
    [playerName, playerId],
  )

  useEffect(() => {
    if (gameState.isPlaying && !gameState.hasStarted) {
      const timer = setTimeout(() => {
        setGameState((prev) => prev.hasStarted ? prev : { ...prev, hasStarted: true })
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [gameState.isPlaying, gameState.hasStarted])

  const leaveRoom = useCallback(() => {
    if (!currentRoom) return

    const updatedRoom = {
      ...currentRoom,
      players: currentRoom.players.filter((p) => p.id !== playerId),
    }

    setAvailableRooms((rooms) => rooms.map((r) => (r.id === currentRoom.id ? updatedRoom : r)))
    setCurrentRoom(null)
    setCurrentView("menu")
  }, [currentRoom, playerId])

  const toggleReady = useCallback(() => {
    if (!currentRoom) return

    const updatedRoom = {
      ...currentRoom,
      players: currentRoom.players.map((p) => (p.id === playerId ? { ...p, isReady: !p.isReady } : p)),
    }

    setCurrentRoom(updatedRoom)
    setAvailableRooms((rooms) => rooms.map((r) => (r.id === currentRoom.id ? updatedRoom : r)))
  }, [currentRoom, playerId])

  const startMultiplayerGame = useCallback(() => {
    if (!currentRoom || !currentRoom.players.every((p) => p.isReady)) return
    startGame("classic")
  }, [currentRoom, startGame])

  // Connect Monad wallet (EIP-1193 style)
  const connectWallet = async () => {
    try {
      if (!(window as any).ethereum) {
        setWalletError("Monad wallet not found. Please install it.")
        return
      }
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const accounts = await provider.send("eth_requestAccounts", [])
      setWalletAddress(accounts[0])
      setWalletError(null)
    } catch (err: any) {
      setWalletError(err.message)
    }
  }

  useEffect(() => {
    if (walletAddress) {
      setPlayerName(walletAddress)
    }
  }, [walletAddress])

  // Add disconnectWallet function
  const disconnectWallet = () => {
    setWalletAddress(null)
    setWalletError(null)
    // Optionally reset playerName if it was set from wallet
    if (playerName === walletAddress) setPlayerName("")
  }

  if (currentView === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 p-4">
       
        {walletError && <div className="text-red-500 text-xs text-right mb-2">{walletError}</div>}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold text-white mb-4 drop-shadow-lg">Bubble Pop</h1>
            <p className="text-xl text-white/90">Tap the bubbles and score big!</p>
          </div>

          <Tabs defaultValue="singleplayer" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="singleplayer">Single Player</TabsTrigger>
              <TabsTrigger value="multiplayer">Multiplayer</TabsTrigger>
            </TabsList>

            <TabsContent value="singleplayer">
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
            </TabsContent>

            <TabsContent value="multiplayer">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Multiplayer Rooms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Input
                      placeholder="Enter your name"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="mb-4"
                    />
                  </div>

                  <div className="space-y-3">
                    {availableRooms.map((room) => (
                      <div
                        key={room.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div>
                          <h3 className="font-semibold">{room.name}</h3>
                          <p className="text-sm text-gray-600">
                            {room.players.length}/{room.maxPlayers} players
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {room.isActive && <Badge variant="secondary">In Game</Badge>}
                          <Button
                            onClick={() => joinRoom(room)}
                            disabled={room.players.length >= room.maxPlayers || !playerName.trim() || room.isActive}
                            size="sm"
                          >
                            Join
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    )
  }

  if (currentView === "multiplayer" && currentRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 p-4">
        
        
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {currentRoom.name}
                </CardTitle>
                <Button variant="outline" onClick={leaveRoom}>
                  Leave Room
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">
                    Players ({currentRoom.players.length}/{currentRoom.maxPlayers})
                  </h3>
                  <div className="space-y-2">
                    {currentRoom.players.map((player) => (
                      <div key={player.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${player.isReady ? "bg-green-500" : "bg-gray-300"}`} />
                          <span className={player.id === playerId ? "font-bold" : ""}>
                            {player.name} {player.id === playerId && "(You)"}
                          </span>
                        </div>
                        <Badge variant="outline">{player.score} pts</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Game Controls</h3>
                  <div className="space-y-3">
                    <Button
                      onClick={toggleReady}
                      variant={currentRoom.players.find((p) => p.id === playerId)?.isReady ? "default" : "outline"}
                      className="w-full"
                    >
                      {currentRoom.players.find((p) => p.id === playerId)?.isReady ? "Ready!" : "Ready Up"}
                    </Button>

                    {currentRoom.players.every((p) => p.isReady) && (
                      <Button onClick={startMultiplayerGame} className="w-full" size="lg">
                        <Play className="w-4 h-4 mr-2" />
                        Start Game
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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

        {/* Multiplayer leaderboard */}
        {currentRoom && (
          <Card className="mb-4">
            <CardContent className="p-3">
              <div className="flex items-center gap-4 overflow-x-auto">
                {currentRoom.players
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => (
                    <div key={player.id} className="flex items-center gap-2 min-w-fit">
                      {index === 0 && <Trophy className="w-4 h-4 text-yellow-500" />}
                      <span className={`text-sm ${player.id === playerId ? "font-bold" : ""}`}>
                        {player.name}: {player.score}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

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
