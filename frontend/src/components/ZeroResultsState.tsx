import React from 'react';
import { SearchX, Sparkles } from 'lucide-react';

export const ZeroResultsState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
      <div className="bg-white/5 p-6 rounded-full mb-6">
        <SearchX className="w-12 h-12 text-white/20" />
      </div>
      <h3 className="text-2xl font-semibold mb-2">No results found</h3>
      <p className="text-white/40 max-w-sm mb-8">
        We couldn't find anything matching your query. Try different keywords or crawl a new site to build your index.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg text-left">
        <div className="glass p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2 text-blue-400">
            <Sparkles className="w-4 h-4" />
            <span className="font-semibold text-sm">Crawl mode</span>
          </div>
          <p className="text-xs text-white/50 leading-relaxed">
            Switch to Crawl Mode above to index a new website and expand your search results.
          </p>
        </div>
        <div className="glass p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2 text-emerald-400">
            <Sparkles className="w-4 h-4" />
            <span className="font-semibold text-sm">Broaden query</span>
          </div>
          <p className="text-xs text-white/50 leading-relaxed">
            Try using single keywords instead of long phrases for better matching in Phase 1.
          </p>
        </div>
      </div>
    </div>
  );
};
