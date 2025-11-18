import React, { ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabaseClient';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  // FIX: Reverted to a standard constructor for state initialization. This is a more robust
  // pattern that ensures `this.props` is correctly set up via `super(props)`, resolving
  // issues where it might not be recognized on the component instance.
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  
  private handleClearCacheAndReload = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Error during sign out in error boundary:", e);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
       return (
        <div className="flex items-center justify-center min-h-screen bg-soft p-6">
            <div className="max-w-lg w-full bg-card p-8 rounded-3xl shadow-2xl text-center border border-border animate-fade-in-up">
                <ExclamationTriangleIcon className="h-16 w-16 mx-auto text-accent-amber mb-4" />
                <h1 className="text-3xl font-bold font-jakarta text-primary dark:text-white">Aplikasi Mengalami Kendala</h1>
                <p className="text-muted mt-4">
                    Maaf, terjadi kesalahan tak terduga yang menghentikan aplikasi. Anda dapat mencoba memuat ulang halaman untuk memperbaikinya.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-gray-200 dark:bg-gray-700 text-primary dark:text-white font-bold py-3 px-6 rounded-2xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300"
                    >
                        Coba Refresh
                    </button>
                     <button
                        onClick={this.handleClearCacheAndReload}
                        className="bg-brand text-white font-bold py-3 px-6 rounded-2xl hover:bg-brand/90 transition-all duration-300"
                    >
                        Reset &amp; Muat Ulang
                    </button>
                </div>
                 <p className="mt-6 text-sm text-muted">
                    Jika me-refresh tidak berhasil, "Reset & Muat Ulang" akan menghapus cache dan sesi Anda untuk memulai dari awal.
                </p>
            </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

export default ErrorBoundary;
