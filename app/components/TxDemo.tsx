"use client"

import { useState, useEffect } from "react"
import { useAccount, useSendTransaction } from "wagmi"
import { createPublicClient, http } from "viem"
import { baseSepolia } from "wagmi/chains"

// Set up clients for full blocks and flashblocks
const fullBlockClient = createPublicClient({
  chain: baseSepolia,
  transport: http("https://sepolia.base.org"),
})

const flashBlockClient = createPublicClient({
  chain: baseSepolia,
  transport: http("https://sepolia-preconf.base.org"),
})

export function TransactionDemo() {
  const { address, isConnected } = useAccount()
  const [sentTime, setSentTime] = useState<number | null>(null)
  const [flashTime, setFlashTime] = useState<number | null>(null)
  const [fullTime, setFullTime] = useState<number | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const { sendTransaction, isPending } = useSendTransaction({
    mutation: {
      onSuccess: (data) => {
        setTxHash(data)
        setSentTime(Date.now())
      },
      onError: (error) => {
        console.error("Transaction failed:", error)
        alert("Failed to send transaction. Check console for details.")
      },
    },
  })

  // Monitor transaction inclusion in full blocks and flashblocks
  useEffect(() => {
    if (!txHash) return

    const flashInterval = setInterval(async () => {
      try {
        const block = await flashBlockClient.getBlock({
          blockTag: "pending",
          includeTransactions: true,
        })
        if (
          block.transactions.some((tx: { hash: string }) => tx.hash === txHash)
        ) {
          setFlashTime(Date.now())
          clearInterval(flashInterval)
        }
      } catch (error) {
        console.error("Error checking flashblock:", error)
      }
    }, 200)

    const interval = setInterval(async () => {
      try {
        const block = await fullBlockClient.getBlock({
          blockTag: "pending",
          includeTransactions: true,
        })
        if (
          block.transactions.some((tx: { hash: string }) => tx.hash === txHash)
        ) {
          setFullTime(Date.now())
          clearInterval(interval)
        }
      } catch (error) {
        console.error("Error checking full block:", error)
      }
    }, 200)

    // Cleanup
    return () => {
      clearInterval(interval)
      clearInterval(flashInterval)
    }
  }, [txHash])

  const handleSendTransaction = () => {
    // Reset previous results
    setSentTime(null)
    setFlashTime(null)
    setFullTime(null)

    // Send a small amount back to the sender's own address
    sendTransaction({
      to: address,
      value: BigInt(1000000000000000), // 0.001 ETH
    })
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 w-full bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
      <h2 className="text-lg md:text-xl font-semibold mb-3">
        Transaction Speed Test
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-4">
        Send a test transaction to see how much faster it is included in a
        flashblock compared to a full block.
      </p>

      {isConnected ? (
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
              Connected as:
            </p>
            <p className="font-mono text-sm truncate">{address}</p>
          </div>

          <button
            onClick={handleSendTransaction}
            disabled={isPending}
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white font-medium px-5 py-2.5 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                Sending...
              </span>
            ) : (
              "Send Test Transaction"
            )}
          </button>

          {txHash && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-md font-medium mb-2">Transaction Details</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                Transaction Hash: {txHash}
              </p>
              <div className="space-y-2 text-sm">
                {sentTime && (
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <span className="text-gray-600 dark:text-gray-300">
                      Sent at:
                    </span>
                    <span className="font-mono">
                      {new Date(sentTime).toLocaleTimeString()}
                    </span>
                  </div>
                )}

                {flashTime && (
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <span className="text-gray-600 dark:text-gray-300">
                      Flashblock:
                    </span>
                    <span className="font-mono">
                      {new Date(flashTime).toLocaleTimeString()}
                      <span className="ml-2 text-green-500">
                        ({((flashTime - sentTime!) / 1000).toFixed(2)}s)
                      </span>
                    </span>
                  </div>
                )}

                {fullTime && (
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <span className="text-gray-600 dark:text-gray-300">
                      Full Block:
                    </span>
                    <span className="font-mono">
                      {new Date(fullTime).toLocaleTimeString()}
                      <span className="ml-2 text-blue-500">
                        ({((fullTime - sentTime!) / 1000).toFixed(2)}s)
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {flashTime && fullTime && (
                <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-900/30">
                  <p className="font-bold text-green-700 dark:text-green-400">
                    Speed Improvement:{" "}
                    {((fullTime - sentTime!) / (flashTime - sentTime!)).toFixed(
                      1
                    )}
                    x faster
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 rounded-lg text-yellow-700 dark:text-yellow-400">
          Please connect your wallet to send a test transaction.
        </div>
      )}

      <div className="mt-5 text-sm text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <p className="mb-2">Need test Ether? Get some from:</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <a
            href="https://portal.cdp.coinbase.com/products/faucet"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-500 hover:text-blue-600 transition-colors"
          >
            <span>CDP Base Sepolia Faucet</span>
            <svg
              className="ml-1 w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              ></path>
            </svg>
          </a>
          <span className="hidden sm:inline">|</span>
          <a
            href="https://faucet.quicknode.com/base/sepolia"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-500 hover:text-blue-600 transition-colors"
          >
            <span>Quicknode Base Sepolia Faucet</span>
            <svg
              className="ml-1 w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              ></path>
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}
