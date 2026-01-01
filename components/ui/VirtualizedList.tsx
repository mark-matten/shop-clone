"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  containerClassName?: string;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 3,
  className = "",
  containerClassName = "",
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    setContainerHeight(container.clientHeight);

    return () => resizeObserver.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      setScrollTop(container.scrollTop);
    }
  }, []);

  const { startIndex, endIndex, offsetY } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length - 1, start + visibleCount + overscan * 2);

    return {
      startIndex: start,
      endIndex: end,
      offsetY: start * itemHeight,
    };
  }, [scrollTop, containerHeight, itemHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1);
  }, [items, startIndex, endIndex]);

  const totalHeight = items.length * itemHeight;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-auto ${containerClassName}`}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            transform: `translateY(${offsetY}px)`,
          }}
          className={className}
        >
          {visibleItems.map((item, index) =>
            renderItem(item, startIndex + index)
          )}
        </div>
      </div>
    </div>
  );
}

// Grid version for product cards
interface VirtualizedGridProps<T> {
  items: T[];
  rowHeight: number;
  columns: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  gap?: number;
  overscan?: number;
  className?: string;
  containerClassName?: string;
}

export function VirtualizedGrid<T>({
  items,
  rowHeight,
  columns,
  renderItem,
  gap = 16,
  overscan = 2,
  className = "",
  containerClassName = "",
}: VirtualizedGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const rowCount = Math.ceil(items.length / columns);
  const effectiveRowHeight = rowHeight + gap;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    setContainerHeight(container.clientHeight);

    return () => resizeObserver.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      setScrollTop(container.scrollTop);
    }
  }, []);

  const { startRow, endRow, offsetY } = useMemo(() => {
    const start = Math.max(
      0,
      Math.floor(scrollTop / effectiveRowHeight) - overscan
    );
    const visibleRows = Math.ceil(containerHeight / effectiveRowHeight);
    const end = Math.min(rowCount - 1, start + visibleRows + overscan * 2);

    return {
      startRow: start,
      endRow: end,
      offsetY: start * effectiveRowHeight,
    };
  }, [scrollTop, containerHeight, effectiveRowHeight, rowCount, overscan]);

  const visibleItems = useMemo(() => {
    const startIdx = startRow * columns;
    const endIdx = Math.min(items.length, (endRow + 1) * columns);
    return items.slice(startIdx, endIdx).map((item, idx) => ({
      item,
      index: startIdx + idx,
    }));
  }, [items, startRow, endRow, columns]);

  const totalHeight = rowCount * effectiveRowHeight;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-auto ${containerClassName}`}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            transform: `translateY(${offsetY}px)`,
          }}
        >
          <div
            className={className}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap: `${gap}px`,
            }}
          >
            {visibleItems.map(({ item, index }) => renderItem(item, index))}
          </div>
        </div>
      </div>
    </div>
  );
}
