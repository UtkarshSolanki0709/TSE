import { Search, Loader2, Globe, Layers, Sparkles } from 'lucide-react';
import { useSearchStore } from '../store/useSearchStore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useState, useRef, useEffect } from 'react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SearchBar: React.FC = () => {
  const {
    query, setQuery, performSearch, performCrawl, loading,
    crawlDepth, setCrawlDepth, mode, setMode,
    autocomplete, fetchSuggestions, fetchProviders,
    insightKey, setInsightKey,
    insightProvider, setInsightProvider,
    insightModel, setInsightModel,
    insightProviders,
  } = useSearchStore();
  const [isCrawlMode, setIsCrawlMode] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const activeProvider = insightProviders.find(p => p.id === insightProvider);
  const modelOptions = activeProvider?.models || [];

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
          "absolute inset-0 bg-indigo-500/15 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity rounded-full",
          isCrawlMode && "bg-emerald-500/15"
        )} />
        
        <div className="relative flex items-center bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-2xl overflow-hidden shadow-xl shadow-slate-200/50 transition-all group-focus-within:border-indigo-500 group-focus-within:ring-4 group-focus-within:ring-indigo-500/10">
          <div className="pl-5 text-slate-400">
            {isCrawlMode ? <Globe className="w-5 h-5 text-emerald-600" /> : <Search className="w-5 h-5 text-indigo-600" />}
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
            className="w-full bg-transparent border-none focus:ring-0 text-slate-900 placeholder-slate-400 px-4 py-4 text-lg outline-none font-medium"
          />

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className={cn(
              "px-6 py-2.5 m-2 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 text-white shadow-md",
              isCrawlMode ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25",
              "disabled:opacity-40 disabled:bg-slate-300 disabled:shadow-none"
            )}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isCrawlMode ? 'Crawl' : 'Search')}
          </button>
        </div>
      </form>

      {showSuggestions && autocomplete.length > 0 && !isCrawlMode && (
        <div className="relative -mt-4 z-50">
          <div className="absolute w-full bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xl shadow-slate-300/40">
            {autocomplete.map((word) => (
              <button
                key={word}
                onMouseDown={() => {
                  setQuery(word);
                  setShowSuggestions(false);
                  performSearch(word);
                }}
                className="w-full text-left px-5 py-3 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors font-mono font-medium border-b border-slate-100 last:border-none"
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-6">
        <div className="flex justify-center gap-3 text-sm">
          <button
            onClick={() => setIsCrawlMode(false)}
            className={cn(
              "px-5 py-2 rounded-full transition-all duration-200 font-semibold text-xs sm:text-sm border",
              !isCrawlMode ? "bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/20 scale-105" : "bg-white/80 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white"
            )}
          >
            Search Mode
          </button>
          <button
            onClick={() => setIsCrawlMode(true)}
            className={cn(
              "px-5 py-2 rounded-full transition-all duration-200 font-semibold text-xs sm:text-sm border",
              isCrawlMode ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20 scale-105" : "bg-white/80 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white"
            )}
          >
            Crawl Mode
          </button>
          {!isCrawlMode && (
            <button
              onClick={() => setMode(mode === 'insight' ? 'keyword' : 'insight')}
              className={cn(
                "px-5 py-2 rounded-full transition-all duration-200 font-semibold text-xs sm:text-sm flex items-center gap-2 border",
                mode === 'insight' ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20 scale-105 animate-pulse" : "bg-white/80 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Insight Mode
            </button>
          )}
        </div>

        {mode === 'insight' && !isCrawlMode && (
          <div className="flex flex-col items-center gap-3 w-full max-w-lg mx-auto bg-white/80 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-5 shadow-lg shadow-slate-200/40 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 text-purple-700 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Insight Engine — Bring Your Own Key</span>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full">
              <select
                value={insightProvider}
                onChange={(e) => {
                  setInsightProvider(e.target.value);
                  const prov = insightProviders.find(p => p.id === e.target.value);
                  if (prov && prov.defaultModel) setInsightModel(prov.defaultModel);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10"
              >
                {insightProviders.length === 0 && <option value="openrouter">OpenRouter</option>}
                {insightProviders.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
              <input
                list={`insight-models-${insightProvider}`}
                value={insightModel}
                onChange={(e) => setInsightModel(e.target.value)}
                placeholder={activeProvider?.defaultModel || 'model name'}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 font-mono"
              />
              <datalist id={`insight-models-${insightProvider}`}>
                {modelOptions.map(m => <option key={m} value={m} />)}
              </datalist>
            </div>
            <input
              type="password"
              value={insightKey}
              onChange={(e) => setInsightKey(e.target.value)}
              placeholder={activeProvider?.keyPlaceholder || 'API key (stored locally)'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 font-mono"
            />
            <p className="text-[11px] text-slate-400 text-center italic">
              Key stored in browser local storage.
            </p>
          </div>
        )}

        {isCrawlMode && (
          <div className="flex flex-col items-center gap-3 bg-white/80 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-5 shadow-lg shadow-slate-200/40 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>Crawl Depth: {crawlDepth} Level{crawlDepth > 1 ? 's' : ''}</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3].map((d) => (
                <button
                  key={d}
                  onClick={() => setCrawlDepth(d)}
                  className={cn(
                    "w-10 h-10 rounded-xl border transition-all flex items-center justify-center font-bold text-sm",
                    crawlDepth === d 
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/25 scale-110" 
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 max-w-[220px] text-center italic">
              Level 2+ will discover and index internal links recursively.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
