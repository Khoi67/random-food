import { SLICE_COLORS } from '../utils/constants.js';
import { playTickSound, playWinSound } from '../utils/audio.js';
import { launchConfetti, showToast } from '../utils/helpers.js';

let wheelCanvas = null;
let ctx = null;
let currentRotation = 0;
let isSpinning = false;

export function initWheelCanvas(canvasEl) {
  wheelCanvas = canvasEl;
  ctx = wheelCanvas.getContext('2d');
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

  const sliceAngle = (2 * Math.PI) / numSlices;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(currentRotation);

  // 1. Vẽ các lát cắt
  for (let i = 0; i < numSlices; i++) {
    const startAngle = i * sliceAngle;
    const endAngle = startAngle + sliceAngle;
    const color = SLICE_COLORS[i % SLICE_COLORS.length];

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 2. Vẽ chữ tên món ăn
    ctx.save();
    ctx.rotate(startAngle + sliceAngle / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';

    let fontSize = Math.max(11, Math.min(15, Math.floor(300 / (numSlices + 6))));
    ctx.font = `bold ${fontSize}px "Be Vietnam Pro", sans-serif`;

    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    let name = activeList[i].name;
    const maxTextWidth = radius - 75;
    if (ctx.measureText(name).width > maxTextWidth) {
      while (name.length > 3 && ctx.measureText(name + '...').width > maxTextWidth) {
        name = name.slice(0, -1);
      }
      name += '...';
    }

    ctx.fillText(name, radius - 20, 0);
    ctx.restore();
  }

  ctx.restore();

  // 3. Vành ngoài ánh kim & bóng đèn LED
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

  const activeList = getActiveDishes();
  if (activeList.length < 2) {
    showToast("Cần ít nhất 2 món ăn trong bữa này để bắt đầu quay!", "warning");
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

  const winningIndex = Math.floor(Math.random() * activeList.length);
  const winningDish = activeList[winningIndex];

  const numSlices = activeList.length;
  const sliceAngle = (2 * Math.PI) / numSlices;

  const pointerAngle = 1.5 * Math.PI; // Kim ở đỉnh 12h
  const sliceCenterInWheel = winningIndex * sliceAngle + (sliceAngle / 2);

  const fullRotations = 6 + Math.floor(Math.random() * 3);

  const startAngle = currentRotation % (2 * Math.PI);
  let targetDelta = (pointerAngle - sliceCenterInWheel - startAngle);
  while (targetDelta < 0) {
    targetDelta += 2 * Math.PI;
  }
  const totalDistance = fullRotations * 2 * Math.PI + targetDelta;
  const finalAngle = currentRotation + totalDistance;

  const duration = 3800;
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
    const currentSliceUnderPointer = Math.floor(
      ((pointerAngle - normalizedAngle + 2 * Math.PI) % (2 * Math.PI)) / sliceAngle
    );
    if (currentSliceUnderPointer !== lastSlicePassed) {
      playTickSound();
      lastSlicePassed = currentSliceUnderPointer;
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
        wheelStatusMessage.textContent = `Vũ trụ đã chọn món: ${winningDish.name}!`;
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
