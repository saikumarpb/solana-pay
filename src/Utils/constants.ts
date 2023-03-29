export const SOLANA_LOGO_URI =
  'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

export declare enum WalletAdapterNetwork {
  Mainnet = 'mainnet-beta',
  Testnet = 'testnet',
  Devnet = 'devnet',
}

export type AssociatedTokenAccountCreationStatus =
  | 'NOT_INITIATED'
  | 'INITIALIZED'
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'COMPLETED';

