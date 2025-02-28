"use client"

import { baseSepolia } from "wagmi/chains"
import { useState, useEffect } from "react"

// Extend Window interface to include ethereum (same as in NetworkSwitcher)
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

export function NetworkButton() {
  const [switching, setSwitching] = useState(false)
  const [currentNetwork, setCurrentNetwork] = useState<string>("Unknown")
  const [isBaseSepolia, setIsBaseSepolia] = useState(false)

  // Function to check the current network
  const checkNetwork = async () => {
    if (typeof window === "undefined" || !window.ethereum) return

    try {
      const chainIdHex = (await window.ethereum.request({
        method: "eth_chainId",
      })) as string
      const chainId = parseInt(chainIdHex, 16)
      const onBaseSepolia = chainId === baseSepolia.id

      setIsBaseSepolia(onBaseSepolia)
      setCurrentNetwork(onBaseSepolia ? "Base Sepolia" : "Wrong Network")
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
      const handleChainChanged = () => {
        checkNetwork()
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
    if (!window.ethereum) {
      alert(
        "Please install a Web3 wallet like Coinbase Wallet or MetaMask to use this feature."
      )
      return
    }

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
      alert(
        "Failed to switch network. Please try again or add Base Sepolia manually to your wallet."
      )
    }
  }

  return (
    <button
      onClick={switchToBaseSepolia}
      disabled={switching}
      className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-lg transition-colors ${
        isBaseSepolia
          ? "bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200"
          : "bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900 dark:hover:bg-yellow-800 text-yellow-800 dark:text-yellow-200"
      }`}
      title={
        isBaseSepolia
          ? "Currently on Base Sepolia Testnet"
          : "Switch to Base Sepolia Testnet"
      }
    >
      {switching ? (
        <>
          <svg
            className="animate-spin h-3 w-3 text-blue-600 dark:text-blue-400"
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
          <span>Switching...</span>
        </>
      ) : (
        <>
          <span
            className={`w-2 h-2 rounded-full ${
              isBaseSepolia ? "bg-blue-500" : "bg-yellow-500"
            } animate-pulse`}
          ></span>
          <span>{currentNetwork}</span>
        </>
      )}
    </button>
  )
}
