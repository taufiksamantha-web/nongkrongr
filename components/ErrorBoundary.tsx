import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './UI';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component to catch JavaScript errors anywhere in their child component tree,
 * log those errors, and display a fallback UI instead of the component tree that crashed.
 */
// Fix: Explicitly use React.Component with generic types for props and state
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Explicitly declare props and state as class properties to resolve "Property does not exist" errors in some environments
  props: ErrorBoundaryProps;
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  // Update state so the next render will show the fallback UI.
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  // Log the error to an error reporting service or console
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    // Fix: Access state via this.state to check if an error occurred
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0F172A] p-6 text-center animate-in fade-in">
          <div className="w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6 animate-bounce">
            <AlertTriangle size={48} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            Ups, ada sedikit masalah!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-sm">
            Terjadi kesalahan teknis pada sistem. Tenang, ini bukan salah kamu kok.
          </p>
          <div className="flex gap-3">
            <Button 
                onClick={() => window.location.reload()} 
                icon={RefreshCw}
                className="shadow-lg shadow-primary/20"
            >
                Muat Ulang
            </Button>
            <Button 
                variant="secondary" 
                onClick={() => window.location.href = '/'} 
                icon={Home}
            >
                Ke Beranda
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && (
              <div className="mt-8 p-4 bg-gray-100 dark:bg-slate-800 rounded-lg text-left overflow-auto max-w-lg max-h-48 text-xs font-mono text-red-600">
                  {/* Fix: Access error property correctly from state instance */}
                  {this.state.error?.toString()}
              </div>
          )}
        </div>
      );
    }

    // Fix: Access props from the class instance to correctly return child components
    return this.props.children || null;
  }
}
