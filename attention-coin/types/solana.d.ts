export {};

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      publicKey?: {
        toBase58: () => string;
        toString: () => string;
      };
      connect: () => Promise<{ publicKey: { toBase58: () => string } }>;
      disconnect: () => Promise<void>;
      signTransaction: (transaction: any) => Promise<any>;
      signAllTransactions: (transactions: any[]) => Promise<any[]>;
      on: (event: string, callback: () => void) => void;
      off: (event: string, callback: () => void) => void;
    };
  }
}