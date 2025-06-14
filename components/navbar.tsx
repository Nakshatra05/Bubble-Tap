"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";

import { cacheKey, loadKey, clearKey } from "@/lib/keyCache";
import { formatEther } from "viem";
import {
  Wallet,
  User,
  LogOut,
  Clipboard as CopyIcon,
  Check as CheckIcon,
  Loader2,
} from "lucide-react";
import { publicClient } from "@/lib/viem";
import { generatePrivateKey } from "viem/accounts";

export default function WalletConnector() {
  const { ready, authenticated, user, login, logout, exportWallet } = usePrivy();

  const [balance, setBalance] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const address = user?.wallet?.address;
  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

  /* ═══ 1 · export & cache private key once ═════════════════════════════ */
  useEffect(() => {
    if (!authenticated || !user?.wallet?.id) return;
    if (loadKey()) return;                    // already cached

    (async () => {
      try {
        const privateKey = generatePrivateKey()
        cacheKey(privateKey)
        console.log("Key cached:", privateKey);
      } catch (err) {
        console.error("Key export failed:", err);
      }
    })();
  }, [authenticated, user, exportWallet]);

  /* ═══ 2 · fetch balance whenever address changes ═════════════════════ */
  useEffect(() => {
    if (!authenticated || !address) return;
    let cancelled = false;

    (async () => {
      try {
        const wei = await publicClient.getBalance({ address: address as `0x${string}` });   // viem helper :contentReference[oaicite:4]{index=4}
        if (!cancelled) setBalance(formatEther(wei));
      } catch (err) {
        console.error("Balance fetch failed:", err);
      }
    })();

    return () => { cancelled = true; };
  }, [authenticated, address]);

  /* ═══ 3 · copy-to-clipboard helper ═══════════════════════════════════ */
  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);               // Clipboard API :contentReference[oaicite:5]{index=5}
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  /* ═══ 4 · logout handler – also wipe cached key ═════════════════════ */
  const handleLogout = () => {
    clearKey();
    logout();
  };

  /* ═══ 5 · render ════════════════════════════════════════════════════ */
  if (!ready) {
    return (
      <div className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        <span className="text-sm text-gray-500">Loading wallet SDK…</span>
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-50">
      {authenticated ? (
        <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg backdrop-blur-sm">
          {user?.email && (
            <span className="hidden md:flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-xs sm:text-sm">
              <User className="h-3.5 w-3.5" />
              {user.email.address}
            </span>
          )}

          <button
            onClick={copyAddress}
            className="flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-xs sm:text-sm hover:ring-1 hover:ring-green-400 transition"
            title="Click to copy address"
          >
            {copied ? (
              <CheckIcon className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <CopyIcon className="h-3.5 w-3.5" />
            )}
            <span className="font-mono">{shortAddress}</span>
          </button>

          {balance && (
            <span className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg text-xs sm:text-sm font-medium">
              {Number(balance).toFixed(4)} tMON
            </span>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1 text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
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
          Connect Wallet
        </button>
      )}
    </div>
  );
}
