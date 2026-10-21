import { SLICE_COLORS } from '../utils/constants.js';
import { playTickSound, playWinSound } from '../utils/audio.js';
import { launchConfetti, showToast } from '../utils/helpers.js';
import { isFavoriteDish } from '../services/history.js';

let wheelCanvas = null;
let ctx = null;
let currentRotation = 0;
let isSpinning = false;
let currentActiveList = [];
let currentSlicesInfo = [];
let tooltipEl = null;

/**
 * Tính toán độ tương phản chuẩn WCAG AA (tối thiểu 4.5:1)
 * Trả về màu chữ #ffffff hoặc #0f172a
 */
export function getContrastTextColor(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const r = parseInt(c.substr(0, 2), 16) / 255;
  const g = parseInt(c.substr(2, 2), 16) / 255;
  const b = parseInt(c.substr(4, 2), 16) / 255;

  const toLinear = (val) => val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  const contrastWithWhite = 1.05 / (L + 0.05);
  return contrastWithWhite >= 4.5 ? '#ffffff' : '#0f172a';
}

/**
 * Chia tên món dài thành 2 dòng hợp lý
 */
function splitTextIntoLines(text, maxChars = 14) {
  if (text.length <= maxChars) return [text];
  const words = text.split(' ');
  if (words.length <= 1) return [text];

  const mid = Math.ceil(words.length / 2);
  const line1 = words.slice(0, mid).join(' ');
  const line2 = words.slice(mid).join(' ');
  return [line1, line2];
}

/**
 * Tính toán lát cắt có trọng số (Requirement 3.2: Món Yêu thích có trọng số 2x)
 */
export function computeSlicesInfo(activeList) {
  if (!activeList || activeList.length === 0) return [];

  const weights = activeList.map(dish => isFavoriteDish(dish.id) ? 2 : 1);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  let accumulatedAngle = 0;
  return activeList.map((dish, i) => {
    const weight = weights[i];
    const span = (weight / totalWeight) * (2 * Math.PI);
    const startAngle = accumulatedAngle;
    const endAngle = accumulatedAngle + span;
    const centerAngle = startAngle + (span / 2);
    accumulatedAngle = endAngle;
    return {
      dish,
      index: i,
      weight,
      isFav: weight > 1,
      startAngle,
      endAngle,
      centerAngle,
      span
    };
  });
}

export function initWheelCanvas(canvasEl) {
  wheelCanvas = canvasEl;
  ctx = wheelCanvas.getContext('2d');
  initWheelTooltip();
}

function initWheelTooltip() {
  if (!wheelCanvas) return;
  
  // Tạo hoặc lấy tooltip DOM element
  tooltipEl = document.getElementById('wheelCanvasTooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'wheelCanvasTooltip';
    tooltipEl.className = 'pointer-events-none fixed z-50 px-3 py-1.5 rounded-xl bg-slate-900/95 border border-amber-500/40 text-white text-xs font-bold shadow-xl transition-opacity duration-150 opacity-0 backdrop-blur-sm flex flex-col items-center';
    document.body.appendChild(tooltipEl);
  }

  const handlePointer = (e) => {
    if (isSpinning || !currentSlicesInfo || currentSlicesInfo.length === 0) {
      hideTooltip();
      return;
    }

    const rect = wheelCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left - (rect.width / 2);
    const y = e.clientY - rect.top - (rect.height / 2);
    const dist = Math.sqrt(x * x + y * y);
    const radius = rect.width / 2;

    if (dist > radius - 10 || dist < 30) {
      hideTooltip();
      return;
    }

    // Tính góc chuột
    let angle = Math.atan2(y, x);
    if (angle < 0) angle += 2 * Math.PI;

    // Chuẩn hóa theo góc xoay hiện tại
    const normalizedRotation = (currentRotation % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const relativeAngle = (angle - normalizedRotation + 2 * Math.PI) % (2 * Math.PI);

    const slice = currentSlicesInfo.find(s => relativeAngle >= s.startAngle && relativeAngle < s.endAngle);
    if (slice) {
      const dish = slice.dish;
      const locCount = Array.isArray(dish.locations) ? dish.locations.length : 0;
      const favBadge = slice.isFav ? '<span class="text-rose-400 font-bold ml-1">❤️ Món Yêu Thích (2x xác suất)</span>' : '';
      tooltipEl.innerHTML = `
        <div class="flex items-center gap-1">
          <span class="text-white font-extrabold text-sm">${dish.name}</span>
          ${favBadge}
        </div>
        <span class="text-[11px] text-amber-300 font-medium">📍 ${locCount} quán gợi ý tại TP.HCM</span>
      `;
      tooltipEl.style.left = `${e.clientX}px`;
      tooltipEl.style.top = `${e.clientY - 45}px`;
      tooltipEl.style.transform = 'translate(-50%, -100%)';
      tooltipEl.classList.remove('opacity-0');
      tooltipEl.classList.add('opacity-100');
    } else {
      hideTooltip();
    }
  };

  wheelCanvas.addEventListener('mousemove', handlePointer);
  wheelCanvas.addEventListener('mouseleave', hideTooltip);
  wheelCanvas.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) handlePointer(e.touches[0]);
  }, { passive: true });
}

function hideTooltip() {
  if (tooltipEl) {
    tooltipEl.classList.remove('opacity-100');
    tooltipEl.classList.add('opacity-0');
  }
}

export function getCurrentRotation() {
  return currentRotation;
}

export function setCurrentRotation(val) {
  currentRotation = val;
}

export function getIsSpinning() {
  return isSpinning;
}

export function resizeCanvasForHiDPI() {
  if (!wheelCanvas || !ctx) return 400;
  const rect = wheelCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const size = Math.min(rect.width, rect.height) || 400;

  wheelCanvas.width = size * dpr;
  wheelCanvas.height = size * dpr;
  ctx.scale(dpr, dpr);
  return size;
}

export function drawEmptyWheel(centerX, centerY, radius, message) {
  if (!ctx) return;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fillStyle = '#1e293b';
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 15px "Be Vietnam Pro", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, centerX, centerY - 15);
  ctx.font = '12px "Be Vietnam Pro", sans-serif';
  ctx.fillText("Thêm ít nhất 2 món để quay", centerX, centerY + 15);
}

export function drawWheel(activeList) {
  if (!wheelCanvas || !ctx) return;
  currentActiveList = activeList || [];
  const size = resizeCanvasForHiDPI();
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 14;

  ctx.clearRect(0, 0, size, size);

  const numSlices = activeList ? activeList.length : 0;

  if (numSlices === 0) {
    drawEmptyWheel(centerX, centerY, radius, "Chưa có món ăn nào!");
    return;
  }

  // Tính toán các lát cắt có trọng số
  const slicesInfo = computeSlicesInfo(activeList);
  currentSlicesInfo = slicesInfo;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(currentRotation);

  // 1. Vẽ các lát cắt với 6 màu ấm hài hòa
  for (let i = 0; i < slicesInfo.length; i++) {
    const slice = slicesInfo[i];
    const color = SLICE_COLORS[i % SLICE_COLORS.length];

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, slice.startAngle, slice.endAngle);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 2. Vẽ chữ tên món ăn với độ tương phản WCAG AA & xuống 2 dòng nếu dài
    ctx.save();
    ctx.rotate(slice.centerAngle);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // Tự động chọn màu chữ đạt WCAG AA (>= 4.5:1)
    const textColor = getContrastTextColor(color);
    ctx.fillStyle = textColor;

    // Đổ bóng chữ tinh tế chống chói
    ctx.shadowColor = textColor === '#ffffff' ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.7)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // Hỗ trợ trường shortName hoặc rút gọn/chia 2 dòng
    const dish = slice.dish;
    let rawName = dish.shortName || dish.name;
    if (slice.isFav) {
      rawName = `❤️ ${rawName}`;
    }

    // Co giãn font chữ theo số lượng lát và độ dài
    let baseFontSize = Math.max(10, Math.min(14, Math.floor(280 / (numSlices + 6))));
    if (slice.isFav) baseFontSize = Math.min(15, baseFontSize + 1);
    const maxTextWidth = radius - 75;

    // Tách 2 dòng nếu tên dài
    const lines = splitTextIntoLines(rawName, 13);
    
    if (lines.length === 2 && numSlices <= 18) {
      const lineFontSize = Math.max(9, baseFontSize - 1.5);
      ctx.font = `bold ${lineFontSize}px "Be Vietnam Pro", sans-serif`;
      
      let line1 = lines[0];
      let line2 = lines[1];
      if (ctx.measureText(line1).width > maxTextWidth) line1 = line1.slice(0, 10) + '...';
      if (ctx.measureText(line2).width > maxTextWidth) line2 = line2.slice(0, 10) + '...';

      ctx.fillText(line1, radius - 20, -lineFontSize * 0.65);
      ctx.fillText(line2, radius - 20, lineFontSize * 0.65);
    } else {
      ctx.font = `bold ${baseFontSize}px "Be Vietnam Pro", sans-serif`;
      let displayName = rawName;
      if (ctx.measureText(displayName).width > maxTextWidth) {
        while (displayName.length > 3 && ctx.measureText(displayName + '...').width > maxTextWidth) {
          displayName = displayName.slice(0, -1);
        }
        displayName += '...';
      }
      ctx.fillText(displayName, radius - 20, 0);
    }

    ctx.restore();
  }

  ctx.restore();

  // 3. Vành ngoài ánh kim & bóng đèn LED ấm áp
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 2, 0, 2 * Math.PI);
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#334155';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 7, 0, 2 * Math.PI);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#f97316';
  ctx.stroke();

  const numBulbs = Math.max(16, numSlices * 2);
  for (let b = 0; b < numBulbs; b++) {
    const bAngle = (b * (2 * Math.PI)) / numBulbs;
    const bx = centerX + (radius + 2) * Math.cos(bAngle);
    const by = centerY + (radius + 2) * Math.sin(bAngle);

    ctx.beginPath();
    ctx.arc(bx, by, 3, 0, 2 * Math.PI);
    ctx.fillStyle = (b % 2 === 0) ? '#fef08a' : '#ffffff';
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 6;
    ctx.fill();
  }
  ctx.restore();
}

function easeOutQuart(x) {
  return 1 - Math.pow(1 - x, 4);
}

export function spinWheel({
  getActiveDishes,
  mainSpinBtn,
  centerSpinBtn,
  wheelStatusMessage,
  onResult
}) {
  if (isSpinning) return;
  hideTooltip();

  const activeList = getActiveDishes();
  if (activeList.length < 2) {
    showToast("Cần ít nhất 2 món ăn phù hợp với bộ lọc hiện tại để bắt đầu quay!", "warning");
    return;
  }

  isSpinning = true;
  if (mainSpinBtn) {
    mainSpinBtn.disabled = true;
    mainSpinBtn.classList.add('opacity-60', 'cursor-not-allowed');
  }
  if (centerSpinBtn) centerSpinBtn.disabled = true;

  if (wheelStatusMessage) {
    wheelStatusMessage.textContent = "Đang quay may mắn... Vũ trụ đang chọn món ngon Sài Gòn!";
    wheelStatusMessage.classList.add('text-brand-400');
  }

  // Tính toán lát cắt có trọng số
  const slicesInfo = computeSlicesInfo(activeList);
  currentSlicesInfo = slicesInfo;

  // Chọn món trúng thưởng theo trọng số (Món yêu thích có xác suất 2x)
  const totalWeight = slicesInfo.reduce((sum, s) => sum + s.weight, 0);
  const randVal = Math.random() * totalWeight;
  let runningWeight = 0;
  let winningSlice = slicesInfo[0];
  for (let i = 0; i < slicesInfo.length; i++) {
    runningWeight += slicesInfo[i].weight;
    if (randVal <= runningWeight) {
      winningSlice = slicesInfo[i];
      break;
    }
  }

  const winningDish = winningSlice.dish;
  const pointerAngle = 1.5 * Math.PI; // Kim ở đỉnh 12h
  const sliceCenterInWheel = winningSlice.centerAngle;

  // Tôn trọng prefers-reduced-motion (Requirement 3)
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fullRotations = prefersReducedMotion ? 1 : (6 + Math.floor(Math.random() * 3));
  const duration = prefersReducedMotion ? 400 : 3800;

  const startAngle = currentRotation % (2 * Math.PI);
  let targetDelta = (pointerAngle - sliceCenterInWheel - startAngle);
  while (targetDelta < 0) {
    targetDelta += 2 * Math.PI;
  }
  const totalDistance = fullRotations * 2 * Math.PI + targetDelta;
  const finalAngle = currentRotation + totalDistance;

  const startTime = performance.now();
  const initialRotation = currentRotation;

  let lastSlicePassed = -1;

  function animateSpin(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = easeOutQuart(progress);

    currentRotation = initialRotation + totalDistance * ease;
    drawWheel(activeList);

    const normalizedAngle = (currentRotation % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const pointerInWheel = (pointerAngle - normalizedAngle + 2 * Math.PI) % (2 * Math.PI);
    const sliceUnderPointer = currentSlicesInfo.find(
      s => pointerInWheel >= s.startAngle && pointerInWheel < s.endAngle
    );
    const currentSliceIdx = sliceUnderPointer ? sliceUnderPointer.index : -1;
    if (currentSliceIdx !== lastSlicePassed) {
      playTickSound();
      lastSlicePassed = currentSliceIdx;
    }

    if (progress < 1) {
      requestAnimationFrame(animateSpin);
    } else {
      currentRotation = finalAngle;
      drawWheel(activeList);
      isSpinning = false;
      if (mainSpinBtn) {
        mainSpinBtn.disabled = false;
        mainSpinBtn.classList.remove('opacity-60', 'cursor-not-allowed');
      }
      if (centerSpinBtn) centerSpinBtn.disabled = false;

      if (wheelStatusMessage) {
        const favText = winningSlice.isFav ? ' (Món Yêu Thích ❤️)' : '';
        wheelStatusMessage.textContent = `Vũ trụ đã chọn món: ${winningDish.name}${favText}!`;
      }

      playWinSound();
      launchConfetti();
      setTimeout(() => {
        if (onResult) onResult(winningDish);
      }, 350);
    }
  }

  requestAnimationFrame(animateSpin);
}
