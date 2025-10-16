import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="w-full mt-6 bg-gray-800 border border-red-500/50 rounded-lg shadow-lg p-6 sm:p-8 text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Something Went Wrong</h2>
            <p className="text-gray-300 mb-6">
                An unexpected error occurred. Please try reloading the page.
            </p>
            <button
                onClick={this.handleReload}
                className="px-6 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition-colors duration-200"
            >
                Reload Page
            </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;