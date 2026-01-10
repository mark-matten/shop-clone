"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface PriceHistoryData {
  price: number;
  checkedAt: number;
}

interface PriceHistoryChartProps {
  priceHistory: PriceHistoryData[];
  currentPrice: number;
  targetPrice?: number;
}

export function PriceHistoryChart({
  priceHistory,
  currentPrice,
  targetPrice,
}: PriceHistoryChartProps) {
  // Format and sort the data
  const chartData = useMemo(() => {
    if (!priceHistory || priceHistory.length === 0) return [];

    // Sort by date ascending and format for chart
    return [...priceHistory]
      .sort((a, b) => a.checkedAt - b.checkedAt)
      .map((item) => ({
        date: new Date(item.checkedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        fullDate: new Date(item.checkedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
        price: item.price,
      }));
  }, [priceHistory]);

  // Calculate min/max for Y axis with some padding
  const { minPrice, maxPrice, avgPrice, lowestPrice, highestPrice } = useMemo(() => {
    if (chartData.length === 0)
      return { minPrice: 0, maxPrice: 100, avgPrice: 0, lowestPrice: 0, highestPrice: 0 };

    const prices = chartData.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const padding = (max - min) * 0.1 || max * 0.1;

    return {
      minPrice: Math.max(0, min - padding),
      maxPrice: max + padding,
      avgPrice: avg,
      lowestPrice: min,
      highestPrice: max,
    };
  }, [chartData]);

  if (chartData.length < 2) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
          Price History
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Not enough price data yet. Check back after a few price checks.
        </p>
      </div>
    );
  }

  const priceChange = currentPrice - chartData[0].price;
  const priceChangePercent = ((priceChange / chartData[0].price) * 100).toFixed(1);
  const isUp = priceChange > 0;
  const isDown = priceChange < 0;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Price History
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-zinc-500 dark:text-zinc-400">
            Low: <span className="font-medium text-green-600 dark:text-green-400">${lowestPrice.toFixed(2)}</span>
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">
            High: <span className="font-medium text-red-500 dark:text-red-400">${highestPrice.toFixed(2)}</span>
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">
            Avg: <span className="font-medium text-zinc-700 dark:text-zinc-300">${avgPrice.toFixed(2)}</span>
          </span>
        </div>
      </div>

      {/* Price change indicator */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          Since first tracked:
        </span>
        <span
          className={`text-sm font-medium ${
            isDown
              ? "text-green-600 dark:text-green-400"
              : isUp
              ? "text-red-500 dark:text-red-400"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          {isDown ? "↓" : isUp ? "↑" : ""}
          ${Math.abs(priceChange).toFixed(2)} ({isDown ? "" : isUp ? "+" : ""}
          {priceChangePercent}%)
        </span>
      </div>

      {/* Chart */}
      <div className="h-48 sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-zinc-200 dark:text-zinc-700"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              stroke="currentColor"
              className="text-zinc-400 dark:text-zinc-500"
            />
            <YAxis
              domain={[minPrice, maxPrice]}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              stroke="currentColor"
              className="text-zinc-400 dark:text-zinc-500"
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--tooltip-bg, #fff)",
                border: "1px solid var(--tooltip-border, #e5e7eb)",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                fontSize: "12px",
              }}
              labelFormatter={(label, payload) =>
                payload?.[0]?.payload?.fullDate || label
              }
              formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]}
            />
            {targetPrice && (
              <ReferenceLine
                y={targetPrice}
                stroke="#22c55e"
                strokeDasharray="5 5"
                label={{
                  value: `Target: $${targetPrice.toFixed(0)}`,
                  fill: "#22c55e",
                  fontSize: 10,
                  position: "right",
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="price"
              stroke="#c2311d"
              strokeWidth={2}
              dot={{ r: 3, fill: "#c2311d", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#c2311d", strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500 text-center">
        Prices checked every 12 hours
      </p>
    </div>
  );
}
