import { motion } from 'framer-motion';
import {
  Globe, Search, Database, Cpu, Zap, Shield,
  AlertTriangle, Lock, Image, Code2, Layers,
  Target, BarChart3, BookOpen, FileSearch, Building2,
  Microscope, ArrowRight, CheckCircle2, XCircle,
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5 },
};

const stagger = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  delay?: number;
}

function FeatureCard({ icon, title, description, accent, delay = 0 }: FeatureCardProps) {
  return (
    <motion.div
      {...stagger}
      transition={{ duration: 0.45, delay }}
      className="bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-6 md:p-8 space-y-4 group hover:shadow-xl hover:border-slate-300 transition-all duration-300 shadow-lg shadow-slate-200/50"
    >
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${accent} transition-transform duration-300 group-hover:scale-110`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed font-medium">{description}</p>
    </motion.div>
  );
}

interface LimitCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}

function LimitCard({ icon, title, description, delay = 0 }: LimitCardProps) {
  return (
    <motion.div
      {...stagger}
      transition={{ duration: 0.45, delay }}
      className="flex gap-4 p-5 bg-white/80 border border-slate-200/80 rounded-2xl hover:border-amber-400 hover:shadow-md transition-all duration-300"
    >
      <div className="flex-shrink-0 mt-0.5 text-amber-600">{icon}</div>
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
        <p className="text-xs text-slate-500 leading-relaxed font-medium">{description}</p>
      </div>
    </motion.div>
  );
}

export function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-20">

      {/* ── Hero Section ─────────────────────────────── */}
      <motion.section {...fadeUp} className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-purple-50 border border-purple-200 rounded-full text-purple-700 text-xs font-bold shadow-sm">
            <BookOpen className="w-3.5 h-3.5 text-purple-600" />
            <span>Documentation</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-xs font-bold shadow-sm">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% Local-First Architecture</span>
          </div>
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Everything you need to know<br />
          <span className="text-slate-400 font-semibold">about TinySearchEngine.</span>
        </h2>
        <p className="text-base text-slate-600 leading-relaxed max-w-2xl font-medium">
          TSE is a lightweight, self-hosted web scraping and search engine. All scraped data, inverted indexes, and search logs are stored <strong>100% on your local device</strong>. Nothing is hosted on external servers.
        </p>
      </motion.section>

      {/* ── Quickstart & Local Setup Guide ─────────────── */}
      <motion.section {...fadeUp} className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center">
            <Zap className="w-4 h-4 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Quickstart & Local Setup</h2>
        </div>

        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl shadow-slate-200/50">
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-900">
            <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs font-medium leading-relaxed">
              <span className="font-bold text-sm block">Device-Only Storage Guarantee</span>
              All crawled HTML, markdown exports, and SQLite databases reside locally on your machine under <code>./backend/.data/</code>. The backend server binds strictly to <code>127.0.0.1</code> to prevent any external remote access.
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Code2 className="w-4 h-4 text-indigo-600" />
              <span>Step 1: Clone & Run Local Server</span>
            </h3>
            <div className="bg-slate-900 rounded-2xl p-5 font-mono text-xs text-slate-200 space-y-2 border border-slate-800 shadow-inner">
              <div className="text-slate-500"># Install dependencies across monorepo</div>
              <div className="text-indigo-300">npm install</div>
              <div className="text-slate-500 mt-2"># Start both local Express backend (127.0.0.1:3000) and React UI</div>
              <div className="text-emerald-400">npm run dev</div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-600" />
              <span>Step 2: Connect Chrome Extension (Optional)</span>
            </h3>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-600 font-medium">
              <li>Open Chrome and navigate to <code className="px-2 py-0.5 bg-slate-100 border rounded text-xs text-slate-800 font-mono">chrome://extensions</code></li>
              <li>Enable <strong>Developer Mode</strong> in the top right corner.</li>
              <li>Click <strong>Load Unpacked</strong> and select the <code className="px-2 py-0.5 bg-slate-100 border rounded text-xs text-slate-800 font-mono">./extension</code> folder in this repository.</li>
              <li>Click the extension icon on any webpage to index content directly into your local database at <code>http://127.0.0.1:3000</code>.</li>
            </ol>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-600" />
              <span>Local Storage File Structure</span>
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-2xl text-xs">
              <table className="w-full text-left font-mono">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3">Local Path</th>
                    <th className="p-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr>
                    <td className="p-3 font-semibold text-slate-900">backend/.data/tse.db</td>
                    <td className="p-3">SQLite DB storing documents, BM25 inverted index, and search analytics.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-900">backend/.data/scraped/&#123;domain&#125;/...</td>
                    <td className="p-3">Directory storing raw HTML, parsed content.txt, metadata.json, and page.md.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── What TSE Does ────────────────────────────── */}
      <section className="space-y-8">
        <motion.div {...fadeUp} className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">What TSE does</h2>
          </div>
          <p className="text-sm text-slate-500 pl-11 font-medium">Core capabilities of the engine.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FeatureCard
            icon={<Globe className="w-5 h-5 text-indigo-600" />}
            title="Recursive Web Crawling"
            description="Crawls websites with configurable depth, following internal links and respecting domain boundaries. Real-time progress tracking with live URL and keyword feeds."
            accent="bg-indigo-50 border border-indigo-100"
            delay={0}
          />
          <FeatureCard
            icon={<FileSearch className="w-5 h-5 text-emerald-600" />}
            title="Content Extraction"
            description="Extracts clean text content, metadata, headings, and links from HTML pages. Strips ads, nav, and boilerplate — keeping only what matters."
            accent="bg-emerald-50 border border-emerald-100"
            delay={0.05}
          />
          <FeatureCard
            icon={<Search className="w-5 h-5 text-purple-600" />}
            title="BM25 Search Ranking"
            description="Full-text search with BM25 scoring — the same ranking algorithm used by Elasticsearch and Lucene. Results are scored by term frequency, document length, and inverse document frequency."
            accent="bg-purple-50 border border-purple-100"
            delay={0.1}
          />
          <FeatureCard
            icon={<Database className="w-5 h-5 text-sky-600" />}
            title="SQLite Storage"
            description="All crawled content is stored in a local SQLite database. Zero dependencies, zero infrastructure — just a single file on disk."
            accent="bg-sky-50 border border-sky-100"
            delay={0.15}
          />
          <FeatureCard
            icon={<Cpu className="w-5 h-5 text-amber-600" />}
            title="AI Insight Synthesis"
            description="Optionally query LLM providers (OpenRouter, OpenAI, etc.) to synthesize AI-powered summaries from your search results with full reasoning chain visibility."
            accent="bg-amber-50 border border-amber-100"
            delay={0.2}
          />
          <FeatureCard
            icon={<Zap className="w-5 h-5 text-rose-600" />}
            title="Real-time Updates"
            description="WebSocket-powered crawl progress with live metrics: pages indexed, current depth level, ETA estimates, and recently extracted keywords."
            accent="bg-rose-50 border border-rose-100"
            delay={0.25}
          />
        </div>
      </section>

      {/* ── What TSE Can't Do ────────────────────────── */}
      <section className="space-y-8">
        <motion.div {...fadeUp} className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-amber-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Limitations</h2>
          </div>
          <p className="text-sm text-slate-500 pl-11 font-medium">Known boundaries and constraints.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <LimitCard
            icon={<Code2 className="w-4 h-4" />}
            title="No JavaScript Rendering"
            description="TSE fetches raw HTML. Pages that render content via client-side JavaScript (SPAs, React/Angular apps) will return empty or partial content."
            delay={0}
          />
          <LimitCard
            icon={<Lock className="w-4 h-4" />}
            title="No Authenticated Content"
            description="Cannot crawl pages behind login walls, session cookies, or OAuth flows. Only publicly accessible URLs are supported."
            delay={0.05}
          />
          <LimitCard
            icon={<Image className="w-4 h-4" />}
            title="No Image / Video Indexing"
            description="TSE indexes text content only. Images, videos, PDFs, and other binary formats are not extracted or searchable."
            delay={0.1}
          />
          <LimitCard
            icon={<Shield className="w-4 h-4" />}
            title="No robots.txt Enforcement"
            description="The crawler does not currently parse or enforce robots.txt directives. Use responsibly and respect website crawling policies."
            delay={0.15}
          />
          <LimitCard
            icon={<AlertTriangle className="w-4 h-4" />}
            title="No Distributed Crawling"
            description="Runs as a single-node process. Not designed for crawling millions of pages or competing with enterprise search infrastructure."
            delay={0.2}
          />
          <LimitCard
            icon={<Layers className="w-4 h-4" />}
            title="No Incremental Updates"
            description="Re-crawling a URL replaces the previous version entirely. There's no diff tracking, versioning, or change detection between crawls."
            delay={0.25}
          />
        </div>
      </section>

      {/* ── Applications ─────────────────────────────── */}
      <section className="space-y-8">
        <motion.div {...fadeUp} className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center">
              <Target className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Applications</h2>
          </div>
          <p className="text-sm text-slate-500 pl-11 font-medium">Where TSE fits best.</p>
        </motion.div>

        <div className="space-y-3">
          {[
            {
              icon: <Microscope className="w-5 h-5 text-purple-600" />,
              title: 'Research & Aggregation',
              description: 'Crawl documentation sites, wikis, and knowledge bases to build a searchable personal library. Great for academic research, technical reference, and due diligence.',
            },
            {
              icon: <BarChart3 className="w-5 h-5 text-emerald-600" />,
              title: 'Content Auditing',
              description: 'Index your own website to discover content gaps, broken pages, and SEO blind spots. The analytics dashboard reveals zero-result queries your users are searching for.',
            },
            {
              icon: <Building2 className="w-5 h-5 text-indigo-600" />,
              title: 'Competitive Analysis',
              description: 'Crawl competitor sites to understand their content structure, keyword coverage, and information architecture — all searchable from one dashboard.',
            },
            {
              icon: <Search className="w-5 h-5 text-amber-600" />,
              title: 'Internal Site Search',
              description: 'Deploy as a lightweight internal search engine for static sites, blogs, or documentation that don\'t have built-in search. Zero external dependencies required.',
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              {...stagger}
              transition={{ duration: 0.45, delay: i * 0.06 }}
              className="bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:border-slate-300 transition-all duration-300 group"
            >
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 mt-1">{item.icon}</div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">{item.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Architecture Overview ────────────────────── */}
      <motion.section {...fadeUp} className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center">
            <Layers className="w-4 h-4 text-sky-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Architecture</h2>
        </div>

        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl shadow-slate-200/50">
          <p className="text-sm text-slate-600 leading-relaxed font-medium">
            TSE follows a simple pipeline architecture. Each stage is decoupled and runs sequentially.
          </p>

          <div className="flex flex-col md:flex-row items-stretch gap-3">
            {[
              { label: 'Crawler', sub: 'Fetch & follow', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
              { label: 'Extractor', sub: 'Parse & clean', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              { label: 'SQLite', sub: 'Store & index', color: 'bg-amber-50 text-amber-700 border-amber-200' },
              { label: 'BM25', sub: 'Rank & score', color: 'bg-purple-50 text-purple-700 border-purple-200' },
              { label: 'API', sub: 'Serve & stream', color: 'bg-rose-50 text-rose-700 border-rose-200' },
              { label: 'React UI', sub: 'Display & interact', color: 'bg-sky-50 text-sky-700 border-sky-200' },
            ].map((stage, i) => (
              <div key={stage.label} className="flex items-center gap-3 flex-1">
                <div className={`flex-1 rounded-2xl border p-4 text-center ${stage.color} font-medium`}>
                  <div className="text-sm font-bold">{stage.label}</div>
                  <div className="text-[10px] uppercase tracking-wider opacity-70 mt-1 font-bold">{stage.sub}</div>
                </div>
                {i < 5 && (
                  <ArrowRight className="w-4 h-4 text-slate-300 hidden md:block flex-shrink-0" />
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2.5 pt-2">
            {['Node.js', 'SQLite FTS5', 'Socket.io', 'React 19', 'Vite', 'Zustand', 'Framer Motion'].map((tech) => (
              <span key={tech} className="px-3.5 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-xs font-mono font-medium">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Bottom spacer */}
      <div className="h-8" />
    </div>
  );
}
