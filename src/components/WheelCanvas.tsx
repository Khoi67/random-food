import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Dish, WeightedSlice } from '../types/index.js';
import { computeWeightedSlices, pickWeightedWinner } from '../utils/randomLogic.js';
import { playTickSound } from '../utils/audio.js';

interface WheelCanvasProps {
  dishes: Dish[];
  isFavoriteFn: (id: string) => boolean;
  onSpinStart?: () => void;
  onWinner: (dish: Dish) => void;
}

// 6 Warm, Harmonious, Delicious Food Colors
const PALETTE = [
  '#ea580c', // Bright Orange
  '#f59e0b', // Amber
  '#d97706', // Warm Gold
  '#dc2626', // Vivid Rose / Red
  '#e11d48', // Crimson Berry
  '#059669', // Fresh Mint / Herb Green
];

// Calculate contrast text color (WCAG AA)
function getContrastTextColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // YIQ luminance
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 135 ? '#0f172a' : '#ffffff';
}

export const WheelCanvas: React.FC<WheelCanvasProps> = ({
  dishes,
  isFavoriteFn,
  onSpinStart,
  onWinner,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const rotationAngleRef = useRef(0);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTickSliceIndexRef = useRef<number>(-1);

  // Compute slices
  const slices: WeightedSlice[] = React.useMemo(() => {
    return computeWeightedSlices(dishes, isFavoriteFn);
  }, [dishes, isFavoriteFn]);

  // Draw wheel on canvas
  const draw = useCallback(
    (currentAngle: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const size = canvas.width / dpr;
      const center = size / 2;
      const radius = center - 8;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      if (slices.length === 0) {
        // Empty state wheel
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#334155';
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 14px "Be Vietnam Pro", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Không có món ăn phù hợp', center, center);
        ctx.restore();
        return;
      }

      ctx.translate(center, center);
      ctx.rotate(currentAngle);

      // Draw slices
      slices.forEach((slice, i) => {
        const bg = PALETTE[i % PALETTE.length];
        const textColor = getContrastTextColor(bg);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, slice.startAngle, slice.endAngle);
        ctx.closePath();
        ctx.fillStyle = bg;
        ctx.fill();

        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#0f172a';
        ctx.stroke();

        // Draw Favorite Glow Indicator if 2x
        if (slice.isFav) {
          ctx.beginPath();
          ctx.arc(0, 0, radius, slice.startAngle, slice.endAngle);
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 4;
          ctx.stroke();
        }

        // Draw text along slice center
        ctx.save();
        ctx.rotate(slice.centerAngle);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = textColor;

        // Display dish name or shortName
        const displayName = slice.dish.shortName || slice.dish.name;

        // Dynamic font sizing based on slice count
        let baseFontSize = 12;
        if (slices.length > 22) baseFontSize = 9.5;
        else if (slices.length > 16) baseFontSize = 10.5;
        else if (slices.length > 10) baseFontSize = 11.5;
        else if (slices.length <= 6) baseFontSize = 13.5;

        // Available radial space from center button to outer edge
        const centerBtnRadius = 38;
        const maxRadialLength = radius - centerBtnRadius - 14;
        const textX = radius - 12;

        // Auto-scale font size if text is long to prevent text overflow
        ctx.font = `bold ${baseFontSize}px "Be Vietnam Pro", sans-serif`;
        let textWidth = ctx.measureText(displayName).width;
        let finalFontSize = baseFontSize;

        if (textWidth > maxRadialLength) {
          finalFontSize = Math.max(8.5, baseFontSize * (maxRadialLength / textWidth));
          ctx.font = `bold ${finalFontSize}px "Be Vietnam Pro", sans-serif`;
          textWidth = ctx.measureText(displayName).width;
        }

        let renderText = displayName;
        if (textWidth > maxRadialLength) {
          // If still slightly long, truncate gracefully with ellipsis
          let truncated = displayName;
          while (truncated.length > 4 && ctx.measureText(truncated + '…').width > maxRadialLength) {
            truncated = truncated.slice(0, -1);
          }
          renderText = truncated + '…';
        }

        ctx.fillText(renderText, textX, 0);
        ctx.restore();
      });

      // Outer ring border
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, 2 * Math.PI);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#f97316';
      ctx.stroke();

      ctx.restore();
    },
    [slices]
  );

  // Resize canvas according to container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const size = Math.min(parent.clientWidth - 16, 380);
      const dpr = window.devicePixelRatio || 1;

      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;

      draw(rotationAngleRef.current);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  // Redraw when slices change
  useEffect(() => {
    draw(rotationAngleRef.current);
  }, [slices, draw]);

  // Spin Wheel function
  const spin = () => {
    if (isSpinning || slices.length === 0) return;

    const winner = pickWeightedWinner(slices);
    if (!winner) return;

    setIsSpinning(true);
    if (onSpinStart) onSpinStart();

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = prefersReducedMotion ? 1200 : 4200;

    // The pointer is at TOP (3 * Math.PI / 2 radians, or -Math.PI / 2)
    // We want the winner's centerAngle + finalAngle === 3 * Math.PI / 2 (mod 2PI)
    const pointerAngle = (3 * Math.PI) / 2;
    const extraRounds = prefersReducedMotion ? 2 : 6 + Math.floor(Math.random() * 3);
    const targetDelta = pointerAngle - winner.centerAngle;

    const currentNormalized = rotationAngleRef.current % (2 * Math.PI);
    let totalTargetAngle = rotationAngleRef.current + extraRounds * 2 * Math.PI + (targetDelta - currentNormalized);
    while (totalTargetAngle < rotationAngleRef.current + extraRounds * 2 * Math.PI) {
      totalTargetAngle += 2 * Math.PI;
    }

    const startAngle = rotationAngleRef.current;
    const deltaAngle = totalTargetAngle - startAngle;
    const startTime = performance.now();

    // Cubic ease out function
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);

      const newAngle = startAngle + deltaAngle * eased;
      rotationAngleRef.current = newAngle;
      draw(newAngle);

      // Tick sound when crossing slice boundary
      const currentPointerOffset = (pointerAngle - newAngle) % (2 * Math.PI);
      const normalizedOffset = currentPointerOffset < 0 ? currentPointerOffset + 2 * Math.PI : currentPointerOffset;
      const activeSlice = slices.find(
        (s) => normalizedOffset >= s.startAngle && normalizedOffset < s.endAngle
      );

      if (activeSlice && activeSlice.index !== lastTickSliceIndexRef.current) {
        lastTickSliceIndexRef.current = activeSlice.index;
        playTickSound();
      }

      if (progress < 1) {
        animFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        onWinner(winner.dish);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      {/* Canvas Container */}
      <div className="relative w-full max-w-[380px] aspect-square flex items-center justify-center p-1 sm:p-2">
        {/* Top Pointer Indicator */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 pointer-events-none drop-shadow-[0_4px_10px_rgba(234,88,12,0.8)]">
          <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[32px] border-t-amber-400" />
        </div>

        {/* The Wheel Canvas */}
        <div className="rounded-full p-2 bg-gradient-to-b from-slate-800 to-slate-950 shadow-2xl border-2 border-slate-800 flex items-center justify-center">
          <canvas ref={canvasRef} className="rounded-full shadow-inner" />
        </div>

        {/* Center Spin Button */}
        <button
          onClick={spin}
          disabled={isSpinning || slices.length === 0}
          aria-label="Quay vòng may mắn"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-brand-600 via-orange-500 to-amber-400 text-white font-black text-xs sm:text-sm shadow-2xl border-4 border-slate-900 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center leading-tight tracking-wider"
        >
          <span>QUAY</span>
          <span className="text-[9px] font-semibold text-amber-100">NGAY</span>
        </button>
      </div>

      {/* Main Big Spin Button */}
      <div className="mt-4 w-full max-w-sm px-4">
        <button
          onClick={spin}
          disabled={isSpinning || slices.length === 0}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-500 via-orange-500 to-amber-500 hover:from-brand-600 hover:to-amber-600 text-white font-black text-base shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span className="text-xl">🎲</span>
          <span>{isSpinning ? 'ĐANG QUAY...' : 'QUAY NGAY HÔM NAY!'}</span>
        </button>
        <p className="text-[11px] text-center text-slate-400 mt-2">
          {slices.some((s) => s.isFav)
            ? '❤️ Món yêu thích có xác suất trúng gấp đôi (2x)!'
            : 'Mẹo: Bấm ❤️ ở danh sách để nhân đôi xác suất trúng món yêu thích.'}
        </p>
      </div>
    </div>
  );
};
