import { Search, Loader2, Globe, Layers, Sparkles } from 'lucide-react';
import { useSearchStore } from '../store/useSearchStore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useState, useRef } from 'react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SearchBar: React.FC = () => {
  const { query, setQuery, performSearch, performCrawl, loading, crawlDepth, setCrawlDepth, mode, setMode, autocomplete, fetchSuggestions } = useSearchStore();
  const [isCrawlMode, setIsCrawlMode] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCrawlMode) {
      performCrawl(query);
    } else {
      performSearch();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <form 
        onSubmit={handleSubmit}
        className="relative group block"
      >
        <div className={cn(
          "absolute inset-0 bg-blue-500/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity rounded-full",
          isCrawlMode && "bg-emerald-500/20"
        )} />
        
        <div className="relative flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden shadow-2xl transition-all group-focus-within:border-blue-500/50">
          <div className="pl-4 text-white/50">
            {isCrawlMode ? <Globe className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </div>
          
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!isCrawlMode) {
                setShowSuggestions(true);
                clearTimeout(debounceRef.current);
                debounceRef.current = setTimeout(() => fetchSuggestions(e.target.value), 150);
              }
            }}
            onFocus={() => !isCrawlMode && query && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowSuggestions(false);
            }}
            placeholder={isCrawlMode ? "Enter URL to crawl (e.g. https://example.com)..." : "Search query..."}
            className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-white/30 px-4 py-4 text-lg outline-none"
          />

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className={cn(
              "px-6 py-2 m-2 rounded-xl font-medium transition-colors flex items-center gap-2",
              isCrawlMode ? "bg-emerald-600 hover:bg-emerald-500" : "bg-blue-600 hover:bg-blue-500",
              "disabled:bg-gray-700 text-white"
            )}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isCrawlMode ? 'Crawl' : 'Search')}
          </button>
        </div>
      </form>

      {showSuggestions && autocomplete.length > 0 && !isCrawlMode && (
        <div className="relative -mt-4 z-50">
          <div className="absolute w-full bg-zinc-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            {autocomplete.map((word) => (
              <button
                key={word}
                onMouseDown={() => {
                  setQuery(word);
                  setShowSuggestions(false);
                  performSearch(word);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors font-mono"
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-6">
        <div className="flex justify-center gap-4 text-sm">
          <button
            onClick={() => setIsCrawlMode(false)}
            className={cn(
              "px-4 py-1.5 rounded-full transition-all border",
              !isCrawlMode ? "bg-blue-600/20 border-blue-500 text-blue-400" : "bg-transparent border-white/10 text-white/50 hover:text-white"
            )}
          >
            Search Mode
          </button>
          <button
            onClick={() => setIsCrawlMode(true)}
            className={cn(
              "px-4 py-1.5 rounded-full transition-all border",
              isCrawlMode ? "bg-emerald-600/20 border-emerald-500 text-emerald-400" : "bg-transparent border-white/10 text-white/50 hover:text-white"
            )}
          >
            Crawl Mode
          </button>
          {!isCrawlMode && (
            <button
              onClick={() => setMode(mode === 'meaningful' ? 'keyword' : 'meaningful')}
              className={cn(
                "px-4 py-1.5 rounded-full transition-all border flex items-center gap-2",
                mode === 'meaningful' ? "bg-purple-600/20 border-purple-500 text-purple-400 animate-pulse" : "bg-transparent border-white/10 text-white/50 hover:text-white"
              )}
            >
              <Sparkles className="w-3 h-3" />
              Meaningful Mode
            </button>
          )}
        </div>

        {isCrawlMode && (
          <div className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-2 text-white/40 text-xs font-medium uppercase tracking-widest">
              <Layers className="w-3 h-3" />
              <span>Crawl Depth: {crawlDepth} Level{crawlDepth > 1 ? 's' : ''}</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3].map((d) => (
                <button
                  key={d}
                  onClick={() => setCrawlDepth(d)}
                  className={cn(
                    "w-10 h-10 rounded-xl border transition-all flex items-center justify-center font-bold",
                    crawlDepth === d 
                      ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20 scale-110" 
                      : "bg-white/5 border-white/10 text-white/30 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-white/20 max-w-[200px] text-center italic">
              Level 2+ will discover and index links found on the page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
