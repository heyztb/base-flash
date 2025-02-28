"use client"

import { useState, useEffect } from "react"
import { baseSepolia } from "wagmi/chains"

// Extend Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: {
        method: string
        params?: unknown[]
      }) => Promise<unknown>
      on: (eventName: string, listener: unknown) => void
      removeListener: (eventName: string, listener: unknown) => void
    }
  }
}

export function NetworkSwitcher() {
  const [isWrongNetwork, setIsWrongNetwork] = useState(false)
  const [switching, setSwitching] = useState(false)

  // Function to check the current network
  const checkNetwork = async () => {
    if (typeof window === "undefined" || !window.ethereum) return

    try {
      const chainIdHex = (await window.ethereum.request({
        method: "eth_chainId",
      })) as string
      const chainId = parseInt(chainIdHex, 16)
      setIsWrongNetwork(chainId !== baseSepolia.id)
    } catch (error) {
      console.error("Error checking network:", error)
    }
  }

  useEffect(() => {
    // Initial network check
    checkNetwork()

    // Check if ethereum is available (user has a wallet)
    if (typeof window !== "undefined" && window.ethereum) {
      // Listen for chain changes
      const handleChainChanged = (chainIdHex: string) => {
        const chainId = parseInt(chainIdHex, 16)
        setIsWrongNetwork(chainId !== baseSepolia.id)
      }

      // Subscribe to network changes
      window.ethereum.on("chainChanged", handleChainChanged as unknown)

      return () => {
        // Cleanup listener
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener(
            "chainChanged",
            handleChainChanged as unknown
          )
        }
      }
    }
  }, [])

  const switchToBaseSepolia = async () => {
    if (!window.ethereum) return

    try {
      setSwitching(true)

      // Try to switch to Base Sepolia
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${baseSepolia.id.toString(16)}` }],
        })

        // Give a short delay for wallets to process the network change
        setTimeout(() => {
          // Explicitly check if we're on the right network after switching
          checkNetwork()
          setSwitching(false)
        }, 1000)

        return // Early return to avoid immediate setSwitching(false)
      } catch (switchError: unknown) {
        // Type guard for error objects
        if (
          typeof switchError === "object" &&
          switchError !== null &&
          "code" in switchError &&
          switchError.code === 4902
        ) {
          // This error code indicates that the chain has not been added to the wallet
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${baseSepolia.id.toString(16)}`,
                chainName: "Base Sepolia",
                nativeCurrency: {
                  name: "ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
                rpcUrls: ["https://sepolia.base.org"],
                blockExplorerUrls: ["https://sepolia.basescan.org/"],
              },
            ],
          })

          // Check network after adding
          setTimeout(() => {
            checkNetwork()
            setSwitching(false)
          }, 1000)

          return // Early return
        } else {
          throw switchError
        }
      }
    } catch (error) {
      console.error("Failed to switch network:", error)
      // Even if there's an error, check the network again
      checkNetwork()
      setSwitching(false)
    }
  }

  if (!isWrongNetwork) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-lg shadow-lg p-4 max-w-md">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-yellow-600 dark:text-yellow-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              Wrong Network Detected
            </h3>
            <div className="mt-1 text-xs text-yellow-700 dark:text-yellow-400">
              <p>
                You are connected to an unsupported network. This app only works
                on Base Sepolia Testnet to prevent accidental mainnet
                transactions.
              </p>
            </div>
            <div className="mt-3">
              <button
                onClick={switchToBaseSepolia}
                disabled={switching}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-yellow-800 dark:text-yellow-200 bg-yellow-200 dark:bg-yellow-800 hover:bg-yellow-300 dark:hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                {switching ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-yellow-800 dark:text-yellow-200"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Switching...
                  </>
                ) : (
                  "Switch to Base Sepolia"
                )}
              </button>
              <button
                onClick={checkNetwork}
                className="ml-2 text-xs text-yellow-600 dark:text-yellow-400 hover:underline"
                title="Manually refresh network status"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
