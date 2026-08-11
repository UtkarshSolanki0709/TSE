import { useState } from 'react';
import { BarChart3, Heart } from 'lucide-react';

interface IndexStatusProps {
  onSearch?: () => void;
  onExplore?: () => void;
}

export function IndexStatus({ onSearch, onExplore }: IndexStatusProps) {
  const [liked, setLiked] = useState(false);

  return (
    <div className="animate-fade-up delay-5 absolute bottom-4 right-4 sm:bottom-6 sm:right-6 md:bottom-8 md:right-10 max-w-[270px] sm:w-72 z-20 space-y-2">
      {/* Track / status card */}
      <div className="rounded-2xl bg-white p-2.5 pr-4 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-700">
            <BarChart3 size={20} strokeWidth={2.5} className="text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-gray-900">
              Pages indexed — 1,247 docs
            </p>
            {/* Progress bar */}
            <div className="mt-1.5 h-1 w-full rounded-full bg-gray-200">
              <div className="h-full w-[30%] rounded-full bg-blue-700" />
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-[10px] text-gray-500">SQLite • BM25</span>
              <span className="text-[10px] text-gray-500">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSearch}
          className="flex-1 rounded-2xl bg-white py-2 text-sm text-gray-900 shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          Search
        </button>

        <button
          onClick={() => setLiked(!liked)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-lg transition-transform duration-200 hover:scale-110 active:scale-95"
        >
          <Heart
            size={16}
            className={liked ? 'text-blue-700 fill-blue-700' : 'text-blue-700'}
          />
        </button>

        <button
          onClick={onExplore}
          className="flex-1 rounded-2xl bg-white py-2 text-sm text-gray-900 shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          Explore
        </button>
      </div>
    </div>
  );
}
