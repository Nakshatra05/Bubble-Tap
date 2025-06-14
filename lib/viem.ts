// lib/viem.ts
import { createPublicClient, http } from "viem";
import { defineChain } from "viem";

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
