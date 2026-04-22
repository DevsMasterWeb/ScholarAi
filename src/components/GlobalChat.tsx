import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Send, Bot, User as UserIcon } from 'lucide-react';
import Markdown from 'react-markdown';

export const GlobalChat: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || !user) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg, userId: user.uid })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-4xl mx-auto w-full bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="p-6 border-b border-border bg-slate-50/50">
        <h3 className="text-xl font-serif font-bold text-slate-800">Chat with your Library</h3>
        <p className="text-sm text-slate-500">Ask questions across all the PDFs you've generated reviews for.</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Bot className="w-12 h-12 mb-4 text-brand/20" />
            <p>Ask anything about your research papers...</p>
          </div>
        )}
        
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center ${m.role === 'user' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'}`}>
              {m.role === 'user' ? <UserIcon className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl p-4 ${m.role === 'user' ? 'bg-brand text-white rounded-tr-sm' : 'bg-slate-50 border border-slate-100 rounded-tl-sm text-slate-700'}`}>
              {m.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none prose-slate">
                  <Markdown>{m.content}</Markdown>
                </div>
              ) : (
                <p className="text-sm">{m.content}</p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-slate-50 inline-flex border border-slate-100 rounded-2xl p-4 rounded-tl-sm text-slate-500 text-sm">
              Thinking... searching your vector library...
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border bg-white">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="E.g. What were the limitations of the neural networks paper?"
            className="w-full pl-6 pr-14 py-4 rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-slate-50 hover:bg-slate-100/50 transition-colors"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="absolute right-2 top-2 bottom-2 p-3 bg-brand text-white rounded-full hover:bg-brand/90 disabled:opacity-50 disabled:hover:bg-brand transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
