import React, { ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabaseClient';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = { hasError: false, isChunkError: false };

  static getDerivedStateFromError(error: Error): State {
    // Check if the error is a chunk load error (deployment update issue)
    const isChunkError = error.message && (
        error.message.includes('Loading chunk') || 
        error.message.includes('Importing a module script failed') ||
        error.name === 'ChunkLoadError'
    );
    return { hasError: true, isChunkError };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    
    // If it's a chunk error, we can try to auto-reload once if we haven't just done so
    if (this.state.isChunkError) {
        const hasReloaded = sessionStorage.getItem('nongkrongr_chunk_reload');
        if (!hasReloaded) {
            sessionStorage.setItem('nongkrongr_chunk_reload', 'true');
            window.location.reload();
        }
    }
  }
  
  private handleClearCacheAndReload = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Error during sign out in error boundary:", e);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      // Force reload from server, ignoring cache
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
       return (
        <div className="flex items-center justify-center min-h-screen bg-soft p-6">
            <div className="max-w-lg w-full bg-card p-8 rounded-3xl shadow-2xl text-center border border-border animate-fade-in-up">
                <ExclamationTriangleIcon className="h-16 w-16 mx-auto text-accent-amber mb-4" />
                
                {this.state.isChunkError ? (
                    <>
                        <h1 className="text-2xl font-bold font-jakarta text-primary dark:text-white">Update Tersedia!</h1>
                        <p className="text-muted mt-4">
                            Aplikasi baru saja diperbarui ke versi terbaru. Kami perlu memuat ulang halaman untuk menerapkan perubahan.
                        </p>
                        <div className="mt-8 flex justify-center">
                            <button
                                onClick={() => {
                                    sessionStorage.removeItem('nongkrongr_chunk_reload');
                                    window.location.reload();
                                }}
                                className="bg-brand text-white font-bold py-3 px-8 rounded-2xl hover:bg-brand/90 transition-all duration-300 flex items-center gap-2 shadow-lg shadow-brand/20"
                            >
                                <ArrowPathIcon className="h-5 w-5" />
                                Update Sekarang
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <h1 className="text-3xl font-bold font-jakarta text-primary dark:text-white">Aplikasi Mengalami Kendala</h1>
                        <p className="text-muted mt-4">
                            Maaf, terjadi kesalahan tak terduga. Cobalah memuat ulang halaman atau reset aplikasi.
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
                            "Reset & Muat Ulang" akan menghapus cache dan sesi Anda untuk memulai dari awal yang bersih.
                        </p>
                    </>
                )}
            </div>
        </div>
      );
    }
    
    return (this as any).props.children;
  }
}

export default ErrorBoundary;