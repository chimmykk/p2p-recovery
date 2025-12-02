"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ConnectButton, useActiveAccount, useActiveWallet, useActiveWalletChain, useDisconnect } from "thirdweb/react";
import { inAppWallet } from "thirdweb/wallets";
import { client } from "@/lib/thirdwebClient";
import { THIRDWEB_CHAINS, type NetworkKey } from "@/lib/network";
import { Loader2, LogOut, Copy, Check } from "lucide-react";

interface WalletConnectProps {
  onP2PWalletChange?: (address: string) => void;
  compact?: boolean;
  selectedNetwork?: NetworkKey;
}

export function WalletConnect({ onP2PWalletChange, compact = false, selectedNetwork = 'monad' }: WalletConnectProps) {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const activeChain = useActiveWalletChain();
  const { disconnect } = useDisconnect();
  const [p2pSmartAccount, setP2pSmartAccount] = useState<string>("");
  const [isLoadingP2PAccount, setIsLoadingP2PAccount] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Get the chain for the selected network
  const selectedChain = THIRDWEB_CHAINS[selectedNetwork];

  // Fetch P2P.ME user address from Thirdweb accounts API
  useEffect(() => {
    const fetchP2PUserAccount = async () => {
      if (!wallet || wallet.id !== "inApp") {
        setP2pSmartAccount("");
        onP2PWalletChange?.("");
        return;
      }

      setIsLoadingP2PAccount(true);
      try {
        // Get client ID
        const CLIENT_ID = client.clientId;

        // Find the wallet token in localStorage
        const walletTokenKey = Object.keys(localStorage).find((key) =>
          key.startsWith("walletToken-")
        );

        if (!walletTokenKey) {
          console.error("No wallet token found in localStorage");
          setIsLoadingP2PAccount(false);
          return;
        }

        const authToken = localStorage.getItem(walletTokenKey);
        if (!authToken) {
          console.error("Could not retrieve auth token");
          setIsLoadingP2PAccount(false);
          return;
        }

        console.log("Calling Thirdweb accounts API...");
        console.log("Client ID:", CLIENT_ID);

        // Call Thirdweb accounts API
        const response = await fetch(
          "https://embedded-wallet.thirdweb.com/api/2024-05-05/accounts",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer embedded-wallet-token:${authToken}`,
              "x-client-id": CLIENT_ID,
            },
          }
        );

        console.log("Response status:", response.status);

        if (!response.ok) {
          console.error(
            "API request failed:",
            response.status,
            response.statusText
          );
          setIsLoadingP2PAccount(false);
          return;
        }

        const data = await response.json();
        console.log("Thirdweb accounts API Response:", data);

        // Extract address
        if (data?.wallets && data.wallets.length > 0) {
          const address = data.wallets[0].address;
          setP2pSmartAccount(address);
          onP2PWalletChange?.(address);
          console.log("P2P.ME User owner address/ not smart account:", address);
        } else {
          console.error("No wallets found in response");
          onP2PWalletChange?.("");
        }
      } catch (error) {
        console.error("Error fetching P2P.ME Smart Account:", error);
        onP2PWalletChange?.("");
      } finally {
        setIsLoadingP2PAccount(false);
      }
    };

    fetchP2PUserAccount();
  }, [wallet, account?.address, onP2PWalletChange]);

  const wallets = [
    inAppWallet({
      auth: {
        options: [
          "google",
          "passkey",
          "phone"

        ],
      },
      smartAccount: {
        chain: selectedChain,
        sponsorGas: true,
      },
    }),
    // createWallet("io.metamask"),
    // createWallet("com.coinbase.wallet"),
    // createWallet("me.rainbow"),
    // createWallet("app.phantom"),
    // createWallet("io.zerion.wallet"),
  ];

  const copyAddress = () => {
    if (account?.address) {
      navigator.clipboard.writeText(account.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = () => {
    if (wallet) {
      disconnect(wallet);
    }
  };

  const isWrongNetwork = account && activeChain?.id !== selectedChain.id;

  // Custom Connected View for Compact Mode
  const CompactConnectedView = () => (
    <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1.5 pr-3 border border-neutral-200 dark:border-neutral-700">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
          {account?.address.slice(0, 2)}
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
            Connected
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 ml-2 border-l border-neutral-200 dark:border-neutral-700 pl-2">

        <button
          onClick={handleDisconnect}
          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-all text-neutral-400 hover:text-red-500"
          title="Disconnect"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  // Compact mode: just show the button
  if (compact) {
    if (account && !isWrongNetwork) {
      return <CompactConnectedView />;
    }
    return (
      <ConnectButton
        client={client}
        wallets={wallets}
        chain={selectedChain}
        chains={[selectedChain]}
        connectButton={{
          label: isWrongNetwork ? "Switch Network" : "Connect Wallet",
          style: {
            height: "40px",
            fontSize: "14px",
            padding: "0 16px",
            minWidth: "140px",
            backgroundColor: isWrongNetwork ? "#e11d48" : "#7469CE",
            color: "#ffffff",
          },
        }}
        connectModal={{
          size: "compact",
          title: "Sign In",
          titleIcon: "",
          showThirdwebBranding: false,
          welcomeScreen: {
            title: "Welcome to P2P Recovery",
            subtitle: "Connect your wallet to get started",
          },
        }}
        theme="light"
      />
    );
  }

  // card details
  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold mb-4 dark:text-white">
            {account ? "Wallet Connected" : "Connect Wallet"}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {account
              ? "Your wallet is connected and ready"
              : "Connect with your preferred method"}
          </p>

          {account && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-full">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-mono text-neutral-600 dark:text-neutral-300">
                  {account.address.slice(0, 6)}...{account.address.slice(-4)}
                </span>
                <button onClick={copyAddress} className="ml-2 text-neutral-400 hover:text-neutral-600">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          )}

          {account && wallet?.id === "inApp" && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-3 text-left">
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  P2P.ME User/owner wallet:
                </p>
                {isLoadingP2PAccount ? (
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs">Loading</span>
                  </div>
                ) : p2pSmartAccount ? (
                  <p className="text-xs font-mono text-blue-700 dark:text-blue-300 break-all">
                    {p2pSmartAccount}
                  </p>
                ) : (
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Unable to fetch P2P.ME user/owner wallet
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter>
        {account && !isWrongNetwork ? (
          <button
            onClick={handleDisconnect}
            className="w-full h-12 flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Disconnect Wallet
          </button>
        ) : (
          <ConnectButton
            client={client}
            wallets={wallets}
            chain={selectedChain}
            chains={[selectedChain]}
            connectButton={{
              label: isWrongNetwork ? "Switch Network" : "Connect Wallet",
              style: {
                width: "100%",
                height: "48px",
                fontSize: "16px",
                backgroundColor: isWrongNetwork ? "#e11d48" : "#7469CE",
                color: "#ffffff",
              },
            }}
            connectModal={{
              size: "compact",
              title: "Sign In",
              titleIcon: "",
              showThirdwebBranding: false,
              welcomeScreen: {
                title: "Welcome to P2P Recovery",
                subtitle: "Connect your wallet to get started",
              },
            }}
            theme="light"
          />
        )}
      </CardFooter>
    </Card>
  );
}

