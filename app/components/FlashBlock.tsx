"use client"

import { useState, useEffect } from "react"
import React from "react"

// Define the type for the flashblock data
interface FlashBlockData {
  payload_id: string
  index: number
  base?: {
    parent_beacon_block_root: string
    parent_hash: string
    fee_recipient: string
    prev_randao: string
    block_number: string
    gas_limit: string
    timestamp: string
    extra_data: string
    base_fee_per_gas: string
  }
  diff: {
    state_root: string
    receipts_root: string
    logs_bloom: string
    gas_used: string
    block_hash: string
    transactions: string[]
    withdrawals: unknown[]
  }
  metadata: {
    block_number: number
    new_account_balances: Record<string, string>
    receipts: Record<
      string,
      {
        Eip1559?: {
          cumulativeGasUsed: string
          logs: Array<{
            address: string
            data: string
            topics: string[]
          }>
          status: string
        }
        Deposit?: {
          cumulativeGasUsed: string
          depositNonce: string
          depositReceiptVersion: string
          logs: unknown[]
          status: string
        }
      }
    >
  }
}

// Component to render a single flash block square
interface FlashBlockSquareProps {
  block: FlashBlockData
  isGenesis?: boolean
  onClick?: () => void
}

const FlashBlockSquare = ({
  block,
  isGenesis = false,
  onClick,
}: FlashBlockSquareProps) => {
  const txCount = block.diff.transactions.length
  const gasUsed = parseInt(block.diff.gas_used, 16)
  const maxGasLimit = block.base ? parseInt(block.base.gas_limit, 16) : 30000000 // Default max if not available
  const gasPercentage = Math.min((gasUsed / maxGasLimit) * 100, 100)

  // Generate a color based on transaction count (more tx = darker blue)
  const opacity = Math.min(0.2 + (txCount / 10) * 0.8, 1)

  return (
    <div
      onClick={onClick}
      className={`relative aspect-square border ${
        isGenesis ? "border-blue-500" : "border-gray-300 dark:border-gray-600"
      } 
                 rounded cursor-pointer transition-all hover:shadow-md`}
    >
      {/* Block index indicator */}
      <div className="absolute top-1 left-1 text-xs font-mono bg-white dark:bg-gray-800 px-1 rounded">
        #{block.index}
      </div>

      {/* Gas used indicator (height of the fill) */}
      <div
        className={`absolute bottom-0 left-0 right-0 ${
          isGenesis
            ? "bg-blue-200 dark:bg-blue-900"
            : "bg-gray-200 dark:bg-gray-700"
        }`}
        style={{ height: `${gasPercentage}%`, opacity }}
      ></div>

      {/* Transaction count indicator */}
      <div className="absolute bottom-1 right-1 text-xs font-mono bg-white dark:bg-gray-800 px-1 rounded">
        {txCount}tx
      </div>

      {/* Genesis indicator */}
      {isGenesis && (
        <div className="absolute top-1 right-1">
          <span className="inline-flex h-3 w-3 bg-blue-500 rounded-full animate-pulse"></span>
        </div>
      )}
    </div>
  )
}

export function FlashBlocks() {
  const [blocks, setBlocks] = useState<FlashBlockData[]>([])
  const [selectedBlock, setSelectedBlock] = useState<FlashBlockData | null>(
    null
  )
  const [latestGenesisBlock, setLatestGenesisBlock] =
    useState<FlashBlockData | null>(null)
  const [expandedView, setExpandedView] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "error"
  >("connecting")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [visualizationType, setVisualizationType] = useState<
    "list" | "squares"
  >("squares")
  const [pauseUpdates, setPauseUpdates] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)

  const latestBlock = blocks.length > 0 ? blocks[0] : null
  const displayBlock = selectedBlock || latestBlock

  // Use a ref to access the latest pauseUpdates state in the WebSocket callbacks
  // This prevents issues with stale closures in the WebSocket callbacks
  const pauseUpdatesRef = React.useRef(pauseUpdates)
  useEffect(() => {
    pauseUpdatesRef.current = pauseUpdates
  }, [pauseUpdates])

  useEffect(() => {
    let websocketClient: WebSocket | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null

    // Function to create and setup WebSocket
    const setupWebSocket = () => {
      setConnectionStatus("connecting")
      setErrorMessage(null)

      try {
        websocketClient = new WebSocket("wss://sepolia.flashblocks.base.org/ws")

        websocketClient.onopen = () => {
          setConnectionStatus("connected")
          console.log("WebSocket connection established")
        }

        websocketClient.onmessage = (event) => {
          // Get the current pause state immediately when message arrives
          const isPaused = pauseUpdatesRef.current

          if (event.data instanceof Blob) {
            const reader = new FileReader()
            reader.onload = (event) => {
              // Store the raw data for processing
              const rawData = event.target?.result as string

              // If updates are completely paused, don't process anything
              if (isPaused) {
                console.log("Skipping all block processing while paused")
                return
              }

              try {
                const data = JSON.parse(rawData) as FlashBlockData

                // Store genesis blocks for reference
                if (data.index === 0) {
                  console.log("Processing genesis block")
                  setLatestGenesisBlock(data)
                }

                // Add new block to the beginning of the array and limit to 20 blocks
                setBlocks((prevBlocks) => {
                  // Check if we already have this block by payload_id and index
                  const exists = prevBlocks.some(
                    (block) =>
                      block.payload_id === data.payload_id &&
                      block.index === data.index
                  )

                  if (exists) return prevBlocks

                  const newBlocks = [data, ...prevBlocks]
                  // Limit array size to prevent memory issues
                  return newBlocks.slice(0, 20)
                })
              } catch (error) {
                console.error("Error parsing WebSocket data:", error)
              }
            }
            reader.readAsText(event.data)
          }
        }

        websocketClient.onclose = (event) => {
          console.warn("WebSocket closed, attempting to reconnect...", event)
          setConnectionStatus("error")
          setErrorMessage("Connection closed. Attempting to reconnect...")

          // Try to reconnect after a delay
          if (reconnectTimeout) clearTimeout(reconnectTimeout)
          reconnectTimeout = setTimeout(setupWebSocket, 5000)
        }

        websocketClient.onerror = (error) => {
          console.error("WebSocket error:", error)
          setConnectionStatus("error")
          setErrorMessage("Connection error. Attempting to reconnect...")

          // Force close and try to reconnect
          websocketClient?.close()
        }
      } catch (error) {
        console.error("Error setting up WebSocket:", error)
        setConnectionStatus("error")
        setErrorMessage("Failed to connect. Will retry in 5 seconds...")

        // Try to reconnect after a delay
        if (reconnectTimeout) clearTimeout(reconnectTimeout)
        reconnectTimeout = setTimeout(setupWebSocket, 5000)
      }
    }

    // Initial WebSocket setup
    setupWebSocket()

    // Cleanup on component unmount
    return () => {
      if (websocketClient) {
        websocketClient.close()
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
    }
  }, [])

  // Helper function to format timestamp from hex to readable date
  const formatTimestamp = (hexTimestamp: string) => {
    try {
      const timestamp = parseInt(hexTimestamp, 16) * 1000 // Convert to milliseconds
      return new Date(timestamp).toLocaleString()
    } catch {
      return "Invalid timestamp"
    }
  }

  // Helper function to format hex values to decimal
  const hexToDecimal = (hexValue: string) => {
    try {
      return parseInt(hexValue, 16).toLocaleString()
    } catch {
      return "Invalid hex"
    }
  }

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

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 w-full bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg md:text-xl font-semibold flex items-center">
          <div
            className={`w-3 h-3 rounded-full ${
              connectionStatus === "connected"
                ? "bg-green-500 animate-pulse"
                : connectionStatus === "connecting"
                ? "bg-yellow-500 animate-pulse"
                : "bg-red-500"
            } mr-2`}
          ></div>
          Flashblocks{" "}
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
            (200ms)
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
      {visualizationType === "squares" &&
        blocks.length > 0 &&
        connectionStatus === "connected" && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {selectedBlock ? (
                  <span>
                    Viewing block #{selectedBlock.index} (Block{" "}
                    {selectedBlock.metadata.block_number})
                  </span>
                ) : (
                  <span>Latest blocks (newest first)</span>
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
              {blocks.slice(0, 10).map((block) => (
                <FlashBlockSquare
                  key={`${block.payload_id}-${block.index}`}
                  block={block}
                  isGenesis={block.index === 0}
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

      {displayBlock && connectionStatus === "connected" ? (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300">
              Block Number:
            </span>
            <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">
              {displayBlock.metadata.block_number}#{displayBlock.index}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300">Timestamp:</span>
            <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">
              {new Date().toLocaleTimeString()}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300">
              Block Hash:
            </span>
            <span
              className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm truncate max-w-[220px] relative group cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={`Click to copy: ${displayBlock.diff.block_hash}`}
              onClick={() => copyToClipboard(displayBlock.diff.block_hash)}
            >
              {displayBlock.diff.block_hash}
              {/* Tooltip */}
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {copyFeedback || "Click to copy"}
              </span>
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300">
              Transactions:
            </span>
            <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">
              {displayBlock.diff.transactions.length}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300">Gas Used:</span>
            <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">
              {parseInt(displayBlock.diff.gas_used, 16).toLocaleString()}
            </span>
          </div>

          {expandedView && (
            <>
              <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
                <h3 className="font-medium text-sm mb-2">
                  Recent Transactions:
                </h3>
                <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  {displayBlock.diff.transactions.slice(0, 3).map((tx, i) => (
                    <div key={i} className="text-xs font-mono truncate">
                      <span className="text-gray-500 dark:text-gray-400">
                        {i + 1}.
                      </span>{" "}
                      {tx.substring(0, 10)}...{tx.substring(tx.length - 8)}
                    </div>
                  ))}
                  {displayBlock.diff.transactions.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      + {displayBlock.diff.transactions.length - 3} more
                      transactions
                    </div>
                  )}
                </div>
              </div>

              {/* Display base information if it exists (Genesis block) or use the latest genesis block */}
              {((selectedBlock &&
                (selectedBlock.index === 0 || selectedBlock.base)) ||
                (!pauseUpdates &&
                  !selectedBlock &&
                  (displayBlock.base || latestGenesisBlock?.base))) && (
                <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
                  <h3 className="font-medium text-sm mb-2 flex items-center">
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-0.5 rounded mr-2">
                      Genesis Block Info
                    </span>
                    {!displayBlock.base && latestGenesisBlock && (
                      <span className="text-xs text-gray-500">
                        (from latest genesis block #{latestGenesisBlock.index})
                      </span>
                    )}
                  </h3>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <div className="grid grid-cols-2 gap-2">
                        {/* Use either the current block's base or the latest genesis block's base */}
                        {(() => {
                          const baseData =
                            displayBlock.base || latestGenesisBlock?.base
                          if (!baseData) return null

                          return (
                            <>
                              <div>
                                <div className="font-medium mb-1">
                                  Parent Hash
                                </div>
                                <div className="font-mono truncate">
                                  {baseData.parent_hash.substring(0, 10)}...
                                </div>
                              </div>
                              <div>
                                <div className="font-medium mb-1">
                                  Fee Recipient
                                </div>
                                <div className="font-mono truncate">
                                  {baseData.fee_recipient}
                                </div>
                              </div>
                              <div>
                                <div className="font-medium mb-1">
                                  Block Number (hex)
                                </div>
                                <div className="font-mono">
                                  {baseData.block_number}
                                </div>
                              </div>
                              <div>
                                <div className="font-medium mb-1">
                                  Gas Limit
                                </div>
                                <div className="font-mono">
                                  {hexToDecimal(baseData.gas_limit)}
                                </div>
                              </div>
                              <div>
                                <div className="font-medium mb-1">Base Fee</div>
                                <div className="font-mono">
                                  {hexToDecimal(baseData.base_fee_per_gas)} wei
                                </div>
                              </div>
                              <div>
                                <div className="font-medium mb-1">
                                  Timestamp
                                </div>
                                <div className="font-mono">
                                  {formatTimestamp(baseData.timestamp)}
                                </div>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-3">
                <h3 className="font-medium text-sm mb-2">Block Info:</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="font-medium mb-1">Payload ID</div>
                    <div
                      className="font-mono truncate cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors relative group"
                      onClick={() => copyToClipboard(displayBlock.payload_id)}
                    >
                      {displayBlock.payload_id}
                      {/* Tooltip */}
                      <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        {copyFeedback || "Click to copy"}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="font-medium mb-1">State Root</div>
                    <div
                      className="font-mono truncate cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors relative group"
                      onClick={() =>
                        copyToClipboard(displayBlock.diff.state_root)
                      }
                    >
                      {displayBlock.diff.state_root.substring(0, 10)}...
                      {/* Tooltip */}
                      <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        {copyFeedback || "Click to copy"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-16 text-gray-500 dark:text-gray-400">
          <div className="flex items-center mb-2">
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
            {connectionStatus === "connecting"
              ? "Connecting..."
              : "Reconnecting..."}
          </div>
          {errorMessage && (
            <div className="text-xs text-red-500 dark:text-red-400 text-center mt-1">
              {errorMessage}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
