// React Error Boundary component.
// Prevents a single component crash from white-screening the entire application.

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[ErrorBoundary: ${this.props.name || 'unnamed'}]`, error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="p-6 border border-bad bg-bg-surface">
          <h3 className="font-display text-lg text-bad mb-2">Something went wrong</h3>
          <p className="text-sm text-muted mb-2">The {this.props.name || 'component'} encountered an error.</p>
          <p className="text-xs font-mono text-secondary">{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
