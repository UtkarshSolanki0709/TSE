import { useNavigate } from 'react-router-dom';

export function HeroContent() {
  const navigate = useNavigate();

  return (
    <div className="relative z-10 pt-28 sm:pt-36 md:pt-44 px-4 sm:px-6">
      {/* Tag badge */}
      <div className="animate-fade-up delay-1 mb-5 sm:mb-6">
        <span
          className="liquid-glass inline-block rounded-lg px-4 py-1.5 text-xs sm:text-sm text-white"
          style={{ background: 'rgba(255, 255, 255, 0.16)' }}
        >
          v1.2 &nbsp;·&nbsp; Real-time Engine
        </span>
      </div>

      {/* Headline */}
      <h1 className="animate-fade-up delay-2 max-w-3xl text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1] text-white">
        scrape the signal,
        <br />
        cut the noise.
      </h1>

      {/* Subtext */}
      <p className="animate-fade-up delay-3 mt-5 sm:mt-6 max-w-md text-sm sm:text-base md:text-lg leading-relaxed text-white/90">
        TSE crawls, indexes, and ranks web content with BM25 scoring — so you
        find exactly what matters, nothing you don't.
      </p>

      {/* CTA buttons */}
      <div className="animate-fade-up delay-4 mt-8 flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => navigate('/search')}
          className="rounded-xl bg-white px-7 py-2.5 text-sm text-gray-900 transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          Start searching
        </button>
        <button
          onClick={() => navigate('/search')}
          className="liquid-glass rounded-xl px-7 py-2.5 text-sm text-white transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          Crawl a site
        </button>
      </div>
    </div>
  );
}
