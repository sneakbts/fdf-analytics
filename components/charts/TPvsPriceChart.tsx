"use client";

import { useMemo } from "react";
import { ResponsiveScatterPlot } from "@nivo/scatterplot";

interface PlayerDataPoint {
  name: string;
  price: number;
  totalTP: number;
}

interface TPvsPriceChartProps {
  data: PlayerDataPoint[];
  position: string;
  color: string;
  height?: number;
  highlightedPlayer?: string;
}

// Calculate power regression: y = a * x^b
function calculatePowerRegression(points: { x: number; y: number }[]) {
  const validData = points.filter((d) => d.x > 0 && d.y > 0);
  if (validData.length < 2) return null;

  const n = validData.length;
  let sumLogX = 0, sumLogY = 0, sumLogXY = 0, sumLogX2 = 0;

  validData.forEach((d) => {
    const logX = Math.log(d.x);
    const logY = Math.log(d.y);
    sumLogX += logX;
    sumLogY += logY;
    sumLogXY += logX * logY;
    sumLogX2 += logX * logX;
  });

  const b = (n * sumLogXY - sumLogX * sumLogY) / (n * sumLogX2 - sumLogX * sumLogX);
  const logA = (sumLogY - b * sumLogX) / n;
  const a = Math.exp(logA);

  return { a, b };
}

// Custom layer to render the trend line
const TrendLineLayer = ({ xScale, yScale, nodes, color }: any) => {
  if (!nodes || nodes.length < 2) return null;

  const points = nodes.map((n: any) => ({ x: n.data.x, y: n.data.y }));

  const regression = calculatePowerRegression(points);
  if (!regression) return null;

  const xValues = points.map((p: any) => p.x).filter((x: number) => x > 0);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);

  // Generate trend line path (log-spaced for smooth curve on log scale)
  const pathPoints = [];
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const x = minX * Math.pow(maxX / minX, t);
    const y = regression.a * Math.pow(x, regression.b);
    const screenX = xScale(x);
    const screenY = yScale(y);
    if (isFinite(screenX) && isFinite(screenY)) {
      pathPoints.push(`${i === 0 ? 'M' : 'L'} ${screenX} ${screenY}`);
    }
  }

  return (
    <path
      d={pathPoints.join(' ')}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeOpacity={0.5}
      style={{ pointerEvents: 'none' }}
    />
  );
};

// Custom node component to highlight searched player
const CustomNode = ({
  node,
  color,
  highlightedPlayer,
}: {
  node: any;
  color: string;
  highlightedPlayer?: string;
}) => {
  const isHighlighted =
    highlightedPlayer &&
    (node.data as any).name.toLowerCase().includes(highlightedPlayer.toLowerCase());

  return (
    <circle
      cx={node.x}
      cy={node.y}
      r={isHighlighted ? 16 : 6}
      fill={isHighlighted ? "#FFD700" : color}
      stroke={isHighlighted ? "#FFA500" : "none"}
      strokeWidth={isHighlighted ? 3 : 0}
      style={{
        filter: isHighlighted ? "drop-shadow(0 0 8px #FFD700)" : "none",
        transition: "all 0.2s ease-in-out",
      }}
    />
  );
};

export function TPvsPriceChart({
  data,
  position,
  color,
  height = 400,
  highlightedPlayer,
}: TPvsPriceChartProps) {
  const { chartData, minX, maxX, maxY, xTickValues } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: [], minX: 0.001, maxX: 1, maxY: 1, xTickValues: [] };
    }

    const points = data
      .filter((d) => d.price > 0)
      .map((d) => ({
        x: d.price,
        y: d.totalTP,
        name: d.name,
      }));

    const xValues = points.map((p) => p.x);
    const yValues = points.map((p) => p.y);

    const dataMinX = Math.min(...xValues);
    const dataMaxX = Math.max(...xValues);

    // Generate nice tick values for log scale
    const logMin = Math.floor(Math.log10(dataMinX));
    const logMax = Math.ceil(Math.log10(dataMaxX));
    const ticks: number[] = [];
    for (let exp = logMin; exp <= logMax; exp++) {
      const base = Math.pow(10, exp);
      [1, 2, 5].forEach(mult => {
        const val = base * mult;
        if (val >= dataMinX && val <= dataMaxX) {
          ticks.push(val);
        }
      });
    }

    return {
      chartData: [{ id: position, data: points }],
      minX: dataMinX,
      maxX: dataMaxX,
      maxY: Math.max(...yValues),
      xTickValues: ticks.length > 0 ? ticks : [dataMinX, dataMaxX],
    };
  }, [data, position]);

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-500 bg-gray-900 rounded-lg"
        style={{ height }}
      >
        No data available for {position}
      </div>
    );
  }

  const formatTP = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toFixed(0);
  };

  const formatPrice = (value: number) => {
    return `$${value.toFixed(3)}`;
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4" style={{ height: height + 60 }}>
      <h3 className="text-lg font-semibold text-white mb-4">{position}</h3>
      <div style={{ height }}>
        <ResponsiveScatterPlot
          data={chartData}
          margin={{ top: 20, right: 20, bottom: 70, left: 80 }}
          xScale={{ type: "log", min: minX, max: maxX, base: 10, nice: false }}
          yScale={{ type: "linear", min: 0, max: maxY * 1.1 }}
          xFormat={formatPrice}
          yFormat={formatTP}
          colors={[color]}
          nodeSize={12}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legend: "Price USD",
            legendPosition: "middle",
            legendOffset: 50,
            tickValues: xTickValues,
            format: (v: number) => `$${v < 0.01 ? v.toFixed(3) : v.toFixed(2)}`,
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: "Career TP Won",
            legendPosition: "middle",
            legendOffset: -65,
            tickValues: 6,
            format: formatTP,
          }}
          theme={{
            background: "transparent",
            text: { fill: "#9CA3AF" },
            axis: {
              ticks: { text: { fill: "#9CA3AF" } },
              legend: { text: { fill: "#9CA3AF" } },
            },
            grid: { line: { stroke: "#374151", strokeDasharray: "3 3" } },
            tooltip: {
              container: {
                background: "#1F2937",
                color: "#fff",
                borderRadius: "8px",
                border: "1px solid #374151",
                padding: "12px",
              },
            },
          }}
          tooltip={({ node }) => (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
              <p className="text-white font-medium">{(node.data as any).name}</p>
              <p className="text-gray-400 text-sm">
                Price: <span className="text-white">${node.data.x.toFixed(4)}</span>
              </p>
              <p className="text-gray-400 text-sm">
                Total TP: <span className="text-white">{formatTP(node.data.y)}</span>
              </p>
            </div>
          )}
          layers={[
            "grid",
            "axes",
            (props: any) => <TrendLineLayer {...props} color={color} />,
            // Custom nodes layer for highlighting
            ({ nodes }: any) => (
              <g>
                {nodes.map((node: any) => (
                  <CustomNode
                    key={node.id}
                    node={node}
                    color={color}
                    highlightedPlayer={highlightedPlayer}
                  />
                ))}
              </g>
            ),
            "markers",
            "mesh",
            "legends",
          ]}
          useMesh={true}
        />
      </div>
    </div>
  );
}
