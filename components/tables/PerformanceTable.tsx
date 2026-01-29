"use client";

import { Performance } from "@/types";
import { formatDate } from "@/lib/utils";

interface PerformanceTableProps {
  performances: Performance[];
}

export function PerformanceTable({ performances }: PerformanceTableProps) {
  if (!performances || performances.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No performance data available
      </div>
    );
  }

  // Sort by date descending
  const sorted = [...performances].sort(
    (a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-gray-800">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
              Date
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
              Raw Score
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
              Ranking
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
              Reward
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {sorted.map((perf) => (
            <tr key={perf.id} className="hover:bg-gray-800/50 transition-colors">
              <td className="px-4 py-3 text-white">
                {formatDate(perf.match_date)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-gray-300">
                {perf.raw_score ?? "-"}
              </td>
              <td className="px-4 py-3 text-right">
                <span
                  className={
                    perf.ranking && perf.ranking <= 3
                      ? "text-yellow-500 font-medium"
                      : perf.ranking && perf.ranking <= 10
                      ? "text-green-500"
                      : "text-gray-300"
                  }
                >
                  {perf.ranking ? `#${perf.ranking}` : "-"}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono">
                <span className={perf.reward && perf.reward > 0 ? "text-green-500" : "text-gray-500"}>
                  {perf.reward ? `${perf.reward.toLocaleString()} TP` : "-"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
