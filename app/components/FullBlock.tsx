// src/components/FullBlocks.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import React from "react"
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

// Component to render a single full block square
interface FullBlockSquareProps {
  block: ExtendedBlock
  onClick?: () => void
  isSelected?: boolean
}

const FullBlockSquare = ({
  block,
  onClick,
  isSelected = false,
}: FullBlockSquareProps) => {
  const txCount = Array.isArray(block.transactions)
    ? block.transactions.length
    : 0
  const gasUsed = block.gasUsed ? Number(block.gasUsed) : 0
  const gasLimit = block.gasLimit ? Number(block.gasLimit) : 30000000 // Default max if not available
  const gasPercentage = Math.min((gasUsed / gasLimit) * 100, 100)

  // Generate a color based on transaction count (more tx = darker blue)
  const opacity = Math.min(0.2 + (txCount / 10) * 0.8, 1)

  return (
    <div
      onClick={onClick}
      className={`relative aspect-square border ${
        isSelected
          ? "border-blue-500 dark:border-blue-400 border-2 shadow-md"
          : "border-gray-300 dark:border-gray-600"
      } rounded cursor-pointer transition-all hover:shadow-md`}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
      )}

      {/* Block number indicator */}
      <div className="absolute top-1 left-1 text-xs font-mono bg-white dark:bg-gray-800 px-1 rounded">
        #{block.number?.toString()}
      </div>

      {/* Gas used indicator (height of the fill) */}
      <div
        className={`absolute bottom-0 left-0 right-0 ${
          isSelected
            ? "bg-blue-100 dark:bg-blue-800"
            : "bg-gray-200 dark:bg-gray-700"
        }`}
        style={{ height: `${gasPercentage}%`, opacity }}
      ></div>

      {/* Transaction count indicator */}
      <div className="absolute bottom-1 right-1 text-xs font-mono bg-white dark:bg-gray-800 px-1 rounded">
        {txCount}tx
      </div>
    </div>
  )
}

export function FullBlocks() {
  const [blocks, setBlocks] = useState<ExtendedBlock[]>([])
  const [latestBlock, setLatestBlock] = useState<ExtendedBlock | null>(null)
  const [selectedBlock, setSelectedBlock] = useState<ExtendedBlock | null>(null)
  const [expandedView, setExpandedView] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const [visualizationType, setVisualizationType] = useState<
    "list" | "squares"
  >("squares")
  const [pauseUpdates, setPauseUpdates] = useState(false)

  // Use a ref to access the latest pauseUpdates state in the interval callback
  const pauseUpdatesRef = useRef(pauseUpdates)
  useEffect(() => {
    pauseUpdatesRef.current = pauseUpdates
  }, [pauseUpdates])

  const displayBlock = selectedBlock || latestBlock

  useEffect(() => {
    let isMounted = true
    let interval: NodeJS.Timeout | null = null

    const fetchBlock = async () => {
      try {
        // Skip if updates are paused - use the ref's current value
        if (pauseUpdatesRef.current) {
          console.log("Skipping block fetch while paused")
          return
        }

        const block = (await fullBlockClient.getBlock({
          blockTag: "pending",
          includeTransactions: true,
        })) as unknown as ExtendedBlock

        // Only update state if component is still mounted
        if (isMounted) {
          setLatestBlock(block)

          // Add new block to the array if it's not already there
          setBlocks((prevBlocks) => {
            // Check if we already have this block by number and hash
            const exists = prevBlocks.some(
              (prevBlock) =>
                prevBlock.number === block.number &&
                prevBlock.hash === block.hash
            )

            if (exists) return prevBlocks

            const newBlocks = [block, ...prevBlocks]
            // Limit array size to prevent memory issues
            return newBlocks.slice(0, 20)
          })
        }
      } catch (error) {
        console.error("Error fetching block:", error)
      }
    }

    // Initial fetch
    fetchBlock()

    // Set up interval only if not paused
    if (!pauseUpdatesRef.current) {
      interval = setInterval(fetchBlock, 2000) // Poll every 2s
    }

    // Cleanup function
    return () => {
      isMounted = false
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [pauseUpdates]) // Re-run effect when pause state changes

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
        <div className="flex space-x-2">
          <button
            onClick={() =>
              setVisualizationType(
                visualizationType === "list" ? "squares" : "list"
              )
            }
            className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          >
            {visualizationType === "list" ? "Show Blocks" : "Hide Blocks"}
          </button>
          <button
            onClick={() => setExpandedView(!expandedView)}
            className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          >
            {expandedView ? "Less Details" : "More Details"}
          </button>
        </div>
      </div>

      {/* Squares visualization */}
      {visualizationType === "squares" && blocks.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {selectedBlock ? (
                <span className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-1.5 animate-pulse"></span>
                  <strong>
                    Viewing block #{selectedBlock.number?.toString()}
                  </strong>
                </span>
              ) : (
                <span>
                  {pauseUpdates ? (
                    <span className="flex items-center">
                      <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-1.5"></span>
                      Updates paused
                    </span>
                  ) : (
                    <span>Latest blocks (newest first)</span>
                  )}
                </span>
              )}
            </div>
            <div>
              <button
                onClick={() => {
                  // When unpausing, clear any selection
                  if (pauseUpdates) {
                    setSelectedBlock(null)
                  }
                  setPauseUpdates(!pauseUpdates)
                  console.log(
                    "Pause updates toggled to:",
                    !pauseUpdates,
                    "Selection cleared:",
                    pauseUpdates
                  )
                }}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  pauseUpdates
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800"
                    : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {pauseUpdates ? "Resume Updates" : "Pause Updates"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 mb-3">
            {blocks.slice(0, 10).map((block, index) => (
              <FullBlockSquare
                key={`${block.hash}-${index}`}
                block={block}
                isSelected={selectedBlock?.hash === block.hash}
                onClick={() => {
                  setSelectedBlock(block)
                  // Automatically pause updates when a block is selected
                  setPauseUpdates(true)
                  console.log("Selected block and paused updates")
                }}
              />
            ))}
          </div>
        </div>
      )}

      {displayBlock ? (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300">
              Block Number:
            </span>
            <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">
              {displayBlock.number?.toString()}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300">Timestamp:</span>
            <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">
              {new Date(
                Number(displayBlock.timestamp) * 1000
              ).toLocaleTimeString()}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300">Hash:</span>
            <span
              className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm truncate max-w-[220px] relative group cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={`Click to copy: ${displayBlock.hash}`}
              onClick={() =>
                displayBlock.hash && copyToClipboard(displayBlock.hash)
              }
            >
              {displayBlock.hash}
              {/* Tooltip */}
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {copyFeedback || "Click to copy"}
              </span>
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300">Gas Used:</span>
            <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">
              {displayBlock.gasUsed
                ? Number(displayBlock.gasUsed).toLocaleString()
                : "N/A"}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300">
              Transactions:
            </span>
            <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">
              {Array.isArray(displayBlock.transactions)
                ? displayBlock.transactions.length
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
                  {Array.isArray(displayBlock.transactions) &&
                  displayBlock.transactions.length > 0 ? (
                    <>
                      {displayBlock.transactions.slice(0, 3).map((tx, i) => (
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
                      {displayBlock.transactions.length > 3 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          + {displayBlock.transactions.length - 3} more
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
                        displayBlock.parentHash &&
                        copyToClipboard(displayBlock.parentHash)
                      }
                    >
                      {displayBlock.parentHash?.substring(0, 10)}...
                      {/* Tooltip */}
                      <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        {copyFeedback || "Click to copy"}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="font-medium mb-1">Gas Limit</div>
                    <div className="font-mono truncate">
                      {displayBlock.gasLimit
                        ? Number(displayBlock.gasLimit).toLocaleString()
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
