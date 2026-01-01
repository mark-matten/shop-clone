import { useState, useEffect, useRef, RefObject } from "react";

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useIntersectionObserver<T extends Element>(
  options: UseIntersectionObserverOptions = {}
): [RefObject<T | null>, boolean] {
  const { threshold = 0, rootMargin = "0px", triggerOnce = false } = options;

  const ref = useRef<T | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);

        if (entry.isIntersecting && triggerOnce) {
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return [ref, isIntersecting];
}

// For tracking multiple elements
export function useIntersectionObserverMultiple<T extends Element>(
  elements: (T | null)[],
  options: UseIntersectionObserverOptions = {}
): boolean[] {
  const { threshold = 0, rootMargin = "0px" } = options;
  const [intersecting, setIntersecting] = useState<boolean[]>(
    elements.map(() => false)
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setIntersecting((prev) => {
          const next = [...prev];
          for (const entry of entries) {
            const index = elements.indexOf(entry.target as T);
            if (index !== -1) {
              next[index] = entry.isIntersecting;
            }
          }
          return next;
        });
      },
      { threshold, rootMargin }
    );

    elements.forEach((element) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [elements, threshold, rootMargin]);

  return intersecting;
}

// Hook for infinite scroll
interface UseInfiniteScrollOptions {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  rootMargin?: string;
}

export function useInfiniteScroll(
  options: UseInfiniteScrollOptions
): RefObject<HTMLDivElement | null> {
  const { hasMore, isLoading, onLoadMore, rootMargin = "200px" } = options;
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { rootMargin }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore, rootMargin]);

  return sentinelRef;
}
