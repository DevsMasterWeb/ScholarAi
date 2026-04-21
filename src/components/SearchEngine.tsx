import React, { useState } from 'react';

export const SearchEngine: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const performSearch = async () => {
    if (!searchQuery) return;
    setSearching(true);
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: searchQuery })
    });
    const data = await res.json();
    setSearchResults(data.results || []);
    setSearching(false);
  };

  const importPaper = async (paper: any) => {
    await fetch('/api/papers/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'user-123' },
      body: JSON.stringify({ title: paper.title, url: paper.url, summary: paper.content })
    });
    setSearchResults(searchResults.filter(p => p.url !== paper.url));
    alert('Imported to library!');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-5xl font-serif font-light tracking-tight mb-8">Web Search</h2>
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search web for papers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && performSearch()}
          className="flex-grow px-4 py-2 rounded-full border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <button
          onClick={performSearch}
          disabled={searching}
          className="bg-brand text-white px-4 py-2 rounded-full text-sm"
        >
          {searching ? 'Searching...' : 'Search Web'}
        </button>
      </div>

      {searchResults.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {searchResults.map((res: any, i: number) => (
            <div key={i} className="bg-white p-4 rounded-xl border text-sm flex flex-col gap-2">
              <a href={res.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline">{res.title}</a>
              <p className="text-slate-600 mt-1 line-clamp-2">{res.content}</p>
              <button 
                onClick={() => importPaper(res)}
                className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-200 mt-2 self-start"
              >
                Import to Library
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
