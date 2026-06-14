import React from 'react';
import type { SearchResult } from '@tse/shared';
import { ExternalLink } from 'lucide-react';

interface Props {
  result: SearchResult;
}

export const ResultCard: React.FC<Props> = ({ result }) => {
  return (
    <div className="glass glass-hover p-6 rounded-2xl group transition-all">
      <div className="flex justify-between items-start gap-4 mb-2">
        <a 
          href={result.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xl font-semibold text-blue-400 group-hover:text-blue-300 transition-colors flex items-center gap-2"
        >
          {result.title}
          <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-white/20">
            Relevance Score
          </div>
          <div className="flex items-center gap-1 text-xs font-mono text-blue-400/80 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
            {result.score.toFixed(4)}
          </div>
        </div>
      </div>
      
      <div className="text-sm text-white/50 mb-3 truncate font-mono">
        {result.url}
      </div>
      
      <p className="text-white/70 leading-relaxed line-clamp-3">
        {result.snippet}
      </p>
    </div>
  );
};
