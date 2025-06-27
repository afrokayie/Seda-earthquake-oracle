'use client';

import { ConnectKitButton } from 'connectkit';
import { Wallet, User } from 'lucide-react';

export function ConnectWallet() {
  return (
    <ConnectKitButton.Custom>
      {({ isConnecting, show, address, ensName, isConnected }) => {
        return (
          <button
            onClick={show}
            className="flex items-center gap-2 px-4 py-2 bg-[#6100FF] text-white rounded-lg hover:bg-[#7E2FFF] transition-colors"
          >
            {isConnected ? (
              <>
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {ensName ?? `${address?.slice(0, 6)}...${address?.slice(-4)}`}
                </span>
                <span className="sm:hidden">Connected</span>
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4" />
                <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
              </>
            )}
          </button>
        );
      }}
    </ConnectKitButton.Custom>
  );
} 