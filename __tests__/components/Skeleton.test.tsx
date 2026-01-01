import { render, screen } from "@testing-library/react";
import {
  Skeleton,
  ProductCardSkeleton,
  ProductGridSkeleton,
  StatCardSkeleton,
} from "@/components/ui/Skeleton";

describe("Skeleton Components", () => {
  describe("Skeleton", () => {
    it("renders with default classes", () => {
      render(<Skeleton />);
      const skeleton = document.querySelector(".animate-pulse");
      expect(skeleton).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(<Skeleton className="h-10 w-20" />);
      const skeleton = document.querySelector(".h-10");
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe("ProductCardSkeleton", () => {
    it("renders product card structure", () => {
      render(<ProductCardSkeleton />);
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("ProductGridSkeleton", () => {
    it("renders default 8 skeletons", () => {
      const { container } = render(<ProductGridSkeleton />);
      const cards = container.querySelectorAll(".rounded-xl");
      expect(cards.length).toBe(8);
    });

    it("renders custom count", () => {
      const { container } = render(<ProductGridSkeleton count={4} />);
      const cards = container.querySelectorAll(".rounded-xl");
      expect(cards.length).toBe(4);
    });
  });

  describe("StatCardSkeleton", () => {
    it("renders stat card structure", () => {
      render(<StatCardSkeleton />);
      const skeleton = document.querySelector(".rounded-xl");
      expect(skeleton).toBeInTheDocument();
    });
  });
});
