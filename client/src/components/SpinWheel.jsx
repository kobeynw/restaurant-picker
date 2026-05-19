import { useEffect, useLayoutEffect, useRef } from 'react';

const COLORS = [
  '#10b981', '#0ea5e9', '#f59e0b', '#ef4444', '#a855f7',
  '#ec4899', '#14b8a6', '#84cc16', '#f97316', '#6366f1',
];

const CSS_SIZE = 360;

export default function SpinWheel({
  items,
  spinState = null,
  staticAngle = null,
  onSpinClick,
  disabled = false,
}) {
  const isStatic = staticAngle !== null;
  const isSpinning = !!spinState && !isStatic;
  const canvasRef = useRef(null);
  const angleRef = useRef(isStatic ? staticAngle : 0);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = CSS_SIZE * dpr;
    canvas.height = CSS_SIZE * dpr;
    canvas.style.width = `${CSS_SIZE}px`;
    canvas.style.height = `${CSS_SIZE}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    drawWheel(ctx, itemsRef.current, angleRef.current);
  }, []);

  useEffect(() => {
    if (isSpinning) return;
    if (isStatic) angleRef.current = staticAngle;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawWheel(ctx, items, angleRef.current);
  }, [items, isStatic, staticAngle, isSpinning]);

  const startedAt = spinState?.startedAt ?? null;
  const slicesCount = items.length;
  useEffect(() => {
    if (!isSpinning || slicesCount === 0 || startedAt == null) return;
    const { targetIndex, spins, duration } = spinState;
    if (targetIndex >= slicesCount) return;

    const slice = (Math.PI * 2) / slicesCount;
    const targetAngle =
      spins * Math.PI * 2 + (Math.PI * 2 - (targetIndex * slice + slice / 2));

    let rafId;
    function frame() {
      const elapsed = Date.now() - startedAt;
      const t = Math.min(1, Math.max(0, elapsed / duration));
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = targetAngle * eased;
      angleRef.current = cur;
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) drawWheel(ctx, itemsRef.current, cur);
      if (t < 1) rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, slicesCount, isSpinning]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: CSS_SIZE, maxWidth: '80vw' }}>
        <canvas ref={canvasRef} className="block w-full h-auto" />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1"
          aria-hidden
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '14px solid transparent',
              borderRight: '14px solid transparent',
              borderTop: '24px solid #f8fafc',
              filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.6))',
            }}
          />
        </div>
      </div>
      {!isStatic && (
        <button
          onClick={onSpinClick}
          disabled={disabled || isSpinning || items.length === 0}
          className="px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 font-bold text-lg"
        >
          {isSpinning ? 'Spinning…' : 'SPIN'}
        </button>
      )}
    </div>
  );
}

function drawWheel(ctx, items, angle) {
  if (!ctx || items.length === 0) return;
  const size = CSS_SIZE;
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 6;
  const slice = (Math.PI * 2) / items.length;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle - Math.PI / 2);

  for (let i = 0; i < items.length; i++) {
    const start = i * slice;
    const end = start + slice;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();
    ctx.strokeStyle = 'rgba(15,23,42,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.rotate(start + slice / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(truncate(items[i].name, 18), radius - 12, 4);
    ctx.restore();
  }

  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, 28, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function truncate(text, max) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

export function angleForIndex(index, total) {
  if (total <= 0) return 0;
  const slice = (Math.PI * 2) / total;
  return Math.PI * 2 - (index * slice + slice / 2);
}
