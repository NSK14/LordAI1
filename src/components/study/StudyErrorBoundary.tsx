import { Component, ReactNode } from "react";

interface StudyErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

interface StudyErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class StudyErrorBoundary extends Component<
  StudyErrorBoundaryProps,
  StudyErrorBoundaryState
> {
  constructor(props: StudyErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): StudyErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-6">
          <p className="rounded-md bg-destructive/10 p-3 text-destructive">
            This section failed to load.
          </p>
          <pre className="mt-2 rounded-md bg-destructive/5 p-3 text-xs text-destructive/90 break-words">
            {this.state.error?.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
