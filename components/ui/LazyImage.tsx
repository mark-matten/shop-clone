"use client";

import { useState, useRef, useEffect } from "react";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  fallbackIcon?: React.ReactNode;
}

export function LazyImage({
  src,
  alt,
  className = "",
  placeholderClassName = "",
  fallbackIcon,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "100px", // Start loading 100px before image comes into view
        threshold: 0,
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
  };

  const defaultFallback = (
    <svg
      className="h-8 w-8 text-zinc-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );

  return (
    <div ref={imgRef} className={`relative ${className}`}>
      {/* Placeholder/Loading state with shimmer effect */}
      {(!isLoaded || hasError) && (
        <div
          className={`absolute inset-0 flex items-center justify-center ${placeholderClassName} ${
            isLoaded ? "opacity-0" : "opacity-100"
          } transition-opacity duration-300`}
        >
          {hasError ? (
            <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
              {fallbackIcon || defaultFallback}
            </div>
          ) : (
            <div
              className="h-full w-full"
              style={{
                background: "linear-gradient(90deg, #f4f4f5 0%, #e4e4e7 50%, #f4f4f5 100%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s ease-in-out infinite",
              }}
            />
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>

      {/* Actual image */}
      {isInView && !hasError && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`${className} ${
            isLoaded ? "opacity-100" : "opacity-0"
          } transition-opacity duration-300`}
        />
      )}
    </div>
  );
}
