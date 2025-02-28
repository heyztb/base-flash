"use client"

import { baseSepolia } from "wagmi/chains"
import { OnchainKitProvider } from "@coinbase/onchainkit"
import type { ReactNode } from "react"
import { ThemeProvider, useTheme } from "next-themes"
import { useState, useEffect } from "react"

// This component ensures OnchainKit gets the current theme
function OnchainKitWithTheme({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Only render after component is mounted to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Convert next-themes format to OnchainKit format
  const walletMode = mounted
    ? resolvedTheme === "dark"
      ? "dark"
      : "light"
    : "auto"

  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={baseSepolia}
      config={{
        appearance: {
          name: "Flashblocks Builder Side Quest",
          mode: walletMode,
          theme: "default",
        },
        wallet: {
          display: "modal",
        },
      }}
    >
      {children}
    </OnchainKitProvider>
  )
}

export function Providers(props: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <OnchainKitWithTheme>{props.children}</OnchainKitWithTheme>
    </ThemeProvider>
  )
}
