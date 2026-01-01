import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary, ErrorMessage, DataError } from "@/components/ui/ErrorBoundary";

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>No error</div>;
};

describe("ErrorBoundary", () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("renders error UI when there is an error", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();
    expect(screen.getByText("Go Home")).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Custom fallback")).toBeInTheDocument();
  });

  it("calls onError callback when error occurs", () => {
    const onError = jest.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalled();
  });
});

describe("ErrorMessage", () => {
  it("renders error message", () => {
    render(<ErrorMessage message="Test error message" />);
    expect(screen.getByText("Test error message")).toBeInTheDocument();
  });

  it("renders retry button when onRetry provided", () => {
    const onRetry = jest.fn();
    render(<ErrorMessage message="Error" onRetry={onRetry} />);
    const retryButton = screen.getByText("Try again");
    expect(retryButton).toBeInTheDocument();
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });

  it("does not render retry button when onRetry not provided", () => {
    render(<ErrorMessage message="Error" />);
    expect(screen.queryByText("Try again")).not.toBeInTheDocument();
  });
});

describe("DataError", () => {
  it("renders with default props", () => {
    render(<DataError />);
    expect(screen.getByText("Failed to load data")).toBeInTheDocument();
    expect(screen.getByText("Please check your connection and try again.")).toBeInTheDocument();
  });

  it("renders with custom title and message", () => {
    render(<DataError title="Custom Title" message="Custom message" />);
    expect(screen.getByText("Custom Title")).toBeInTheDocument();
    expect(screen.getByText("Custom message")).toBeInTheDocument();
  });

  it("renders retry button when onRetry provided", () => {
    const onRetry = jest.fn();
    render(<DataError onRetry={onRetry} />);
    const retryButton = screen.getByText("Retry");
    expect(retryButton).toBeInTheDocument();
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });
});
