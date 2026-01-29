"use client";

interface PositionStats {
  position: string;
  avgScore: number;
  highestScore: number;
  highestScorePlayer: string;
  lowestScore: number;
  lowestScorePlayer: string;
  tpThreshold: number; // rank 1-5 for field, 1-3 for GK
}

interface PositionTPStatsProps {
  data: PositionStats[];
}

const POSITION_COLORS: Record<string, string> = {
  Forward: "#22C55E",
  Midfielder: "#3B82F6",
  Defender: "#F97316",
  Goalkeeper: "#A855F7",
};

function formatScore(value: number): string {
  return value.toFixed(0);
}

export function PositionTPStats({ data }: PositionTPStatsProps) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
      {data.map((stat) => (
        <div
          key={stat.position}
          className="bg-gray-900 rounded-lg p-5 border-t-4"
          style={{ borderTopColor: POSITION_COLORS[stat.position] }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">{stat.position}</h3>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
              Top {stat.tpThreshold} score TP
            </span>
          </div>

          <div className="space-y-4">
            {/* Average Score */}
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Average Score</p>
              <p className="text-2xl font-bold" style={{ color: POSITION_COLORS[stat.position] }}>
                {formatScore(stat.avgScore)}
              </p>
            </div>

            {/* Highest */}
            <div className="border-t border-gray-800 pt-3">
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Highest Single Score</p>
              <p className="text-lg font-semibold text-white">{formatScore(stat.highestScore)}</p>
              <p className="text-sm text-gray-500 truncate" title={stat.highestScorePlayer}>
                {stat.highestScorePlayer}
              </p>
            </div>

            {/* Lowest */}
            <div className="border-t border-gray-800 pt-3">
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">
                Lowest Top {stat.tpThreshold} Score
              </p>
              <p className="text-lg font-semibold text-white">{formatScore(stat.lowestScore)}</p>
              <p className="text-sm text-gray-500 truncate" title={stat.lowestScorePlayer}>
                {stat.lowestScorePlayer}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
