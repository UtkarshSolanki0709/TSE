import { useEffect, useState } from 'react';
import { SearchBar } from './components/SearchBar';
import { ResultCard } from './components/ResultCard';
import { ZeroResultsState } from './components/ZeroResultsState';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';
import { ScrapedExplorer } from './pages/ScrapedExplorer';
import { Markdown } from './components/Markdown';
import { useSearchStore } from './store/useSearchStore';
import { Database, Activity, Search, BarChart3, Cpu, Clock, Link, Hash, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type View = 'search' | 'analytics' | 'scraped';

function App() {
  const { results, total, loading, timeMs, query, suggestion, performSearch, crawlProgress, initSocket, brainOutput } = useSearchStore();
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [view, setView] = useState<View>('search');

  useEffect(() => {
    initSocket();
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [initSocket]);

  // Derive everything from state (Pure)
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
    <div className="min-h-screen px-4 py-8 md:py-16">
      {/* Navigation / Header */}
      <header className="max-w-5xl mx-auto mb-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-medium mb-2">
              <Database className="w-3 h-3" />
              <span>TinySearchEngine v1.2 — Real-time</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white flex items-center gap-3">
              TSE <span className="text-white/20">/</span> {view === 'search' ? 'Discovery' : 'Analytics'}
            </h1>
          </div>

          <nav className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-2xl self-start">
            <button 
              onClick={() => setView('search')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                view === 'search' ? 'bg-white/10 text-white shadow-xl' : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              <Search className="w-4 h-4" />
              Search
            </button>
            <button 
              onClick={() => setView('scraped')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                view === 'scraped' ? 'bg-white/10 text-white shadow-xl' : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              <Database className="w-4 h-4" />
              Scraped Explorer
            </button>
            <button 
              onClick={() => setView('analytics')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                view === 'analytics' ? 'bg-white/10 text-white shadow-xl' : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </button>
          </nav>
        </div>

        <AnimatePresence mode="wait">
          {view === 'search' ? (
            <motion.div
              key="search-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12"
            >
              <SearchBar />

              {/* Crawl Progress Panel */}
              <AnimatePresence>
                {crawlProgress && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative overflow-hidden bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 md:p-8 space-y-6"
                  >
                    {/* Animated Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] -mr-32 -mt-32 animate-pulse" />
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
                          <Cpu className="w-5 h-5 animate-spin-slow" />
                          <span>Crawl in Progress...</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/40 text-sm">
                          <Link className="w-4 h-4" />
                          <span className="truncate max-w-[300px] md:max-w-md">{crawlProgress.activeUrl || crawlProgress.url}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-white/20 text-[10px] uppercase tracking-widest font-bold">Progress</div>
                          <div className="text-2xl font-black text-white">{progressPercentage}%</div>
                        </div>
                        <div className="text-right">
                          <div className="text-white/20 text-[10px] uppercase tracking-widest font-bold">Level</div>
                          <div className="text-2xl font-black text-emerald-500">{crawlProgress.currentLevel}<span className="text-emerald-900">/{crawlProgress.maxDepth}</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-3 relative z-10">
                      <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercentage}%` }}
                          transition={{ type: 'spring', damping: 20 }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                        <div className="flex items-center gap-1.5 text-white/30">
                          <Clock className="w-3 h-3" />
                          <span>ETA: {etaText}</span>
                        </div>
                        <div className="text-white/30">
                          {crawlProgress.docsCrawled} / {crawlProgress.totalExpected} Pages Indexed
                        </div>
                      </div>
                    </div>

                    {/* Live Keywords Feed */}
                    {crawlProgress.recentTerms.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-2 relative z-10">
                        <div className="w-full flex items-center gap-2 text-white/20 text-[10px] uppercase tracking-widest font-bold mb-1">
                          <Hash className="w-3 h-3" />
                          <span>Live Extraction</span>
                        </div>
                        <AnimatePresence mode="popLayout">
                          {crawlProgress.recentTerms.map((term, i) => (
                            <motion.span
                              key={`${term}-${i}`}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-emerald-300/60 text-xs font-mono"
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
                  className="flex items-center gap-2 px-6 py-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-200 text-sm"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Did you mean:</span>
                  <button 
                    onClick={() => performSearch(suggestion)}
                    className="font-bold underline hover:text-white transition-colors"
                  >
                    {suggestion}
                  </button>
                  <span className="text-amber-500/40">?</span>
                </motion.div>
              )}

              {/* AI Brain Output */}
              <AnimatePresence>
                {brainOutput && !loading && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative overflow-hidden bg-purple-500/10 border border-purple-500/30 rounded-3xl p-8 mb-12"
                  >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[100px] -mr-32 -mt-32" />
                    
                    <div className="relative z-10 space-y-6">
                      <div className="flex items-center gap-2 text-purple-400 font-bold uppercase tracking-widest text-xs">
                        <Cpu className="w-4 h-4" />
                        <span>Brain Synthesis (Nemotron-3)</span>
                      </div>
                      
                      <div className="text-white leading-relaxed">
                        <Markdown content={brainOutput.answer} />
                      </div>

                      {!!brainOutput.reasoning && (
                        <div className="pt-6 border-t border-purple-500/20">
                          <details className="group">
                            <summary className="text-purple-400/60 text-[10px] uppercase tracking-widest font-black cursor-pointer hover:text-purple-400 transition-colors list-none flex items-center gap-2">
                              {/* Arrow icon */}
                              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 group-open:scale-150 transition-all" />
                              View Internal Reasoning
                            </summary>
                            <div className="mt-4 p-4 bg-purple-500/5 rounded-2xl text-purple-200/50 text-xs font-mono leading-loose whitespace-pre-wrap">
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
                <div className="flex items-center justify-between px-2 text-sm text-white/30 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    <span>Found {total} results ({timeMs}ms)</span>
                  </div>
                  <div className="hidden md:block">
                    Filtered by: Relevance (TF-IDF)
                  </div>
                </div>
              )}

              {/* Result List with Staggered Animations */}
              <div className="space-y-4">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="glass p-6 rounded-2xl animate-pulse h-40" />
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
                  <div className="text-center py-24 text-white/10 italic">
                    Enter a query to explore the index...
                  </div>
                )}
              </div>
            </motion.div>
          ) : view === 'scraped' ? (
            <motion.div
              key="scraped-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ScrapedExplorer />
            </motion.div>
          ) : (
            <motion.div
              key="analytics-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AnalyticsDashboard />
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Footer */}
      <footer className="mt-24 border-t border-white/5 pt-8 text-center text-white/20 text-xs">
        <div className="flex justify-center gap-8 mb-4">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span>SQLite Optimized</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <span>Hybrid Scoring Active</span>
          </div>
        </div>
        <p className="mt-4">TinySearchEngine &copy; 2026. Built with Vite, React 19, and Node.js.</p>
      </footer>
    </div>
  );
}

export default App;
