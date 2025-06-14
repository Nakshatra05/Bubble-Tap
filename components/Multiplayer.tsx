import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Users, Play } from "lucide-react"

interface Player {
  id: string
  name: string
  score: number
  isReady: boolean
}

interface MultiplayerRoom {
  id: string
  name: string
  players: Player[]
  maxPlayers: number
  isActive: boolean
}

interface MultiplayerProps {
  onJoinRoom: (room: MultiplayerRoom) => void
  onLeaveRoom: () => void
  onToggleReady: () => void
  onStartMultiplayerGame: () => void
  currentRoom: MultiplayerRoom | null
  availableRooms: MultiplayerRoom[]
  playerName: string
  setPlayerName: (name: string) => void
  playerId: string
  setCurrentRoom: (room: MultiplayerRoom | null) => void
  setAvailableRooms: (rooms: MultiplayerRoom[]) => void
  setCurrentView: (view: "menu" | "game" | "multiplayer") => void
}

const Multiplayer: React.FC<MultiplayerProps> = ({
  onJoinRoom,
  onLeaveRoom,
  onToggleReady,
  onStartMultiplayerGame,
  currentRoom,
  availableRooms,
  playerName,
  setPlayerName,
  playerId,
}) => {
  if (!currentRoom) {
    // Room list view
    return (
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
                    onClick={() => onJoinRoom(room)}
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
    )
  }
  // In-room view
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
              <Button variant="outline" onClick={onLeaveRoom}>
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
                    onClick={onToggleReady}
                    variant={currentRoom.players.find((p) => p.id === playerId)?.isReady ? "default" : "outline"}
                    className="w-full"
                  >
                    {currentRoom.players.find((p) => p.id === playerId)?.isReady ? "Ready!" : "Ready Up"}
                  </Button>
                  {currentRoom.players.every((p) => p.isReady) && (
                    <Button onClick={onStartMultiplayerGame} className="w-full" size="lg">
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

export default Multiplayer 