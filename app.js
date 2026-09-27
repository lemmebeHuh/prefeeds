/**
 * InstaView — Instagram Post Preview Tool
 * Main application logic
 */

(function () {
  'use strict';

  /* ─── State ─── */
  const state = {
    slides: [],        // { src: string, file: File }[]
    currentSlide: 0,
    ratio: '1:1',
    liked: false,
    avatarSrc: null,
    // Strip slicer
    slicerImage: null,     // HTMLImageElement
    slicerSrc: null,       // data URL
    slicerSlideCount: 2,

    // Scrapbook Builder
    sbItems: [],           // Array of { id, img, x, y, width, height, aspect }
    sbSelectedId: null,
    sbBaseHeight: 1080,    // Standard IG height
  };

  /* ─── DOM References ─── */
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const els = {
    hero: $('#hero'),
    app: $('#app'),
    btnGetStarted: $('#btn-get-started'),
    btnBackHero: $('#btn-back-hero'),
    btnThemeToggle: $('#btn-theme-toggle'),
    btnThemeToggleApp: $('#btn-theme-toggle-app'),
    btnExport: $('#btn-export'),

    // Upload
    dropZone: $('#drop-zone'),
    fileInput: $('#file-input'),

    // Avatar
    avatarUpload: $('#avatar-upload'),
    avatarInput: $('#avatar-input'),
    avatarPreview: $('#avatar-preview'),
    avatarPlaceholder: $('#avatar-placeholder'),

    // Inputs
    inputUsername: $('#input-username'),
    inputLocation: $('#input-location'),
    inputCaption: $('#input-caption'),
    inputLikes: $('#input-likes'),
    inputComments: $('#input-comments'),
    inputTime: $('#input-time'),
    charCount: $('#char-count'),

    // Carousel sidebar
    carouselSection: $('#carousel-section'),
    carouselThumbs: $('#carousel-thumbs'),
    slideCount: $('#slide-count'),
    btnAddMore: $('#btn-add-more'),

    // Ratio
    ratioBtns: $$('.ratio-btn'),

    // IG Preview
    igUsername: $('#ig-username'),
    igLocation: $('#ig-location'),
    igAvatarImg: $('#ig-avatar-img'),
    igAvatarFallback: $('#ig-avatar-fallback'),
    igImageContainer: $('#ig-image-container'),
    igEmptyState: $('#ig-empty-state'),
    igCarouselTrack: $('#ig-carousel-track'),
    igPrev: $('#ig-prev'),
    igNext: $('#ig-next'),
    igDots: $('#ig-dots'),
    igCounter: $('#ig-counter'),
    igCounterText: $('#ig-counter-text'),
    igLikeBtn: $('#ig-like-btn'),
    igLikesText: $('#ig-likes-text'),
    igCaptionUser: $('#ig-caption-user'),
    igCaptionText: $('#ig-caption-text'),
    igCommentsText: $('#ig-comments-text'),
    igTime: $('#ig-time'),
    igCaption: $('#ig-caption'),
    igCommentsSection: $('#ig-comments-section'),
    igLikes: $('#ig-likes'),

    // Strip Slicer
    btnStripSlicer: $('#btn-strip-slicer'),
    slicerOverlay: $('#slicer-overlay'),
    slicerClose: $('#slicer-close'),
    slicerUpload: $('#slicer-upload'),
    slicerFileInput: $('#slicer-file-input'),
    slicerPreview: $('#slicer-preview'),
    slicerImgDimensions: $('#slicer-img-dimensions'),
    slicerImgRatio: $('#slicer-img-ratio'),
    slicerChangeImg: $('#slicer-change-img'),
    slicerCanvas: $('#slicer-canvas'),
    slicerLabels: $('#slicer-labels'),
    slicerSlideCount: $('#slicer-slide-count'),
    slicerMinus: $('#slicer-minus'),
    slicerPlus: $('#slicer-plus'),
    slicerPerSlide: $('#slicer-per-slide'),
    slicerPerRatio: $('#slicer-per-ratio'),
    slicerSuggestions: $('#slicer-suggestions'),
    slicerCancel: $('#slicer-cancel'),
    slicerApply: $('#slicer-apply'),

    // Scrapbook Builder
    btnScrapbook: $('#btn-scrapbook'),
    sbOverlay: $('#scrapbook-overlay'),
    sbClose: $('#scrapbook-close'),
    sbCancel: $('#scrapbook-cancel'),
    sbApply: $('#scrapbook-apply'),
    sbAddImgBtn: $('#btn-sb-add-img'),
    sbAddImgInput: $('#scrapbook-add-img'),
    sbClear: $('#btn-sb-clear'),
    sbSlideCount: $('#sb-slide-count'),
    sbRatio: $('#sb-ratio'),
    sbContainer: $('#scrapbook-container'),
    sbWorkspace: $('#scrapbook-workspace'),
    sbGrid: $('#scrapbook-grid'),

    // Toast
    toast: $('#toast'),
    toastMessage: $('#toast-message'),
  };

  /* ─── Theme ─── */
  function initTheme() {
    const saved = localStorage.getItem('instaview-theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('instaview-theme', next);
  }

  /* ─── Toast ─── */
  let toastTimer;
  function showToast(message) {
    els.toastMessage.textContent = message;
    els.toast.classList.remove('hidden');
    requestAnimationFrame(() => els.toast.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.classList.remove('show');
      setTimeout(() => els.toast.classList.add('hidden'), 300);
    }, 2500);
  }

  /* ─── Navigation ─── */
  function showApp() {
    els.hero.classList.add('hidden');
    els.app.classList.remove('hidden');
  }

  function showHero() {
    els.app.classList.add('hidden');
    els.hero.classList.remove('hidden');
  }

  /* ─── File Reading ─── */
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ─── Image Upload ─── */
  async function handleFiles(files) {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    // Auto-detect panoramic strips (single wide image)
    if (imageFiles.length === 1) {
      const file = imageFiles[0];
      const src = await readFileAsDataURL(file);
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = src;
      });

      const aspect = img.naturalWidth / img.naturalHeight;
      if (aspect > 2.5) {
        // This looks like a panoramic strip — auto-open slicer
        state.slicerImage = img;
        state.slicerSrc = src;
        openSlicer();
        // Load it into the slicer
        els.slicerImgDimensions.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;
        els.slicerImgRatio.textContent = `Ratio ${aspect.toFixed(2)}:1`;
        const bestCount = detectBestSlideCount(img.naturalWidth, img.naturalHeight);
        state.slicerSlideCount = bestCount;
        els.slicerSlideCount.value = bestCount;
        els.slicerUpload.classList.add('hidden');
        els.slicerPreview.classList.remove('hidden');
        els.slicerApply.disabled = false;
        generateSuggestions(img.naturalWidth, img.naturalHeight);
        renderSlicerPreview();
        showToast('Wide image detected! Use Strip Slicer to split into slides.');
        return;
      }
    }

    const remaining = 10 - state.slides.length;
    const toAdd = imageFiles.slice(0, remaining);

    for (const file of toAdd) {
      const src = await readFileAsDataURL(file);
      state.slides.push({ src, file });
    }

    if (imageFiles.length > remaining) {
      showToast(`Only ${remaining} more slide(s) allowed (max 10).`);
    }

    state.currentSlide = state.slides.length - toAdd.length; // go to first new image
    updatePreview();
    updateCarouselThumbs();
    els.btnExport.disabled = false;
  }

  /* ─── Avatar Upload ─── */
  async function handleAvatarUpload(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const src = await readFileAsDataURL(file);
    state.avatarSrc = src;
    els.avatarPreview.src = src;
    els.avatarPreview.classList.remove('hidden');
    els.avatarPlaceholder.classList.add('hidden');
    els.igAvatarImg.src = src;
    els.igAvatarImg.classList.remove('hidden');
    els.igAvatarFallback.classList.add('hidden');
  }

  /* ─── Carousel Thumbnails ─── */
  function updateCarouselThumbs() {
    if (state.slides.length === 0) {
      els.carouselSection.classList.add('hidden');
      return;
    }

    els.carouselSection.classList.remove('hidden');
    els.slideCount.textContent = state.slides.length;
    els.carouselThumbs.innerHTML = '';

    state.slides.forEach((slide, i) => {
      const thumb = document.createElement('div');
      thumb.className = 'carousel-thumb' + (i === state.currentSlide ? ' active' : '');
      thumb.innerHTML = `
        <img src="${slide.src}" alt="Slide ${i + 1}" draggable="true">
        <span class="thumb-index">${i + 1}</span>
        <button class="thumb-remove" title="Remove slide">✕</button>
      `;

      // Click to select
      thumb.addEventListener('click', (e) => {
        if (e.target.classList.contains('thumb-remove')) return;
        state.currentSlide = i;
        updatePreview();
        updateCarouselThumbs();
      });

      // Remove
      thumb.querySelector('.thumb-remove').addEventListener('click', () => {
        state.slides.splice(i, 1);
        if (state.currentSlide >= state.slides.length) {
          state.currentSlide = Math.max(0, state.slides.length - 1);
        }
        updatePreview();
        updateCarouselThumbs();
        if (state.slides.length === 0) {
          els.btnExport.disabled = true;
        }
      });

      // Drag-and-drop reordering
      const img = thumb.querySelector('img');
      img.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', i.toString());
        thumb.style.opacity = '0.5';
      });
      img.addEventListener('dragend', () => {
        thumb.style.opacity = '1';
      });
      thumb.addEventListener('dragover', (e) => {
        e.preventDefault();
        thumb.style.borderColor = 'var(--accent-primary)';
      });
      thumb.addEventListener('dragleave', () => {
        thumb.style.borderColor = i === state.currentSlide ? 'var(--accent-primary)' : 'transparent';
      });
      thumb.addEventListener('drop', (e) => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
        if (fromIndex === i) return;
        const [moved] = state.slides.splice(fromIndex, 1);
        state.slides.splice(i, 0, moved);
        state.currentSlide = i;
        updatePreview();
        updateCarouselThumbs();
      });

      els.carouselThumbs.appendChild(thumb);
    });
  }

  /* ─── Update Preview ─── */
  function updatePreview() {
    const slide = state.slides[state.currentSlide];

    if (!slide) {
      els.igCarouselTrack.innerHTML = '';
      els.igCarouselTrack.style.transform = 'translateX(0)';
      els.igEmptyState.classList.remove('hidden');
      els.igPrev.classList.add('hidden');
      els.igNext.classList.add('hidden');
      els.igDots.classList.add('hidden');
      els.igCounter.classList.add('hidden');
      return;
    }

    els.igEmptyState.classList.add('hidden');

    // Populate track if slide count changed or first time
    if (els.igCarouselTrack.children.length !== state.slides.length) {
      els.igCarouselTrack.innerHTML = '';
      state.slides.forEach((s) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'ig-slide-wrapper';
        const img = document.createElement('img');
        img.className = 'ig-main-image';
        img.src = s.src;
        wrapper.appendChild(img);
        els.igCarouselTrack.appendChild(wrapper);
      });
    }

    // Slide it to the correct position!
    els.igCarouselTrack.style.transform = `translateX(-${state.currentSlide * 100}%)`;

    // Carousel nav
    const isCarousel = state.slides.length > 1;
    els.igPrev.classList.toggle('hidden', !isCarousel || state.currentSlide === 0);
    els.igNext.classList.toggle('hidden', !isCarousel || state.currentSlide === state.slides.length - 1);

    // Dots
    if (isCarousel) {
      els.igDots.classList.remove('hidden');
      els.igDots.innerHTML = '';
      state.slides.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.className = 'ig-dot' + (i === state.currentSlide ? ' active' : '');
        els.igDots.appendChild(dot);
      });
      els.igCounter.classList.remove('hidden');
      els.igCounterText.textContent = `${state.currentSlide + 1}/${state.slides.length}`;
    } else {
      els.igDots.classList.add('hidden');
      els.igCounter.classList.add('hidden');
    }
  }

  /* ─── Ratio ─── */
  function setRatio(ratio) {
    state.ratio = ratio;
    els.igImageContainer.setAttribute('data-ratio', ratio);
    els.ratioBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.ratio === ratio);
    });
  }

  /* ─── Live Sync Inputs ─── */
  function syncInputs() {
    // Username
    const username = els.inputUsername.value.trim() || 'skalla.works';
    els.igUsername.textContent = username;
    els.igCaptionUser.textContent = username;

    // Location
    const location = els.inputLocation.value.trim();
    els.igLocation.textContent = location;
    els.igLocation.style.display = location ? 'block' : 'none';

    // Caption
    const caption = els.inputCaption.value;
    els.igCaptionText.textContent = caption;
    els.igCaption.style.display = caption ? 'block' : 'none';
    els.charCount.textContent = `${caption.length.toLocaleString()} / 2,200`;

    // Likes
    const likes = els.inputLikes.value.trim();
    if (likes && likes !== '0') {
      els.igLikesText.textContent = `${formatNumber(likes)} likes`;
      els.igLikes.style.display = 'block';
    } else {
      els.igLikes.style.display = 'none';
    }

    // Comments
    const comments = els.inputComments.value.trim();
    if (comments && comments !== '0') {
      els.igCommentsText.textContent = `View all ${formatNumber(comments)} comments`;
      els.igCommentsSection.style.display = 'block';
    } else {
      els.igCommentsSection.style.display = 'none';
    }

    // Time
    els.igTime.textContent = els.inputTime.value.trim() || 'Just now';
  }

  function formatNumber(val) {
    const num = parseInt(val.replace(/[^0-9]/g, ''));
    if (isNaN(num)) return val;
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toLocaleString();
  }

  /* ─── Like Toggle ─── */
  function toggleLike() {
    state.liked = !state.liked;
    els.igLikeBtn.classList.toggle('liked', state.liked);
  }

  /* ═══════════════════════════════════════════════════
   * ─── Strip Slicer ───
   * ═══════════════════════════════════════════════════ */

  function openSlicer() {
    els.slicerOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    // Reset if no image loaded
    if (!state.slicerImage) {
      els.slicerUpload.classList.remove('hidden');
      els.slicerPreview.classList.add('hidden');
      els.slicerApply.disabled = true;
    }
  }

  function closeSlicer() {
    els.slicerOverlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  async function loadSlicerImage(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const src = await readFileAsDataURL(file);
    const img = new Image();
    await new Promise((resolve) => {
      img.onload = resolve;
      img.src = src;
    });

    state.slicerImage = img;
    state.slicerSrc = src;

    // Show info
    els.slicerImgDimensions.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    els.slicerImgRatio.textContent = `Ratio ${imgRatio.toFixed(2)}:1`;

    // Auto-detect best slide count
    const bestCount = detectBestSlideCount(img.naturalWidth, img.naturalHeight);
    state.slicerSlideCount = bestCount;
    els.slicerSlideCount.value = bestCount;

    // Switch views
    els.slicerUpload.classList.add('hidden');
    els.slicerPreview.classList.remove('hidden');
    els.slicerApply.disabled = false;

    // Generate suggestions
    generateSuggestions(img.naturalWidth, img.naturalHeight);

    // Render preview
    renderSlicerPreview();
  }

  /**
   * Detect the best slide count by checking which count
   * produces per-slide ratios closest to IG standards (1:1, 4:5, 1.91:1)
   */
  function detectBestSlideCount(w, h) {
    const igRatios = [1, 4/5, 1.91]; // w/h ratios
    let bestCount = 2;
    let bestDiff = Infinity;

    for (let count = 2; count <= 10; count++) {
      const sliceW = w / count;
      const sliceRatio = sliceW / h;

      for (const target of igRatios) {
        const diff = Math.abs(sliceRatio - target);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestCount = count;
        }
      }
    }

    return bestCount;
  }

  /**
   * Generate suggestion chips for common slide counts
   */
  function generateSuggestions(w, h) {
    const igRatios = [
      { ratio: 1, label: '1:1 Square' },
      { ratio: 4/5, label: '4:5 Portrait' },
      { ratio: 1.91, label: '1.91:1 Landscape' },
    ];

    const suggestions = [];

    for (let count = 2; count <= 10; count++) {
      const sliceW = w / count;
      const sliceRatio = sliceW / h;

      // Check if close to an IG standard ratio
      for (const { ratio, label } of igRatios) {
        const diff = Math.abs(sliceRatio - ratio);
        if (diff < 0.15) {
          suggestions.push({
            count,
            label: `${count} slides → ${label}`,
            diff,
            recommended: diff < 0.05,
          });
        }
      }
    }

    // Sort by closeness
    suggestions.sort((a, b) => a.diff - b.diff);

    // Render
    els.slicerSuggestions.innerHTML = '';
    if (suggestions.length === 0) {
      els.slicerSuggestions.innerHTML = '<span style="font-size:12px;color:var(--text-tertiary)">No standard IG ratios detected — use manual count above</span>';
      return;
    }

    // De-dup by count
    const seen = new Set();
    for (const s of suggestions) {
      if (seen.has(s.count)) continue;
      seen.add(s.count);
      const chip = document.createElement('button');
      chip.className = 'slicer-suggestion-chip' + (s.recommended ? ' recommended' : '');
      chip.innerHTML = `${s.recommended ? '<span class="chip-star">★</span> ' : ''}${s.label}`;
      chip.addEventListener('click', () => {
        state.slicerSlideCount = s.count;
        els.slicerSlideCount.value = s.count;
        renderSlicerPreview();
      });
      els.slicerSuggestions.appendChild(chip);
    }
  }

  /**
   * Render the canvas preview with grid lines
   */
  function renderSlicerPreview() {
    const img = state.slicerImage;
    if (!img) return;

    const canvas = els.slicerCanvas;
    const ctx = canvas.getContext('2d');
    const count = state.slicerSlideCount;

    // Canvas size (scale down for display, keep aspect ratio)
    const maxW = 800;
    const scale = Math.min(1, maxW / img.naturalWidth);
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);

    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw grid lines
    const sliceWidth = canvas.width / count;
    ctx.strokeStyle = 'rgba(255, 80, 80, 0.75)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);

    for (let i = 1; i < count; i++) {
      const x = Math.round(sliceWidth * i);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Semi-transparent overlay on alternating slices for visibility
    for (let i = 0; i < count; i++) {
      if (i % 2 === 1) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.fillRect(sliceWidth * i, 0, sliceWidth, canvas.height);
      }
    }

    // Update labels
    els.slicerLabels.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const label = document.createElement('div');
      label.className = 'slicer-label-item';
      label.innerHTML = `<span>${i + 1}</span>`;
      els.slicerLabels.appendChild(label);
    }

    // Update info
    const perSlideW = Math.round(img.naturalWidth / count);
    const perSlideH = img.naturalHeight;
    els.slicerPerSlide.textContent = `${perSlideW} × ${perSlideH} px`;

    const ratio = perSlideW / perSlideH;
    let ratioLabel;
    if (Math.abs(ratio - 1) < 0.05) ratioLabel = '~1:1 (Square)';
    else if (Math.abs(ratio - 0.8) < 0.05) ratioLabel = '~4:5 (Portrait)';
    else if (Math.abs(ratio - 1.91) < 0.1) ratioLabel = '~1.91:1 (Landscape)';
    else if (ratio < 1) ratioLabel = `~${ratio.toFixed(2)}:1 (Tall)`;
    else ratioLabel = `~${ratio.toFixed(2)}:1 (Wide)`;
    els.slicerPerRatio.textContent = ratioLabel;
  }

  /**
   * Slice the image into individual slides and add to carousel
   */
  function applySlice() {
    const img = state.slicerImage;
    if (!img) return;

    const count = state.slicerSlideCount;
    const sliceW = Math.round(img.naturalWidth / count);
    const remaining = 10 - state.slides.length;

    if (count > remaining) {
      showToast(`Only ${remaining} slide slot(s) left. Reduce slide count.`);
      return;
    }

    const newSlides = [];

    for (let i = 0; i < count; i++) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      // Handle last slice to include any remaining pixels
      const x = sliceW * i;
      const w = (i === count - 1) ? img.naturalWidth - x : sliceW;
      canvas.width = w;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, x, 0, w, img.naturalHeight, 0, 0, w, img.naturalHeight);

      const src = canvas.toDataURL('image/png');
      newSlides.push({ src, file: null });
    }

    // Add to state
    state.slides.push(...newSlides);
    state.currentSlide = state.slides.length - count;
    updatePreview();
    updateCarouselThumbs();
    els.btnExport.disabled = false;

    closeSlicer();
    showToast(`Split into ${count} slides and added to carousel!`);
  }

  /* ═══════════════════════════════════════════════════
   * ─── Scrapbook Builder ───
   * ═══════════════════════════════════════════════════ */

  function openScrapbook() {
    els.sbOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    updateScrapbookWorkspace();
  }

  function closeScrapbook() {
    els.sbOverlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function getScrapbookConfig() {
    const slides = parseInt(els.sbSlideCount.value);
    const ratioStr = els.sbRatio.value;
    // Base height is fixed to 1080 for rendering. Width depends on ratio.
    const h = state.sbBaseHeight;
    const wPerSlide = ratioStr === '1:1' ? h : Math.round(h * (4/5));
    const totalW = wPerSlide * slides;
    return { slides, wPerSlide, totalW, h };
  }

  function updateScrapbookWorkspace() {
    const conf = getScrapbookConfig();
    // Set actual width and height style on workspace for JS dragging
    els.sbWorkspace.style.width = `${conf.totalW}px`;
    els.sbWorkspace.style.height = `${conf.h}px`;
    
    // Scale workspace to fit container visually
    const containerW = els.sbContainer.clientWidth - 64; // padding
    const containerH = els.sbContainer.clientHeight - 64;
    const scale = Math.min(containerW / conf.totalW, containerH / conf.h, 1);
    els.sbWorkspace.style.transform = `scale(${scale})`;
    
    // Update grid background
    const perc = (100 / conf.slides).toFixed(4);
    els.sbGrid.style.backgroundSize = `${perc}% 100%`;
  }

  async function addScrapbookImage(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const src = await readFileAsDataURL(file);
    const img = new Image();
    await new Promise((resolve) => {
      img.onload = resolve;
      img.src = src;
    });

    const conf = getScrapbookConfig();
    // Default size is 50% of the height
    const displayH = conf.h * 0.5;
    const displayW = displayH * (img.naturalWidth / img.naturalHeight);

    const id = 'sb-item-' + Date.now();
    state.sbItems.push({
      id,
      img,
      x: (conf.totalW / 2) - (displayW / 2),
      y: (conf.h / 2) - (displayH / 2),
      width: displayW,
      height: displayH,
      aspect: img.naturalWidth / img.naturalHeight
    });
    
    renderScrapbookItems();
  }

  function renderScrapbookItems() {
    // Keep grid, remove old items
    const children = Array.from(els.sbWorkspace.children);
    children.forEach(c => {
      if (c.id !== 'scrapbook-grid') els.sbWorkspace.removeChild(c);
    });

    state.sbItems.forEach(item => {
      const div = document.createElement('div');
      div.className = 'sb-item' + (state.sbSelectedId === item.id ? ' selected' : '');
      div.id = item.id;
      div.style.left = `${item.x}px`;
      div.style.top = `${item.y}px`;
      div.style.width = `${item.width}px`;
      div.style.height = `${item.height}px`;

      const imgEl = document.createElement('img');
      imgEl.src = item.img.src;
      div.appendChild(imgEl);

      // Handles
      ['nw', 'ne', 'sw', 'se'].forEach(dir => {
        const handle = document.createElement('div');
        handle.className = `sb-resize-handle ${dir}`;
        handle.dataset.dir = dir;
        div.appendChild(handle);
      });

      // Selection & Drag
      div.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('sb-resize-handle')) return; // handled separately
        state.sbSelectedId = item.id;
        renderScrapbookItems(); // update selection outline
        startScrapbookDrag(e, item, div);
      });

      // Resize
      div.querySelectorAll('.sb-resize-handle').forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          startScrapbookResize(e, item, div, handle.dataset.dir);
        });
      });

      els.sbWorkspace.appendChild(div);
    });
  }

  function getWorkspaceScale() {
    const transform = els.sbWorkspace.style.transform;
    const match = transform.match(/scale\(([^)]+)\)/);
    return match ? parseFloat(match[1]) : 1;
  }

  function startScrapbookDrag(e, item, div) {
    e.preventDefault();
    const scale = getWorkspaceScale();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = item.x;
    const initialY = item.y;

    function onMove(ev) {
      item.x = initialX + (ev.clientX - startX) / scale;
      item.y = initialY + (ev.clientY - startY) / scale;
      div.style.left = `${item.x}px`;
      div.style.top = `${item.y}px`;
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function startScrapbookResize(e, item, div, dir) {
    e.preventDefault();
    const scale = getWorkspaceScale();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = item.x;
    const initialY = item.y;
    const initialW = item.width;
    const initialH = item.height;
    const aspect = item.aspect;

    function onMove(ev) {
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      
      let newW = initialW;
      
      if (dir.includes('e')) newW = initialW + dx;
      if (dir.includes('w')) newW = initialW - dx;
      
      // Enforce min width
      newW = Math.max(50, newW);
      const newH = newW / aspect; // lock aspect ratio

      if (dir.includes('w')) item.x = initialX + (initialW - newW);
      if (dir.includes('n')) item.y = initialY + (initialH - newH);

      item.width = newW;
      item.height = newH;

      div.style.left = `${item.x}px`;
      div.style.top = `${item.y}px`;
      div.style.width = `${item.width}px`;
      div.style.height = `${item.height}px`;
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function deleteSelectedScrapbookItem() {
    if (!state.sbSelectedId) return;
    state.sbItems = state.sbItems.filter(i => i.id !== state.sbSelectedId);
    state.sbSelectedId = null;
    renderScrapbookItems();
  }

  function applyScrapbookToSlicer() {
    if (state.sbItems.length === 0) {
      showToast('Add some images first!');
      return;
    }

    const conf = getScrapbookConfig();
    const canvas = document.createElement('canvas');
    canvas.width = conf.totalW;
    canvas.height = conf.h;
    const ctx = canvas.getContext('2d');

    // Fill background
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    ctx.fillStyle = isDark ? '#12121a' : '#ffffff'; // or let user choose later
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw items (respecting z-index / array order)
    state.sbItems.forEach(item => {
      ctx.drawImage(item.img, item.x, item.y, item.width, item.height);
    });

    const src = canvas.toDataURL('image/png');
    const img = new Image();
    img.onload = () => {
      // Set to slicer
      state.slicerImage = img;
      state.slicerSrc = src;
      state.slicerSlideCount = conf.slides;
      
      closeScrapbook();
      openSlicer();

      // Configure slicer to use this directly
      els.slicerImgDimensions.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;
      els.slicerImgRatio.textContent = `Ratio ${(img.naturalWidth / img.naturalHeight).toFixed(2)}:1`;
      els.slicerSlideCount.value = conf.slides;
      els.slicerUpload.classList.add('hidden');
      els.slicerPreview.classList.remove('hidden');
      els.slicerApply.disabled = false;
      generateSuggestions(img.naturalWidth, img.naturalHeight);
      renderSlicerPreview();
    };
    img.src = src;
  }

  /* ─── Export Mockup ─── */
  async function exportMockup() {
    if (state.slides.length === 0) return;

    showToast('Exporting mockup…');

    try {
      // Use html2canvas approach via canvas manual drawing
      const post = document.getElementById('instagram-post');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Calculate dimensions
      const postWidth = 1080;
      let imageHeight;
      switch (state.ratio) {
        case '4:5': imageHeight = 1350; break;
        case '1.91:1': imageHeight = Math.round(1080 / 1.91); break;
        default: imageHeight = 1080;
      }

      const headerHeight = 140;
      const actionsHeight = 120;
      const textHeight = 200;
      const totalHeight = headerHeight + imageHeight + actionsHeight + textHeight;

      canvas.width = postWidth;
      canvas.height = totalHeight;

      // Background
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      ctx.fillStyle = isDark ? '#12121a' : '#ffffff';
      ctx.fillRect(0, 0, postWidth, totalHeight);

      // Header
      ctx.fillStyle = isDark ? '#f0f0f5' : '#111827';
      ctx.font = 'bold 32px Inter, sans-serif';
      const username = els.inputUsername.value.trim() || 'yourhandle';

      // Avatar circle
      if (state.avatarSrc) {
        const avatarImg = new Image();
        avatarImg.crossOrigin = 'anonymous';
        await new Promise((resolve) => {
          avatarImg.onload = resolve;
          avatarImg.src = state.avatarSrc;
        });
        ctx.save();
        ctx.beginPath();
        ctx.arc(60, 70, 30, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatarImg, 30, 40, 60, 60);
        ctx.restore();

        // Gradient ring
        ctx.beginPath();
        ctx.arc(60, 70, 33, 0, Math.PI * 2);
        ctx.strokeStyle = '#C13584';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else {
        // Default avatar
        const gradient = ctx.createLinearGradient(30, 40, 90, 100);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.beginPath();
        ctx.arc(60, 70, 30, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Ring
        ctx.beginPath();
        ctx.arc(60, 70, 33, 0, Math.PI * 2);
        ctx.strokeStyle = '#C13584';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      ctx.fillStyle = isDark ? '#f0f0f5' : '#111827';
      ctx.font = 'bold 30px Inter, sans-serif';
      ctx.fillText(username, 105, 66);

      const location = els.inputLocation.value.trim();
      if (location) {
        ctx.fillStyle = isDark ? '#8b8b9e' : '#6b7280';
        ctx.font = '24px Inter, sans-serif';
        ctx.fillText(location, 105, 92);
      }

      // Three dots
      ctx.fillStyle = isDark ? '#f0f0f5' : '#111827';
      [0, 14, 28].forEach(offset => {
        ctx.beginPath();
        ctx.arc(postWidth - 40, 56 + offset, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Image
      const slide = state.slides[state.currentSlide];
      if (slide) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve) => {
          img.onload = resolve;
          img.src = slide.src;
        });

        const y = headerHeight;
        // Cover fit
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const containerAspect = postWidth / imageHeight;
        let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;

        if (imgAspect > containerAspect) {
          sw = img.naturalHeight * containerAspect;
          sx = (img.naturalWidth - sw) / 2;
        } else {
          sh = img.naturalWidth / containerAspect;
          sy = (img.naturalHeight - sh) / 2;
        }

        ctx.drawImage(img, sx, sy, sw, sh, 0, y, postWidth, imageHeight);

        // Carousel counter
        if (state.slides.length > 1) {
          const counterText = `${state.currentSlide + 1}/${state.slides.length}`;
          ctx.font = '24px Inter, sans-serif';
          const tw = ctx.measureText(counterText).width;
          const cx = postWidth - tw - 40;
          const cy = y + 20;

          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          roundRect(ctx, cx - 12, cy - 4, tw + 24, 36, 18);
          ctx.fill();

          ctx.fillStyle = '#fff';
          ctx.fillText(counterText, cx, cy + 22);

          // Dots
          const dotY = y + imageHeight - 30;
          const totalDotsWidth = state.slides.length * 14 - 6;
          let dotX = (postWidth - totalDotsWidth) / 2;
          state.slides.forEach((_, i) => {
            ctx.beginPath();
            ctx.arc(dotX + 4, dotY, 5, 0, Math.PI * 2);
            ctx.fillStyle = i === state.currentSlide ? '#fff' : 'rgba(255,255,255,0.4)';
            ctx.fill();
            dotX += 14;
          });
        }
      }

      // Actions row
      const actionsY = headerHeight + imageHeight + 30;
      ctx.fillStyle = isDark ? '#f0f0f5' : '#111827';

      // Heart icon (simplified)
      drawHeart(ctx, 20, actionsY, 28, state.liked ? '#ed4956' : (isDark ? '#f0f0f5' : '#111827'));
      // Comment icon (simplified circle)
      drawComment(ctx, 68, actionsY, 28, isDark ? '#f0f0f5' : '#111827');
      // Share icon
      drawShare(ctx, 116, actionsY, 28, isDark ? '#f0f0f5' : '#111827');
      // Bookmark
      drawBookmark(ctx, postWidth - 46, actionsY, 28, isDark ? '#f0f0f5' : '#111827');

      // Likes text
      let textY = actionsY + 50;
      const likes = els.inputLikes.value.trim();
      if (likes && likes !== '0') {
        ctx.fillStyle = isDark ? '#f0f0f5' : '#111827';
        ctx.font = 'bold 28px Inter, sans-serif';
        ctx.fillText(`${formatNumber(likes)} likes`, 20, textY);
        textY += 36;
      }

      // Caption
      const caption = els.inputCaption.value;
      if (caption) {
        ctx.font = 'bold 28px Inter, sans-serif';
        ctx.fillStyle = isDark ? '#f0f0f5' : '#111827';
        ctx.fillText(username, 20, textY);
        const usernameW = ctx.measureText(username + ' ').width;
        ctx.font = '28px Inter, sans-serif';
        // Truncate caption for canvas
        const maxW = postWidth - usernameW - 40;
        const truncated = truncateText(ctx, caption, maxW);
        ctx.fillText(truncated, 20 + usernameW, textY);
        textY += 36;
      }

      // Time
      ctx.fillStyle = isDark ? '#5c5c72' : '#9ca3af';
      ctx.font = '22px Inter, sans-serif';
      const timeText = (els.inputTime.value.trim() || 'Just now').toUpperCase();
      ctx.fillText(timeText, 20, textY);

      // Download
      const link = document.createElement('a');
      link.download = `instaview-mockup-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      showToast('Mockup exported!');
    } catch (err) {
      console.error('Export error:', err);
      showToast('Export failed. Please try again.');
    }
  }

  // Helper: rounded rect
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // Helper: truncate text
  function truncateText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (ctx.measureText(t + '…').width > maxWidth && t.length > 0) {
      t = t.slice(0, -1);
    }
    return t + '…';
  }

  // Simple icon drawing helpers
  function drawHeart(ctx, x, y, size, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const s = size / 24;
    ctx.translate(x, y - size / 2);
    ctx.scale(s, s);
    ctx.moveTo(12, 21.23);
    ctx.bezierCurveTo(12, 21.23, 4.22, 13.45, 4.22, 8.39);
    ctx.bezierCurveTo(4.22, 5.19, 6.8, 2.61, 10, 2.61);
    ctx.bezierCurveTo(11.2, 2.61, 12, 3.2, 12, 3.2);
    ctx.bezierCurveTo(12, 3.2, 12.8, 2.61, 14, 2.61);
    ctx.bezierCurveTo(17.2, 2.61, 19.78, 5.19, 19.78, 8.39);
    ctx.bezierCurveTo(19.78, 13.45, 12, 21.23, 12, 21.23);
    ctx.closePath();
    if (color === '#ed4956') {
      ctx.fill();
    } else {
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawComment(ctx, x, y, size, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x + size / 2, y, size / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawShare(ctx, x, y, size, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + size - 4, y - size / 2 + 4);
    ctx.lineTo(x + size / 2, y + 4);
    ctx.lineTo(x + 4, y - size / 2 + 4);
    ctx.stroke();
    ctx.restore();
  }

  function drawBookmark(ctx, x, y, size, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y - size / 2 + 2);
    ctx.lineTo(x, y + size / 2 - 2);
    ctx.lineTo(x + size / 2, y + size / 4);
    ctx.lineTo(x + size, y + size / 2 - 2);
    ctx.lineTo(x + size, y - size / 2 + 2);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  /* ─── Event Bindings ─── */
  function bindEvents() {
    // Navigation
    els.btnGetStarted.addEventListener('click', showApp);
    els.btnBackHero.addEventListener('click', showHero);

    // Theme
    els.btnThemeToggle.addEventListener('click', toggleTheme);
    els.btnThemeToggleApp.addEventListener('click', toggleTheme);

    // File Upload - Drop Zone
    els.dropZone.addEventListener('click', () => els.fileInput.click());
    els.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      els.dropZone.classList.add('drag-over');
    });
    els.dropZone.addEventListener('dragleave', () => {
      els.dropZone.classList.remove('drag-over');
    });
    els.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      els.dropZone.classList.remove('drag-over');
      handleFiles(e.dataTransfer.files);
    });
    els.fileInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
      e.target.value = '';
    });

    // Add more slides
    els.btnAddMore.addEventListener('click', () => els.fileInput.click());

    // ─── Strip Slicer Events ───
    els.btnStripSlicer.addEventListener('click', openSlicer);
    els.slicerClose.addEventListener('click', closeSlicer);
    els.slicerCancel.addEventListener('click', closeSlicer);
    els.slicerOverlay.addEventListener('click', (e) => {
      if (e.target === els.slicerOverlay) closeSlicer();
    });

    // Slicer file upload
    els.slicerUpload.addEventListener('click', () => els.slicerFileInput.click());
    els.slicerUpload.addEventListener('dragover', (e) => {
      e.preventDefault();
      els.slicerUpload.style.borderColor = 'var(--accent-primary)';
    });
    els.slicerUpload.addEventListener('dragleave', () => {
      els.slicerUpload.style.borderColor = '';
    });
    els.slicerUpload.addEventListener('drop', (e) => {
      e.preventDefault();
      els.slicerUpload.style.borderColor = '';
      if (e.dataTransfer.files[0]) loadSlicerImage(e.dataTransfer.files[0]);
    });
    els.slicerFileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) loadSlicerImage(e.target.files[0]);
      e.target.value = '';
    });
    els.slicerChangeImg.addEventListener('click', () => els.slicerFileInput.click());

    // Stepper
    els.slicerMinus.addEventListener('click', () => {
      const v = Math.max(2, state.slicerSlideCount - 1);
      state.slicerSlideCount = v;
      els.slicerSlideCount.value = v;
      renderSlicerPreview();
    });
    els.slicerPlus.addEventListener('click', () => {
      const v = Math.min(10, state.slicerSlideCount + 1);
      state.slicerSlideCount = v;
      els.slicerSlideCount.value = v;
      renderSlicerPreview();
    });
    els.slicerSlideCount.addEventListener('input', () => {
      let v = parseInt(els.slicerSlideCount.value);
      if (isNaN(v)) return;
      v = Math.max(2, Math.min(10, v));
      state.slicerSlideCount = v;
      renderSlicerPreview();
    });

    // Apply
    els.slicerApply.addEventListener('click', applySlice);

    // ─── Scrapbook Builder Events ───
    els.btnScrapbook.addEventListener('click', openScrapbook);
    els.sbClose.addEventListener('click', closeScrapbook);
    els.sbCancel.addEventListener('click', closeScrapbook);
    els.sbOverlay.addEventListener('click', (e) => {
      if (e.target === els.sbOverlay) closeScrapbook();
    });
    window.addEventListener('resize', () => {
      if (!els.sbOverlay.classList.contains('hidden')) updateScrapbookWorkspace();
    });
    els.sbSlideCount.addEventListener('change', updateScrapbookWorkspace);
    els.sbRatio.addEventListener('change', updateScrapbookWorkspace);
    
    // Deselect if clicking outside items on the workspace
    els.sbWorkspace.addEventListener('mousedown', (e) => {
      if (e.target === els.sbWorkspace || e.target === els.sbGrid) {
        state.sbSelectedId = null;
        renderScrapbookItems();
      }
    });

    els.sbAddImgBtn.addEventListener('click', () => els.sbAddImgInput.click());
    els.sbAddImgInput.addEventListener('change', (e) => {
      Array.from(e.target.files).forEach(f => addScrapbookImage(f));
      e.target.value = '';
    });

    els.sbClear.addEventListener('click', () => {
      if (confirm('Clear all images from the canvas?')) {
        state.sbItems = [];
        state.sbSelectedId = null;
        renderScrapbookItems();
      }
    });

    els.sbApply.addEventListener('click', applyScrapbookToSlicer);

    // Keyboard: Escape to close slicer/scrapbook, Delete to remove item
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!els.slicerOverlay.classList.contains('hidden')) closeSlicer();
        if (!els.sbOverlay.classList.contains('hidden')) closeScrapbook();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !els.sbOverlay.classList.contains('hidden')) {
        // Prevent if typing in an input
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          deleteSelectedScrapbookItem();
        }
      }
    });

    // Avatar
    els.avatarUpload.addEventListener('click', () => els.avatarInput.click());
    els.avatarInput.addEventListener('change', (e) => {
      if (e.target.files[0]) handleAvatarUpload(e.target.files[0]);
      e.target.value = '';
    });

    // Live sync inputs
    els.inputUsername.addEventListener('input', syncInputs);
    els.inputLocation.addEventListener('input', syncInputs);
    els.inputCaption.addEventListener('input', syncInputs);
    els.inputLikes.addEventListener('input', syncInputs);
    els.inputComments.addEventListener('input', syncInputs);
    els.inputTime.addEventListener('input', syncInputs);

    // Ratio buttons
    els.ratioBtns.forEach(btn => {
      btn.addEventListener('click', () => setRatio(btn.dataset.ratio));
    });

    // Carousel navigation
    els.igPrev.addEventListener('click', () => {
      if (state.currentSlide > 0) {
        state.currentSlide--;
        updatePreview();
        updateCarouselThumbs();
      }
    });
    els.igNext.addEventListener('click', () => {
      if (state.currentSlide < state.slides.length - 1) {
        state.currentSlide++;
        updatePreview();
        updateCarouselThumbs();
      }
    });

    // Like
    els.igLikeBtn.addEventListener('click', toggleLike);

    // Export
    els.btnExport.addEventListener('click', exportMockup);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (els.app.classList.contains('hidden')) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowLeft') {
        if (state.currentSlide > 0) {
          state.currentSlide--;
          updatePreview();
          updateCarouselThumbs();
        }
      } else if (e.key === 'ArrowRight') {
        if (state.currentSlide < state.slides.length - 1) {
          state.currentSlide++;
          updatePreview();
          updateCarouselThumbs();
        }
      }
    });

    // Unified Pointer/Touch drag-to-swipe
    let isDragging = false;
    let dragStartX = 0;
    let currentTranslate = 0;
    let prevTranslate = 0;
    const imageArea = document.getElementById('ig-image-area');

    function getPositionX(e) {
      return e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
    }

    function dragStart(e) {
      if (state.slides.length <= 1) return;
      isDragging = true;
      dragStartX = getPositionX(e);
      els.igCarouselTrack.style.transition = 'none'; // Remove CSS transition during drag
      prevTranslate = -state.currentSlide * 100;
    }

    function dragMove(e) {
      if (!isDragging) return;
      
      const currentPosition = getPositionX(e);
      const diff = currentPosition - dragStartX;
      
      // Calculate diff in percentage
      const trackWidth = els.igCarouselTrack.clientWidth;
      const diffPercent = (diff / trackWidth) * 100;
      
      currentTranslate = prevTranslate + diffPercent;
      
      // Add rubber-band resistance at the edges
      if (currentTranslate > 0) {
        currentTranslate = currentTranslate / 3;
      } else if (currentTranslate < -(state.slides.length - 1) * 100) {
        const edge = -(state.slides.length - 1) * 100;
        const over = currentTranslate - edge;
        currentTranslate = edge + over / 3;
      }

      els.igCarouselTrack.style.transform = `translateX(${currentTranslate}%)`;
    }

    function dragEnd() {
      if (!isDragging) return;
      isDragging = false;
      
      // Restore CSS transition
      els.igCarouselTrack.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
      
      const movedBy = currentTranslate - prevTranslate;
      
      // Threshold to trigger slide change (15% of width)
      if (movedBy < -15 && state.currentSlide < state.slides.length - 1) {
        state.currentSlide++;
      } else if (movedBy > 15 && state.currentSlide > 0) {
        state.currentSlide--;
      }
      
      // The updatePreview will translate it back to the exact snapped position
      updatePreview();
      updateCarouselThumbs();
    }

    // Touch events
    imageArea.addEventListener('touchstart', dragStart, { passive: true });
    imageArea.addEventListener('touchmove', (e) => {
      if (isDragging) e.preventDefault(); // Prevent scroll while swiping
      dragMove(e);
    }, { passive: false });
    imageArea.addEventListener('touchend', dragEnd);
    
    // Mouse events
    imageArea.addEventListener('mousedown', (e) => {
      e.preventDefault(); // Prevent native image drag ghosting
      dragStart(e);
    });
    imageArea.addEventListener('mousemove', dragMove);
    imageArea.addEventListener('mouseup', dragEnd);
    imageArea.addEventListener('mouseleave', () => {
      if (isDragging) dragEnd();
    });

    // Paste from clipboard
    document.addEventListener('paste', async (e) => {
      if (els.app.classList.contains('hidden')) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const files = [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        handleFiles(files);
        showToast('Image pasted from clipboard!');
      }
    });
  }

  /* ─── Init ─── */
  function init() {
    initTheme();
    bindEvents();
    syncInputs();
    setRatio('1:1');
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
