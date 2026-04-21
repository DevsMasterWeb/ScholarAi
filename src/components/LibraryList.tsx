import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAuth, db } from '../context/AuthContext';
import { BookMarked, FileText } from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';

interface Paper {
  id: string;
  title: string;
  aiSummary: string;
  relevanceScore: number;
  createdAt: any;
  tags?: string[];
  notes?: string;
  citationApa?: string;
  citationMla?: string;
}

const CopyButton: React.FC<{ text: string; label: string }> = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="text-[10px] p-2 bg-slate-100 rounded hover:bg-slate-200">
      {copied ? 'Copied!' : `Copy ${label}`}
    </button>
  );
};

export const LibraryList: React.FC<{ onNavigateToGenerator?: () => void }> = ({ onNavigateToGenerator }) => {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReview, setActiveReview] = useState<{title: string, content: string} | null>(null);
  const { user } = useAuth();
  
  const updatePaper = async (id: string, updates: { tags?: string[], notes?: string }) => {
    const paper = papers.find(p => p.id === id);
    if (!paper || !user) return;
    
    try {
      await updateDoc(doc(db, 'papers', id), updates);
      setPapers(papers.map(p => p.id === id ? { ...p, ...updates } : p));
    } catch(e) {
      console.error(e);
    }
  };

  const deletePaper = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'papers', id));
      setPapers(papers.filter(p => p.id !== id));
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    async function loadPapers() {
      if (!user) return;
      try {
        const q = query(collection(db, 'papers'), where('userId', '==', user.uid));
        const limitRes = await getDocs(q);
        const docs = limitRes.docs.map(doc => ({ id: doc.id, ...doc.data() } as Paper));
        // Sort explicitly since we don't have an index for createdAt + userId
        const sorted = docs.sort((a,b) => {
          const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return tb - ta;
        });
        setPapers(sorted);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadPapers();
  }, [user]);

  if (loading) return (
    <div className="flex animate-pulse space-x-4">
      <div className="flex-1 space-y-6 py-1">
        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-slate-200 rounded"></div>
          <div className="h-4 bg-slate-200 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  );

  if (!loading && papers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50">
        <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mb-6">
          <BookMarked className="w-10 h-10 text-brand" />
        </div>
        <h3 className="text-2xl font-serif font-bold tracking-tight text-slate-800 mb-2">Your library is waiting</h3>
        <p className="text-slate-500 max-w-sm mb-8">
          Upload and review your first academic paper to start building your personal AI-powered research library.
        </p>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
          <FileText className="w-4 h-4" />
          <span>Head to <button onClick={onNavigateToGenerator} className="text-brand hover:underline font-bold cursor-pointer">Lit Review Gen</button> to get started</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeReview ? (
        <div className="bg-white border rounded-2xl p-12 shadow-sm prose prose-slate max-w-4xl mx-auto">
          <button onClick={() => setActiveReview(null)} className="text-sm font-medium text-brand hover:underline mb-8">← Back to Library</button>
          <h2 className="text-3xl font-serif font-bold text-gray-900 mb-6">{activeReview.title}</h2>
          <div className="text-gray-800 space-y-4">
            <ReactMarkdown>{activeReview.content}</ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {papers.map(paper => (
            <div key={paper.id} className="bg-white border border-border rounded-2xl p-6 flex flex-col relative gap-3">
              <button
                 onClick={() => deletePaper(paper.id)}
                 className="absolute top-4 right-4 text-[10px] text-red-500 hover:text-red-700"
              >
                Delete
              </button>
              <span className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-black rounded-full border border-green-100 w-max uppercase tracing-widest">
                Relevance: {paper.relevanceScore}%
              </span>
              <h3 className="text-xl font-serif font-bold leading-tight cursor-pointer hover:text-brand" onClick={() => setActiveReview({title: paper.title, content: paper.aiSummary})}>{paper.title}</h3>
              <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{paper.aiSummary}</p>
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Tags</label>
                <input
                  type="text"
                  placeholder="e.g. AI, Climate, Methods"
                  defaultValue={paper.tags?.join(', ')}
                  onBlur={(e) => updatePaper(paper.id, { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                  className="text-xs p-2 border rounded-lg"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Notes</label>
                <textarea
                  placeholder="Add your own insights here..."
                  defaultValue={paper.notes}
                  onBlur={(e) => updatePaper(paper.id, { notes: e.target.value })}
                  className="text-xs p-2 border rounded-lg h-20"
                />
              </div>

              <div className="flex gap-2 mt-2">
                <CopyButton text={paper.citationApa || ''} label="APA" />
                <CopyButton text={paper.citationMla || ''} label="MLA" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
