"use client"

import { usePrivy } from "@privy-io/react-auth"
import { Wallet, User, LogOut, Loader2 } from "lucide-react"

export default function WalletConnector() {
  const { ready, authenticated, user, login, logout } = usePrivy()

  // Shorten the address for display
  const shortAddress = user?.wallet?.address
    ? `${user.wallet.address.slice(0, 6)}…${user.wallet.address.slice(-4)}`
    : ""

  // Loading state
  if (!ready) {
    return (
      <div className="absolute top-4 right-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          <span className="text-sm text-gray-500">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute top-4 right-4 z-50">
      {authenticated ? (
        <div className="flex items-center gap-3 p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg backdrop-blur-sm">
          {/* User Info */}
          <div className="flex items-center gap-2">
            {user?.email && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium">
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{user.email.address}</span>
                <span className="sm:hidden">Email</span>
              </div>
            )}

            {user?.wallet?.address && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium">
                <Wallet className="h-3.5 w-3.5" />
                <span className="font-mono">{shortAddress}</span>
              </div>
            )}
          </div>

          {/* Disconnect Button */}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
            title="Disconnect wallet"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Disconnect</span>
          </button>
        </div>
      ) : (
        <button
          onClick={login}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
        >
          <Wallet className="h-4 w-4" />
          <span>Connect Wallet</span>
        </button>
      )}
    </div>
  )
}
