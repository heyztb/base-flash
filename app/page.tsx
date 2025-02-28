"use client"

import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
  WalletDropdownLink,
} from "@coinbase/onchainkit/wallet"
import { TransactionDemo } from "./components/TxDemo"
import { Address, EthBalance, Identity } from "@coinbase/onchainkit/identity"
import { Name } from "@coinbase/onchainkit/identity"
import { Avatar } from "@coinbase/onchainkit/identity"
import { ThemeSwitcher } from "./components/ThemeSwitcher"
import { BlockComparison } from "./components/BlockComparison"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="w-full max-w-4xl flex justify-between items-center mb-6">
        <h1 className="text-xl md:text-2xl font-bold">
          Flashblocks Speed Demo
        </h1>
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <Wallet>
            <ConnectWallet>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6" />
                <span className="hidden sm:inline">
                  <Name />
                </span>
              </div>
            </ConnectWallet>
            <WalletDropdown>
              <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                <Avatar />
                <Name />
                <Address />
                <EthBalance />
              </Identity>
              <WalletDropdownLink
                icon="wallet"
                href="https://keys.coinbase.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Wallet
              </WalletDropdownLink>
              <WalletDropdownDisconnect />
            </WalletDropdown>
          </Wallet>
        </div>
      </header>

      <main className="w-full max-w-4xl">
        <BlockComparison />

        <div className="mt-6 w-full">
          <TransactionDemo />
        </div>
      </main>

      <footer className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          <a
            className="hover:underline"
            href="https://x.com/heyztb"
            target="_blank"
            rel="noopener noreferrer"
          >
            heyztb.base.eth
          </a>
          {" | "}
          <a
            className="hover:underline"
            href="https://docs.base.org/buildathons/2025-02-flash"
            target="_blank"
            rel="noopener noreferrer"
          >
            {new Date().getFullYear()} Flashblocks Builder Side Quest
          </a>
          {" | "}
          <a
            className="hover:underline"
            href="https://github.com/heyztb/base-flash"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <br />
          <a
            className="hover:underline"
            href="https://flashblocks.base.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Flashblocks
          </a>
        </p>
      </footer>
    </div>
  )
}
