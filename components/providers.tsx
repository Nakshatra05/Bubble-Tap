'use client';

import {PrivyProvider} from '@privy-io/react-auth';
import { monadTestnet } from 'viem/chains';

export default function Providers({children}: {children: React.ReactNode}) {
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;
    const clientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID!;
  return (
    <PrivyProvider
      appId={appId}
      clientId={clientId}
      config={{
        defaultChain: monadTestnet,
        supportedChains: [monadTestnet],
        appearance: {
            theme: 'dark',
            accentColor: '#676FFF',
            logo: '/scan-heart.png',
        },
        embeddedWallets: {
            ethereum: {
                createOnLogin: 'users-without-wallets', 
            },
        },
    }}
    >
      {children}
    </PrivyProvider>
  );
}