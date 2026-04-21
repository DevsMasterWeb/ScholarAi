import React from 'react';
import { Bot, BookOpen, Search, ArrowRight, LibraryBig, Sparkles } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => Promise<void>;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans">
      {/* Navigation */}
      <nav className="w-full px-8 py-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-brand" />
          <h1 className="text-2xl font-serif italic font-bold tracking-tight text-brand">Scholar<span className="font-normal">AI</span></h1>
        </div>
        <button 
          onClick={onLogin}
          className="text-sm font-medium text-slate-600 hover:text-brand transition-colors"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center max-w-5xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/5 border border-brand/10 text-brand text-xs font-semibold uppercase tracking-widest mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Generation Research</span>
        </div>
        
        <h2 className="text-5xl md:text-7xl font-serif font-bold text-slate-900 tracking-tight leading-tight mb-8">
          Your AI-Powered <br/> <span className="text-brand italic font-light">Academic Assistant</span>
        </h2>
        
        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mb-12 leading-relaxed">
          Instantly generate comprehensive literature reviews from PDFs, search the academic web, and manage your personal research library all in one seamless platform.
        </p>

        <button 
          onClick={onLogin}
          className="group flex items-center gap-3 bg-brand text-white px-8 py-4 rounded-xl font-medium text-lg shadow-lg shadow-brand/20 hover:shadow-xl hover:bg-brand/90 hover:-translate-y-0.5 transition-all"
        >
          Get Started
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
        <p className="mt-4 text-xs tracking-wide text-slate-400">Continue with your Google Account</p>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-32 w-full text-left">
          <div className="p-8 rounded-3xl bg-white border border-border/60 shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-brand/5 flex items-center justify-center mb-6">
              <Bot className="w-6 h-6 text-brand" />
            </div>
            <h3 className="text-xl font-serif font-bold text-slate-900 mb-3">Lit Review Gen</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Upload your academic PDFs and let our Llama 3.3 model generate in-depth, structured literature reviews with APA & MLA citations automatically.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-border/60 shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-brand/5 flex items-center justify-center mb-6">
              <Search className="w-6 h-6 text-brand" />
            </div>
            <h3 className="text-xl font-serif font-bold text-slate-900 mb-3">Smart Search</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Query the web for the latest academic sources, explanations, and methodologies directly within your workspace.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-border/60 shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-brand/5 flex items-center justify-center mb-6">
              <LibraryBig className="w-6 h-6 text-brand" />
            </div>
            <h3 className="text-xl font-serif font-bold text-slate-900 mb-3">Research Library</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Keep your generated reviews organized. Add custom tags, personal notes, and fetch citations instantly from your secure cloud library.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 text-center text-sm text-slate-400 border-t border-border">
        &copy; {new Date().getFullYear()} ScholarAI. Streamlining academic research.
      </footer>
    </div>
  );
};
