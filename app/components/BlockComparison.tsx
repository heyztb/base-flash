"use client"

import { useState } from "react"
import { FullBlocks } from "./FullBlock"
import { FlashBlocks } from "./FlashBlock"

export function BlockComparison() {
  const [showComparison, setShowComparison] = useState(false)

  return (
    <div className="w-full">
      <div className="mb-4 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg md:text-xl font-semibold">
            Block Technology Comparison
          </h2>
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="text-sm px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
          >
            {showComparison ? "Hide Details" : "Show Details"}
          </button>
        </div>

        {showComparison && (
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3 mb-4">
            <h3 className="font-medium">How it works</h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="inline-flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  <strong>Flashblocks (200ms)</strong>
                </span>
                : Pre-consensus blocks that are created every 200ms, allowing
                for faster transaction confirmations.
              </p>
              <p>
                <span className="inline-flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                  <strong>Full Blocks (2s)</strong>
                </span>
                : Traditional blocks that are created approximately every 2
                seconds.
              </p>
              <p className="mt-3 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-200 dark:border-yellow-800/30 text-yellow-800 dark:text-yellow-200">
                Flashblocks provide ~10x faster transaction confirmations while
                maintaining security guarantees.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 w-full">
        <div className="w-full md:w-1/2">
          <FlashBlocks />
        </div>
        <div className="w-full md:w-1/2">
          <FullBlocks />
        </div>
      </div>

      <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex items-center gap-2">
            <div className="flex">
              <div className="w-8 h-2 bg-green-500 rounded-l"></div>
              <div className="w-16 h-2 bg-blue-500 rounded-r"></div>
            </div>
            <span className="text-sm">Speed Comparison</span>
          </div>
          <div className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-xs px-2 py-1 rounded font-medium">
            Flashblocks: ~10x faster
          </div>
        </div>
      </div>
    </div>
  )
}
