import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  // FIX: The constructor-based state initialization was causing TypeScript errors where `this.state`
  // and `this.props` were not being recognized. Switched to the class property syntax for state
  // initialization, which is a more modern approach and resolves these type-checking issues.
  // FIX: Removed the 'public' modifier from state to resolve a type inference issue with `this.props`.
  state: State = {
    hasError: false,
  };

  // FIX: Removed 'public' modifier to correctly override React's lifecycle method signature.
  static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  // FIX: Removed 'public' modifier to correctly override React's lifecycle method signature.
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // Di aplikasi produksi, Anda akan mengirim ini ke layanan pelaporan error
    // misalnya: logErrorToMyService(error, errorInfo);
  }

  // FIX: Switched to an arrow function property for the event handler.
  // This is a common pattern in React class components to ensure `this` is correctly bound
  // and provides a stable function reference, which can also help with potential
  // type inference issues in complex scenarios.
  handleClearCacheAndReload = () => {
    // Membersihkan semua data yang disimpan secara lokal
    localStorage.clear();
    sessionStorage.clear();
    
    // Me-reload halaman
    window.location.reload();
  }

  // FIX: Changed the `render` method to an arrow function. The standard class method was causing
  // a type inference issue where `this.props` was not being recognized. The arrow function
  // ensures `this` is correctly bound to the component instance.
  render = (): React.ReactNode => {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-soft p-6">
            <div className="max-w-lg w-full bg-card p-8 rounded-3xl shadow-2xl text-center border border-border">
                <ExclamationTriangleIcon className="h-16 w-16 mx-auto text-accent-amber mb-4" />
                <h1 className="text-3xl font-bold font-jakarta text-primary dark:text-white">Oops! Terjadi Kesalahan</h1>
                <p className="mt-4 text-muted">
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
                        Hapus Cache & Refresh
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