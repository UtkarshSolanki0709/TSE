import { useEffect, useState } from 'react';
import { SearchBar } from '../components/SearchBar';
import { ResultCard } from '../components/ResultCard';
import { ZeroResultsState } from '../components/ZeroResultsState';
import { Markdown } from '../components/Markdown';
import { useSearchStore } from '../store/useSearchStore';
import { Activity, Cpu, Clock, Link as LinkIcon, Hash, Sparkles, Search, Database, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BoomerangVideoBg } from '../components/hero/BoomerangVideoBg';

const SAMPLE_QUERIES = [
  'BM25 Ranking',
  'SQLite Search',
  'Web Crawler Architecture',
  'AI Synthesis Engine',
];

export function SearchPage() {
  const {
    results, total, loading, timeMs, query, suggestion,
    performSearch, crawlProgress, brainOutput,
    insightProvider, insightModel, insightProviders,
  } = useSearchStore();

  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Derive crawl progress metrics
  const elapsed = crawlProgress ? currentTime - crawlProgress.startTime : 0;
  const perDoc = (crawlProgress && crawlProgress.docsCrawled > 0) ? elapsed / crawlProgress.docsCrawled : 0;
  const remaining = crawlProgress ? crawlProgress.totalExpected - crawlProgress.docsCrawled : 0;
  const etaSeconds = Math.max(0, Math.floor((remaining * perDoc) / 1000));

  const etaText = !crawlProgress || crawlProgress.docsCrawled === 0
    ? 'Estimating...'
    : (etaSeconds <= 0 ? 'Almost done' : `${etaSeconds}s remaining`);

  const progressPercentage = crawlProgress
    ? Math.min(Math.round((crawlProgress.docsCrawled / crawlProgress.totalExpected) * 100), 100)
    : 0;

  return (
    <div className="space-y-12">
      <SearchBar />

      {/* Crawl Progress Panel */}
      <AnimatePresence>
        {crawlProgress && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative overflow-hidden bg-white/90 border border-emerald-300 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl shadow-emerald-500/10"
          >
            {/* Animated Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-200/30 blur-[80px] -mr-32 -mt-32 animate-pulse" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-lg">
                  <Cpu className="w-5 h-5 animate-spin-slow text-emerald-600" />
                  <span>Crawl in Progress...</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                  <LinkIcon className="w-4 h-4 text-emerald-600" />
                  <span className="truncate max-w-[300px] md:max-w-md">{crawlProgress.activeUrl || crawlProgress.url}</span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-slate-400 text-[10px] uppercase tracking-widest font-bold">Progress</div>
                  <div className="text-2xl font-black text-slate-900">{progressPercentage}%</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400 text-[10px] uppercase tracking-widest font-bold">Level</div>
                  <div className="text-2xl font-black text-emerald-600">{crawlProgress.currentLevel}<span className="text-slate-300">/{crawlProgress.maxDepth}</span></div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-3 relative z-10">
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ type: 'spring', damping: 20 }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ETA: {etaText}</span>
                </div>
                <div className="text-slate-500">
                  {crawlProgress.docsCrawled} / {crawlProgress.totalExpected} Pages Indexed
                </div>
              </div>
            </div>

            {/* Live Keywords Feed */}
            {crawlProgress.recentTerms.length > 0 && (
              <div className="pt-2 flex flex-wrap gap-2 relative z-10">
                <div className="w-full flex items-center gap-2 text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-1">
                  <Hash className="w-3 h-3 text-emerald-600" />
                  <span>Live Extraction</span>
                </div>
                <AnimatePresence mode="popLayout">
                  {crawlProgress.recentTerms.map((term, i) => (
                    <motion.span
                      key={`${term}-${i}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-mono font-medium"
                    >
                      {term}
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suggestion Notification */}
      {suggestion && !loading && !crawlProgress && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-6 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-sm shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span className="font-medium">Did you mean:</span>
          <button
            onClick={() => performSearch(suggestion)}
            className="font-bold underline text-amber-700 hover:text-amber-950 transition-colors"
          >
            {suggestion}
          </button>
          <span className="text-amber-400">?</span>
        </motion.div>
      )}

      {/* AI Brain Output */}
      <AnimatePresence>
        {brainOutput && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden bg-white/90 border border-purple-200 rounded-3xl p-8 mb-12 shadow-xl shadow-purple-500/10"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-200/40 blur-[80px] -mr-32 -mt-32" />

            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-700 font-bold uppercase tracking-widest text-xs">
                  <Cpu className="w-4 h-4 text-purple-600" />
                  <span>Insight Synthesis</span>
                </div>
                <div className="text-slate-400 text-[10px] uppercase tracking-widest font-mono">
                  {insightProviders.find(p => p.id === insightProvider)?.label || insightProvider}
                  {insightModel ? ` / ${insightModel}` : ''}
                </div>
              </div>

              <div className="text-slate-800 leading-relaxed font-medium">
                <Markdown content={brainOutput.answer} />
              </div>

              {!!brainOutput.reasoning && (
                <div className="pt-6 border-t border-purple-100">
                  <details className="group">
                    <summary className="text-purple-600 text-[11px] uppercase tracking-widest font-bold cursor-pointer hover:text-purple-800 transition-colors list-none flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-600 group-open:scale-150 transition-all" />
                      View Internal Reasoning
                    </summary>
                    <div className="mt-4 p-4 bg-purple-50/70 border border-purple-100 rounded-2xl text-purple-900 text-xs font-mono leading-loose whitespace-pre-wrap">
                      {typeof brainOutput.reasoning === 'string' ? brainOutput.reasoning : JSON.stringify(brainOutput.reasoning, null, 2)}
                    </div>
                  </details>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Metadata */}
      {(results.length > 0 || (query && !loading)) && (
        <div className="flex items-center justify-between px-2 text-sm text-slate-500 border-b border-slate-200/80 pb-4 font-medium">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            <span>Found <strong className="text-slate-900">{total}</strong> results ({timeMs}ms)</span>
          </div>
          <div className="hidden md:block text-slate-400 text-xs uppercase tracking-wider font-semibold">
            Filtered by: Relevance (BM25)
          </div>
        </div>
      )}

      {/* Result List or Visual Placeholder when Idle */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/70 border border-slate-200 p-6 rounded-2xl animate-pulse h-40 shadow-sm" />
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-4">
            {results.map((result, index) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <ResultCard result={result} />
              </motion.div>
            ))}
          </div>
        ) : query && !loading ? (
          <ZeroResultsState />
        ) : (
          /* ── Rich Video / Visual Placeholder Card when Idle ── */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl border border-slate-200/80 shadow-2xl shadow-slate-300/50 bg-slate-950 text-white min-h-[380px] flex flex-col justify-between p-8 md:p-10 group"
          >
            {/* Embedded Boomerang Video Background inside frame */}
            <div className="absolute inset-0 z-0 opacity-45 group-hover:opacity-55 transition-opacity duration-700 pointer-events-none">
              <BoomerangVideoBg />
            </div>
            
            {/* Vignette Overlay */}
            <div className="absolute inset-0 z-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/40 pointer-events-none" />

            {/* Top Badge */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 liquid-glass rounded-full text-white text-xs font-semibold tracking-wide">
                <Database className="w-3.5 h-3.5 text-sky-400" />
                <span>INDEX ENGINE ONLINE</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-white/50">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>READY</span>
              </div>
            </div>

            {/* Middle Content */}
            <div className="relative z-10 my-8 space-y-4 max-w-xl">
              <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
                Explore the Index or Crawl New URLs
              </h3>
              <p className="text-sm md:text-base text-white/70 leading-relaxed">
                Enter any query above to perform BM25 search scoring, or switch to <strong className="text-emerald-400">Crawl Mode</strong> to ingest new websites in real time.
              </p>
            </div>

            {/* Quick Sample Queries */}
            <div className="relative z-10 space-y-3 pt-4 border-t border-white/10">
              <div className="text-[11px] uppercase tracking-wider font-bold text-white/40 flex items-center gap-2">
                <Search className="w-3 h-3 text-indigo-400" />
                <span>Try Sample Search Queries</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_QUERIES.map((sampleQ) => (
                  <button
                    key={sampleQ}
                    onClick={() => performSearch(sampleQ)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl text-xs font-medium text-white transition-all duration-200 hover:scale-105 active:scale-95 group/btn"
                  >
                    <span>{sampleQ}</span>
                    <ArrowRight className="w-3 h-3 text-white/50 group-hover/btn:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
