import React, { ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  // FIX: Reverted to a standard constructor for state initialization. The class property
  // syntax may cause type inference issues in some environments, and using a constructor
  // ensures `this.props` is correctly typed and accessible.
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // In a production app, you would send this to an error reporting service
    // e.g., logErrorToMyService(error, errorInfo);
  }

  private handleClearCacheAndReload = () => {
    // Clear all locally stored data
    localStorage.clear();
    sessionStorage.clear();
    
    // Reload the page
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-soft p-6">
            <div className="max-w-lg w-full bg-card p-8 rounded-3xl shadow-2xl text-center border border-border">
                <ExclamationTriangleIcon className="h-16 w-16 mx-auto text-accent-amber mb-4" />
                <h1 className="text-3xl font-bold font-jakarta text-primary dark:text-white">Oops! Terjadi Kesalahan</h1>
                <p className="text-muted mt-4">
                    Maaf, ada sesuatu yang tidak beres. Tim kami telah diberi tahu tentang masalah ini.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-brand text-white font-bold py-3 px-6 rounded-2xl hover:bg-brand/90 transition-all duration-300"
                    >
                        Refresh Halaman
                    </button>
                     <button
                        onClick={this.handleClearCacheAndReload}
                        className="bg-gray-200 dark:bg-gray-700 text-primary dark:text-white font-bold py-3 px-6 rounded-2xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300"
                    >
                        Hapus Cache &amp; Refresh
                    </button>
                </div>
                 <p className="mt-6 text-sm text-muted">
                    Jika masalah berlanjut, mencoba "Hapus Cache" mungkin bisa membantu.
                </p>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
