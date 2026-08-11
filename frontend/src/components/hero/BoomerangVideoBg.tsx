import { useRef, useEffect, useState, useCallback } from 'react';

// Tech-focused background video streams (Digital Data Network / Cyber Grid / Search Indexing)
const TECH_VIDEO_SOURCES = [
  'https://assets.mixkit.co/videos/preview/mixkit-network-lines-and-dots-in-blue-background-41551-large.mp4',
  'https://cdn.coverr.co/videos/coverr-digital-network-lines-5654/1080p.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260611_183632_c311af08-e4b7-458f-81e7-79847a49b3d3.mp4',
];

const MAX_WIDTH = 960;
const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

export function BoomerangVideoBg() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLCanvasElement[]>([]);
  const [capturing, setCapturing] = useState(true);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  /* ── Interactive Cyber Data Node Network Layer ──────── */
  useEffect(() => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const NODE_COUNT = Math.min(50, Math.floor((width * height) / 25000));
    const nodes = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      radius: Math.random() * 2 + 1,
    }));

    let animId: number;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw connecting crawler lines
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 140) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.25 * (1 - dist / 140)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw data nodes
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(129, 140, 248, 0.6)';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#6366f1';
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  /* ── Video Frame Capture Phase ────────────────────── */
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);

    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const ctx = offscreen.getContext('2d');
    if (ctx) {
      try {
        ctx.drawImage(video, 0, 0, w, h);
        framesRef.current.push(offscreen);
      } catch (err) {
        console.warn('Canvas frame capture bypassed:', err);
      }
    }
  }, []);

  const handleVideoError = () => {
    if (currentVideoIndex < TECH_VIDEO_SOURCES.length - 1) {
      setCurrentVideoIndex((prev) => prev + 1);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let rafId: number;
    framesRef.current = [];

    const hasRVFC = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;

    if (hasRVFC) {
      const rvfcVideo = video as HTMLVideoElement & {
        requestVideoFrameCallback(callback: () => void): number;
      };
      const onFrame = () => {
        captureFrame();
        if (!video.ended && !video.paused) {
          rvfcVideo.requestVideoFrameCallback(onFrame);
        }
      };
      video.addEventListener('play', () => {
        rvfcVideo.requestVideoFrameCallback(onFrame);
      }, { once: true });
    } else {
      const poll = () => {
        if (!video.ended && !video.paused) {
          captureFrame();
          rafId = requestAnimationFrame(poll);
        }
      };
      video.addEventListener('play', () => {
        rafId = requestAnimationFrame(poll);
      }, { once: true });
    }

    const onEnded = () => setCapturing(false);
    video.addEventListener('ended', onEnded);

    return () => {
      cancelAnimationFrame(rafId);
      video.removeEventListener('ended', onEnded);
    };
  }, [captureFrame, currentVideoIndex]);

  /* ── Boomerang Ping-Pong Playback Phase ─────────── */
  useEffect(() => {
    if (capturing) return;

    const canvas = canvasRef.current;
    const frames = framesRef.current;
    if (!canvas || frames.length === 0) return;

    const first = frames[0];
    canvas.width = first.width;
    canvas.height = first.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let idx = 0;
    let direction = 1;
    let lastTime = 0;
    let rafId: number;

    const draw = (time: number) => {
      if (time - lastTime >= FRAME_INTERVAL) {
        ctx.drawImage(frames[idx], 0, 0);
        idx += direction;

        if (idx >= frames.length) {
          direction = -1;
          idx = frames.length - 2;
        } else if (idx < 0) {
          direction = 1;
          idx = 1;
        }
        lastTime = time;
      }
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [capturing]);

  return (
    <div className="absolute inset-0 z-0 scale-[1.08] origin-center overflow-hidden bg-slate-950">
      {/* Background Interactive Data Node Network Layer */}
      <canvas
        ref={particleCanvasRef}
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none opacity-60"
      />

      {/* Video capture element */}
      {capturing && (
        <video
          ref={videoRef}
          src={TECH_VIDEO_SOURCES[currentVideoIndex]}
          onError={handleVideoError}
          muted
          playsInline
          autoPlay
          crossOrigin="anonymous"
          className="relative z-10 h-full w-full object-cover opacity-80"
        />
      )}

      {/* Ping-pong Boomerang Canvas output */}
      <canvas
        ref={canvasRef}
        className={`relative z-10 h-full w-full object-cover opacity-80 ${capturing ? 'hidden' : ''}`}
      />
    </div>
  );
}
