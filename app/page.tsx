"use client";

import { useState } from "react";
import Link from "next/link";

export default function HomePage() {
  const [showDonation, setShowDonation] = useState(false);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      {/* Welcome Section */}
      <div className="max-w-3xl mx-auto">
        <h1 className="text-5xl font-bold text-white mb-6">
          Welcome to Sneak's FDF Analytics
        </h1>

        <p className="text-xl text-gray-300 mb-6 leading-relaxed">
          Your go-to platform for Sports.fun (FDF) player analytics.
          Track prices, compare players, analyze team performance, and find
          undervalued opportunities in the Fantasy Draft Football market.
        </p>
        <p className="text-lg text-gray-500 italic mb-8">
          And remember: There's no crying in the skill based sports arena.
        </p>

        <div className="grid md:grid-cols-2 gap-4 text-left mb-12">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-2">Real-Time Data</h3>
            <p className="text-gray-400 text-sm">Price updates every 15 minutes with historical tracking</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-2">Player Comparison</h3>
            <p className="text-gray-400 text-sm">Head-to-head stats, ROI calculator, and performance charts</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-2">Team Analytics</h3>
            <p className="text-gray-400 text-sm">Market cap by position and team TP efficiency rankings</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-2">Leaderboards</h3>
            <p className="text-gray-400 text-sm">Find top performers and undervalued players</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <a
            href="https://pro.sport.fun/login/?referral_code=U3LGBMXVAAV"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-lg transition-colors"
          >
            Join FDF
          </a>
          <Link
            href="/analytics"
            className="px-8 py-4 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-lg text-lg transition-colors"
          >
            Dive into Analytics
          </Link>
        </div>

        {/* Donation Section */}
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setShowDonation(!showDonation)}
            className="w-full px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <span>Get 1st place with a gem you found here? Buy Sneak and Claude a coffee.</span>
            <svg
              className={`w-5 h-5 transition-transform ${showDonation ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDonation && (
            <div className="mt-4 bg-gray-800 rounded-lg p-6 text-left space-y-4 border border-gray-700">
              <div>
                <p className="text-gray-400 text-sm mb-1">USDC (Base), FDF Gold or $FUN:</p>
                <p className="text-white font-mono text-sm bg-gray-900 p-3 rounded break-all select-all">
                  0xE0D91d4Eed16629177AA4823a83A880857812fef
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Solana:</p>
                <p className="text-white font-mono text-sm bg-gray-900 p-3 rounded select-all">
                  SneakBots.sol
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
