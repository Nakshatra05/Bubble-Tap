// lib/viem.ts
import { createPublicClient, createWalletClient, http } from "viem";
import { defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { loadKey } from "./keyCache";

export const monadTestnet = defineChain({
  id: 10143,                         // official test-net ID :contentReference[oaicite:6]{index=6}
  name: "Monad Testnet",
  nativeCurrency: { name: "tMON", symbol: "tMON", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
});

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});


export function getSigner() {
    const pk = loadKey();                         // <─ from utils/keyCache
    if (!pk) throw new Error("No cached private key");
    const account = privateKeyToAccount(pk as `0x${string}`);            // viem helper :contentReference[oaicite:2]{index=2}
    return createWalletClient({
      chain: monadTestnet,
      account,
      transport: http(),
    });
  }