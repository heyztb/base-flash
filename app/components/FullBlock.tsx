// src/components/FullBlocks.tsx
"use client"

import { useState, useEffect } from "react"
import { Block, http, createPublicClient } from "viem"
import { baseSepolia } from "wagmi/chains"

// Define an extended type to accommodate different transaction formats
interface ExtendedBlock extends Omit<Block, "transactions"> {
  transactions: Array<string | { hash?: string } | Record<string, unknown>>
}

const fullBlockClient = createPublicClient({
  chain: baseSepolia,
  transport: http("https://sepolia.base.org"),
})

export function FullBlocks() {
  const [latestBlock, setLatestBlock] = useState<ExtendedBlock | null>(null)
  const [expandedView, setExpandedView] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)

  useEffect(() => {
    const fetchBlock = async () => {
      try {
        const block = (await fullBlockClient.getBlock({
          blockTag: "pending",
          includeTransactions: true,
        })) as unknown as ExtendedBlock
        setLatestBlock(block)
      } catch (error) {
        console.error("Error fetching block:", error)
      }
    }

    fetchBlock() // Initial fetch
    const interval = setInterval(fetchBlock, 2000) // Poll every 2s

    // Cleanup interval on component unmount
    return () => clearInterval(interval)
  }, [])

  // Function to copy text to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback("Copied!")
      // Reset the feedback after 2 seconds
      setTimeout(() => {
        setCopyFeedback(null)
      }, 2000)
      console.log("Copied to clipboard:", text)
      return true
    } catch (error) {
      setCopyFeedback("Failed to copy")
      // Reset the feedback after 2 seconds
      setTimeout(() => {
        setCopyFeedback(null)
      }, 2000)
      console.error("Failed to copy to clipboard:", error)
      return false
    }
  }

  // Helper function to render transaction hash
  const formatTxHash = (
    tx: string | { hash?: string } | Record<string, unknown>
  ) => {
    if (typeof tx === "string") {
      return `${tx.substring(0, 10)}...${tx.substring(tx.length - 8)}`
    } else if (
      tx &&
      typeof tx === "object" &&
      "hash" in tx &&
      typeof tx.hash === "string"
    ) {
      return `${tx.hash.substring(0, 10)}...${tx.hash.substring(
        tx.hash.length - 8
      )}`
    } else {
      return "Unknown format"
    }
  }

  // Helper function to get the full transaction hash for copying
  const getFullTxHash = (
    tx: string | { hash?: string } | Record<string, unknown>
  ): string => {
    if (typeof tx === "string") {
      return tx
    } else if (
      tx &&
      typeof tx === "object" &&
      "hash" in tx &&
      typeof tx.hash === "string"
    ) {
      return tx.hash
    } else {
      return "Unknown format"
    }
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 w-full bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg md:text-xl font-semibold flex items-center">
          <div className="w-3 h-3 rounded-full bg-blue-500 mr-2 animate-pulse"></div>
          Full Blocks{" "}
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
            (2s)
          </span>
        </h2>
        <button
          onClick={() => setExpandedView(!expandedView)}
          className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
        >
          {expandedView ? "Less Details" : "More Details"}
        </button>
      </div>

      {latestBlock ? (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300">
              Block Number:
            </span>
            <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">
              {latestBlock.number?.toString()}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300">Timestamp:</span>
            <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">
              {new Date(
                Number(latestBlock.timestamp) * 1000
              ).toLocaleTimeString()}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300">Hash:</span>
            <span
              className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm truncate max-w-[220px] relative group cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={`Click to copy: ${latestBlock.hash}`}
              onClick={() =>
                latestBlock.hash && copyToClipboard(latestBlock.hash)
              }
            >
              {latestBlock.hash}
              {/* Tooltip */}
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {copyFeedback || "Click to copy"}
              </span>
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300">Gas Used:</span>
            <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">
              {latestBlock.gasUsed
                ? Number(latestBlock.gasUsed).toLocaleString()
                : "N/A"}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300">
              Transactions:
            </span>
            <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">
              {Array.isArray(latestBlock.transactions)
                ? latestBlock.transactions.length
                : "0"}
            </span>
          </div>

          {expandedView && (
            <>
              <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
                <h3 className="font-medium text-sm mb-2">
                  Recent Transactions:
                </h3>
                <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  {Array.isArray(latestBlock.transactions) &&
                  latestBlock.transactions.length > 0 ? (
                    <>
                      {latestBlock.transactions.slice(0, 3).map((tx, i) => (
                        <div
                          key={i}
                          className="text-xs font-mono truncate cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors relative group"
                          onClick={() => copyToClipboard(getFullTxHash(tx))}
                        >
                          <span className="text-gray-500 dark:text-gray-400">
                            {i + 1}.
                          </span>{" "}
                          {formatTxHash(tx)}
                          {/* Tooltip */}
                          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            {copyFeedback || "Click to copy transaction hash"}
                          </span>
                        </div>
                      ))}
                      {latestBlock.transactions.length > 3 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          + {latestBlock.transactions.length - 3} more
                          transactions
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      No transactions in this block
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <h3 className="font-medium text-sm mb-2">Block Info:</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="font-medium mb-1">Parent Hash</div>
                    <div
                      className="font-mono truncate cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors relative group"
                      onClick={() =>
                        latestBlock.parentHash &&
                        copyToClipboard(latestBlock.parentHash)
                      }
                    >
                      {latestBlock.parentHash?.substring(0, 10)}...
                      {/* Tooltip */}
                      <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        {copyFeedback || "Click to copy"}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="font-medium mb-1">Gas Limit</div>
                    <div className="font-mono truncate">
                      {latestBlock.gasLimit
                        ? Number(latestBlock.gasLimit).toLocaleString()
                        : "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-16 text-gray-500 dark:text-gray-400">
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5"
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
          Loading...
        </div>
      )}
    </div>
  )
}
