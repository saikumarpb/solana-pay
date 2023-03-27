import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import React, { ReactNode, useMemo } from 'react';
import { clusterApiUrl, Cluster } from '@solana/web3.js';
import {
  BackpackWalletAdapter,
  Coin98WalletAdapter,
  ExodusWalletAdapter,
  LedgerWalletAdapter,
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  SolletWalletAdapter,
  TrustWalletAdapter,
} from '@solana/wallet-adapter-wallets';

require('@solana/wallet-adapter-react-ui/styles.css');

interface WalletContextProviderProps {
  children: ReactNode;
  cluster: Cluster;
}

function WalletContextProvider({
  cluster,
  children,
}: WalletContextProviderProps) {
  const endpoint = clusterApiUrl(cluster);

  const network = () => {
    switch (cluster) {
      case 'devnet':
        return WalletAdapterNetwork.Devnet;
      case 'testnet':
        return WalletAdapterNetwork.Testnet;
      case 'mainnet-beta':
        return WalletAdapterNetwork.Mainnet;
      default:
        return WalletAdapterNetwork.Devnet;
    }
  };

  const wallets = useMemo(
    () => [
      new BackpackWalletAdapter(),
      new PhantomWalletAdapter(),
      new ExodusWalletAdapter(),
      new SolflareWalletAdapter(),
      new SolletWalletAdapter(),
      new LedgerWalletAdapter(),
      new TrustWalletAdapter(),
      new Coin98WalletAdapter(),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default WalletContextProvider;
