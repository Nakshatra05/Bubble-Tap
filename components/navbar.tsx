"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";

import { cacheKey, loadKey, clearKey } from "@/lib/keyCache";
import { getSigner as getSignerFactory, publicClient } from "@/lib/viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { formatEther } from "viem";

import {
  Wallet,
  User,
  LogOut,
  Clipboard as CopyIcon,
  Check as CheckIcon,
  Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* small helper so we can rebuild signer whenever a key appears       */
const buildSignerFromCache = () => {
  const pk = loadKey();
  return pk ? getSignerFactory() : null;           // getSignerFactory accepts pk
};
/* ------------------------------------------------------------------ */

export default function WalletConnector() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  const [signer, setSigner]     = useState(() => buildSignerFromCache());
  const [balance, setBalance]   = useState<string | null>(null);
  const [copied,  setCopied]    = useState(false);

  const address = signer?.account.address;
  const shortAddress =
    address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

  /* ────────────────────────────────────────────────────────────────
     1. If user just authenticated and we have no cached key,
        create one, store, and rebuild signer
     ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!authenticated) return;

    // 1a. if we already have a key/signature, nothing to do
    if (signer) return;

    // 1b. Otherwise generate a new key → cache → build signer
    const pk = generatePrivateKey();
    cacheKey(pk);
    setSigner(getSignerFactory());
  }, [authenticated, signer]);

  /* ────────────────────────────────────────────────────────────────
     2. When cached key disappears (logout), drop signer state
     ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!loadKey()) setSigner(null);
  }, [authenticated]); // runs again after logout clears auth state

  /* ────────────────────────────────────────────────────────────────
     3. Fetch balance whenever signer/address changes
     ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!authenticated || !address) return;
    let cancelled = false;

    (async () => {
      try {
        const wei = await publicClient.getBalance({
          address: address as `0x${string}`,
        });
        if (!cancelled) setBalance(formatEther(wei));
      } catch (err) {
        console.error("Balance fetch failed:", err);
      }
    })();

    return () => { cancelled = true; };
  }, [authenticated, address]);

  /* ────────────────────────────────────────────────────────────────
     4. Copy helper
     ──────────────────────────────────────────────────────────────── */
  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  /* ────────────────────────────────────────────────────────────────
     5. Logout handler – clears key & signer
     ──────────────────────────────────────────────────────────────── */
  const handleLogout = useCallback(() => {
    clearKey();
    setSigner(null);
    logout();
  }, [logout]);

  /* ────────────────────────────────────────────────────────────────
     6. Render
     ──────────────────────────────────────────────────────────────── */
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
      {authenticated && signer ? (
        <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg backdrop-blur-sm">
          {/* email chip (desktop only) */}
          {user?.email && (
            <span className="hidden md:flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-xs sm:text-sm">
              <User className="h-3.5 w-3.5" />
              {user.email.address}
            </span>
          )}

          {/* address chip */}
          <button
            onClick={copyAddress}
            className="flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-xs sm:text-sm hover:ring-1 hover:ring-green-400 transition"
            title="Copy address"
          >
            {copied ? (
              <CheckIcon className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <CopyIcon className="h-3.5 w-3.5" />
            )}
            <span className="font-mono">{shortAddress}</span>
          </button>

          {/* balance */}
          {balance && (
            <span className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg text-xs sm:text-sm font-medium">
              {Number(balance).toFixed(4)} tMON
            </span>
          )}

          {/* disconnect */}
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
