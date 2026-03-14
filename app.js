/* =========================================
   FINCALC – Shared Utilities
   ========================================= */

function toggleMenu() {
  const m = document.getElementById('mobileMenu');
  m.classList.toggle('open');
}

// Format number to INR
function fmt(n) {
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(2) + ' L';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function fmtFull(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

// Animate number count-up
function animateCount(el, target, prefix='₹') {
  const duration = 700;
  const start = Date.now();
  const from = parseFloat(el.dataset.current || 0);
  el.dataset.current = target;
  function step() {
    const p = Math.min((Date.now() - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    const cur = from + (target - from) * ease;
    el.textContent = fmt(cur);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── ANIMATED DONUT CHART ────────────────────────────────────────────────────
// State: track previous values per canvas for smooth animation
const _donutState = {};

function drawDonut(canvasId, invested, returns, colors=['#00c853','#e8f5e9'], centerLabel='Total Value') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const total = invested + returns;
  if (total <= 0) return;

  // Target proportions
  const targetInvPct  = invested / total;
  const targetRetPct  = returns  / total;

  // Previous state (for smooth animation)
  const prev = _donutState[canvasId] || { invPct: targetInvPct, retPct: targetRetPct, val: total };
  _donutState[canvasId] = { invPct: targetInvPct, retPct: targetRetPct, val: total };

  const DURATION = 600; // ms
  const startTime = performance.now();
  const fromInv = prev.invPct;
  const fromRet = prev.retPct;
  const fromVal = prev.val;

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function frame(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / DURATION, 1);
    const e = easeOutCubic(t);

    const curInv = fromInv + (targetInvPct - fromInv) * e;
    const curRet = fromRet + (targetRetPct - fromRet) * e;
    const curVal = fromVal + (total - fromVal) * e;

    _render(canvas, curInv, curRet, curVal, colors, centerLabel);

    if (t < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function _render(canvas, invPct, retPct, curVal, colors, centerLabel) {
  // Use device pixel ratio for crisp rendering on retina
  const dpr    = window.devicePixelRatio || 1;
  const size   = canvas.clientWidth || parseInt(canvas.getAttribute('width')) || 180;
  canvas.width  = size * dpr;
  canvas.height = size * dpr;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(dpr, dpr);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 8;
  const innerR = outerR * 0.68;  // wider hole → more room for center text
  const gapAngle = 0.03;         // small gap between segments (radians)

  // ── Draw segments ─────────────────────────────────────────
  const segments = [
    { pct: invPct, color: colors[1] || '#e8f5e9', shadow: false },
    { pct: retPct, color: colors[0] || '#00c853', shadow: true  },
  ];

  let startAngle = -Math.PI / 2;

  segments.forEach(({ pct, color, shadow }) => {
    const sweep = pct * Math.PI * 2 - gapAngle;
    if (sweep <= 0) return;

    if (shadow) {
      ctx.shadowColor = 'rgba(0,200,83,0.25)';
      ctx.shadowBlur  = 10;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur  = 0;
    }

    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startAngle, startAngle + sweep);
    ctx.arc(cx, cy, innerR, startAngle + sweep, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    startAngle += pct * Math.PI * 2;
  });

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur  = 0;

  // ── Center white circle ───────────────────────────────────
  ctx.beginPath();
  ctx.arc(cx, cy, innerR - 1, 0, Math.PI * 2);
  // Use bg-white from CSS variable so it works in dark mode
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  ctx.fillStyle = isDark ? '#1a1f2e' : '#ffffff';
  ctx.fill();

  // ── Center text ───────────────────────────────────────────
  const valueStr = _fmtCenter(curVal);
  const parts    = valueStr.split('\n');  // e.g. ['₹11.61', 'Lakh']

  // Primary value line
  const textPrimary = isDark ? '#e8edf2' : '#1a1a2e';
  const textMuted   = isDark ? '#5a6a7a' : '#8a9ab0';
  const textGreen   = isDark ? '#00e676' : '#00a152';

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  if (parts.length === 1) {
    ctx.font      = `700 ${Math.round(size * 0.11)}px DM Sans, DM Mono, sans-serif`;
    ctx.fillStyle = textPrimary;
    ctx.fillText(parts[0], cx, cy - 4);
  } else {
    ctx.font      = `700 ${Math.round(size * 0.11)}px DM Sans, DM Mono, sans-serif`;
    ctx.fillStyle = textPrimary;
    ctx.fillText(parts[0], cx, cy - 11);

    ctx.font      = `600 ${Math.round(size * 0.075)}px DM Sans, sans-serif`;
    ctx.fillStyle = textGreen;
    ctx.fillText(parts[1], cx, cy + size * 0.065);
  }

  ctx.font      = `400 ${Math.round(size * 0.065)}px DM Sans, sans-serif`;
  ctx.fillStyle = textMuted;
  ctx.fillText(centerLabel, cx, cy + size * 0.155);
}

function _fmtCenter(n) {
  if (n >= 1e7)  return '₹' + (n / 1e7).toFixed(2) + '\nCr';
  if (n >= 1e5)  return '₹' + (n / 1e5).toFixed(2) + '\nL';
  if (n >= 1000) return '₹' + Math.round(n / 1000) + '\nK';
  return '₹' + Math.round(n);
}

// Update slider fill
function updateSlider(input) {
  const min = parseFloat(input.min), max = parseFloat(input.max), val = parseFloat(input.value);
  const pct = (val - min) / (max - min) * 100;
  input.style.background = `linear-gradient(to right, var(--green) ${pct}%, var(--border) ${pct}%)`;
}

document.querySelectorAll('input[type=range]').forEach(r => {
  updateSlider(r);
  r.addEventListener('input', () => updateSlider(r));
});

// FAQ accordion toggle
function toggleFaq(el) {
  const item = el.closest('.faq-item');
  const isOpen = item.classList.contains('open');
  // Close all
  document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
  // Open clicked if it was closed
  if (!isOpen) item.classList.add('open');
}

// ── SHARE FUNCTIONS ──────────────────────────────────────────────────────────
function shareWhatsApp(text) {
  const url = encodeURIComponent(window.location.href);
  const msg = encodeURIComponent(text + '\n\n' + window.location.href);
  window.open('https://wa.me/?text=' + msg, '_blank');
}

function shareTwitter(text) {
  const msg = encodeURIComponent(text);
  const url = encodeURIComponent(window.location.href);
  window.open('https://twitter.com/intent/tweet?text=' + msg + '&url=' + url, '_blank');
}

function copyLink(btn) {
  navigator.clipboard.writeText(window.location.href).then(() => {
    btn.classList.add('copied');
    const original = btn.innerHTML;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = original;
    }, 2000);
  }).catch(() => {
    // Fallback for older browsers
    const el = document.createElement('textarea');
    el.value = window.location.href;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    btn.classList.add('copied');
    const original = btn.innerHTML;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!';
    setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = original; }, 2000);
  });
}

function downloadPDF(title) {
  // Use browser print dialog with print-specific CSS
  const style = document.createElement('style');
  style.id = '__pdf_style';
  style.textContent = `
    @media print {
      .navbar, .share-bar, .seo-section, .preset-row,
      .year-table-wrap, footer, .breadcrumb { display:none !important; }
      .calc-page { padding: 0 !important; }
      .calc-layout { grid-template-columns: 1fr 1fr !important; }
      .result-panel, .input-panel { break-inside: avoid; }
      body { font-size: 13px; }
      .result-highlight { background: #00a152 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }`;
  document.head.appendChild(style);
  document.title = title + ' | InvestSmartCalc';
  window.print();
  setTimeout(() => {
    document.head.removeChild(style);
  }, 1000);
}

// ── DARK MODE ────────────────────────────────────────────────────────────────
// Runs immediately (before DOMContentLoaded) to prevent flash of wrong theme
(function() {
  const saved = localStorage.getItem('isc-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved === 'dark' || (!saved && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();

function toggleDarkMode() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('isc-theme', next);
  // Update all toggle buttons on page (navbar + footer)
  document.querySelectorAll('.toggle-icon').forEach(el => {
    el.textContent = next === 'dark' ? '🌙' : '☀️';
  });
}
