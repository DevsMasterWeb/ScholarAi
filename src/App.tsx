import { useState, useRef, useEffect } from 'react';
import { PaperUploader } from './components/PaperUploader';
import { LibraryList } from './components/LibraryList';
import { SearchEngine } from './components/SearchEngine';
import { LandingPage } from './components/LandingPage';
import { useAuth } from './context/AuthContext';
import { User as UserIcon, LogOut, ChevronDown } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'library' | 'generator' | 'search'>('library');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, loading, login, logout } = useAuth();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  if (!user) {
    return <LandingPage onLogin={login} />;
  }

  return (
    <div className="w-full h-screen bg-surface text-[#1A1A1A] font-sans flex overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-64 border-r border-border flex flex-col p-6">
        <div className="mb-10">
          <h1 className="text-2xl font-serif italic font-bold tracking-tight text-brand">Scholar<span className="font-normal">AI</span></h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1 font-semibold">Research Assistant v2.4</p>
        </div>
        
        <nav className="space-y-6 flex-grow">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-3">Navigation</p>
            <button onClick={() => setView('library')} className={`w-full flex items-center space-x-3 text-sm font-medium p-2 rounded-lg transition-colors ${view === 'library' ? 'bg-white border border-border shadow-sm' : 'text-slate-600 hover:bg-secondary'}`}>
              <span className={`w-2 h-2 rounded-full ${view === 'library' ? 'bg-brand' : 'border border-slate-400'}`}></span>
              <span>Research Library</span>
            </button>
            <button onClick={() => setView('search')} className={`w-full flex items-center space-x-3 text-sm font-medium p-2 rounded-lg transition-colors ${view === 'search' ? 'bg-white border border-border shadow-sm' : 'text-slate-600 hover:bg-secondary'}`}>
              <span className={`w-2 h-2 rounded-full ${view === 'search' ? 'bg-brand' : 'border border-slate-400'}`}></span>
              <span>Web Search</span>
            </button>
            <button onClick={() => setView('generator')} className={`w-full flex items-center space-x-3 text-sm font-medium p-2 rounded-lg transition-colors ${view === 'generator' ? 'bg-white border border-border shadow-sm' : 'text-slate-600 hover:bg-secondary'}`}>
              <span className={`w-2 h-2 rounded-full ${view === 'generator' ? 'bg-brand' : 'border border-slate-400'}`}></span>
              <span>Lit Review Gen</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-surface">
        <header className="h-20 border-b border-border flex items-center justify-end px-8 bg-white/50 backdrop-blur-sm z-10 relative">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 hover:bg-slate-100 p-2 rounded-xl transition-colors"
            >
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-slate-700 leading-tight">{user.displayName || 'User'}</p>
                <p className="text-xs text-slate-500 leading-tight">{user.email}</p>
              </div>
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'Profile'} className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-500 shadow-sm">
                  <UserIcon className="w-5 h-5" />
                </div>
              )}
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-border shadow-lg rounded-xl overflow-hidden py-1 z-50">
                <div className="px-4 py-3 border-b border-slate-100 mb-1 md:hidden">
                  <p className="text-sm font-semibold text-slate-800 truncate">{user.displayName || 'User'}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="p-8 flex flex-col h-full overflow-y-auto">
          {view === 'library' && (
            <>
              <h2 className="text-5xl font-serif font-light tracking-tight mb-8">Generated Literature Reviews</h2>
              <div className="mt-8">
                <LibraryList onNavigateToGenerator={() => setView('generator')} />
              </div>
            </>
          )}
          {view === 'search' && <SearchEngine />}
          {view === 'generator' && (
            <>
              <h2 className="text-5xl font-serif font-light tracking-tight mb-8">Literature Review Gen</h2>
              <PaperUploader />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
