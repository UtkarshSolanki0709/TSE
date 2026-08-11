import React from 'react';
import type { SearchResult } from '@tse/shared';
import { ExternalLink } from 'lucide-react';

interface Props {
  result: SearchResult;
}

export const ResultCard: React.FC<Props> = ({ result }) => {
  return (
    <div className="glass-card p-6 rounded-2xl group">
      <div className="flex justify-between items-start gap-4 mb-2">
        <a 
          href={result.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xl font-bold text-indigo-600 group-hover:text-indigo-700 hover:underline transition-colors flex items-center gap-2"
        >
          {result.title}
          <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-slate-400">
            BM25 Score
          </div>
          <div className="flex items-center gap-1 text-xs font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md font-semibold">
            {result.score.toFixed(4)}
          </div>
        </div>
      </div>
      
      <div className="text-xs text-emerald-700 mb-3 truncate font-mono font-medium">
        {result.url}
      </div>
      
      <p className="text-slate-600 leading-relaxed line-clamp-3 text-sm">
        {result.snippet}
      </p>
    </div>
  );
};
