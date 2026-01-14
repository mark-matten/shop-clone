"use client";

import { useRef, ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface VirtualizedGridProps<T> {
  items: T[];
  columns: number;
  rowHeight: number;
  gap?: number;
  className?: string;
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T) => string;
  emptyState?: ReactNode;
}

export function VirtualizedGrid<T>({
  items,
  columns,
  rowHeight,
  gap = 8,
  className = "",
  renderItem,
  keyExtractor,
  emptyState,
}: VirtualizedGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Calculate rows from items
  const rowCount = Math.ceil(items.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight + gap,
    overscan: 3, // Render 3 extra rows above/below viewport
  });

  if (items.length === 0) {
    return <>{emptyState}</>;
  }

  const virtualRows = rowVirtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={`overflow-y-auto ${className}`}
      style={{ contain: "strict" }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualRows.map((virtualRow) => {
          const startIndex = virtualRow.index * columns;
          const rowItems = items.slice(startIndex, startIndex + columns);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${rowHeight}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${columns}, 1fr)`,
                  gap: `${gap}px`,
                  height: "100%",
                }}
              >
                {rowItems.map((item, itemIndex) => (
                  <div key={keyExtractor(item)} style={{ minWidth: 0 }}>
                    {renderItem(item, startIndex + itemIndex)}
                  </div>
                ))}
                {/* Fill empty slots in last row */}
                {rowItems.length < columns &&
                  Array.from({ length: columns - rowItems.length }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
