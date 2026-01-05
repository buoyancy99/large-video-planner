window.HELP_IMPROVE_VIDEOJS = false;

var INTERP_BASE = "./static/interpolation/stacked";
var NUM_INTERP_FRAMES = 240;

var interp_images = [];
function preloadInterpolationImages() {
  for (var i = 0; i < NUM_INTERP_FRAMES; i++) {
    var path = INTERP_BASE + '/' + String(i).padStart(6, '0') + '.jpg';
    interp_images[i] = new Image();
    interp_images[i].src = path;
  }
}

function setInterpolationImage(i) {
  var image = interp_images[i];
  image.ondragstart = function () { return false; };
  image.oncontextmenu = function () { return false; };
  $('#interpolation-image-wrapper').empty().append(image);
}


$(document).ready(function () {
  // Check for click events on the navbar burger icon
  $(".navbar-burger").click(function () {
    // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
    $(".navbar-burger").toggleClass("is-active");
    $(".navbar-menu").toggleClass("is-active");

  });

  var options = {
    slidesToScroll: 1,
    slidesToShow: 1,
    loop: true,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 12000,
  }

  // Initialize all div with carousel class
  // Initialize all carousels EXCEPT the results carousels (which have custom settings).
  var carousels = bulmaCarousel.attach('.carousel:not(.results-carousel)', options);

  // Pause autoplay on user interaction (fixes the old loop/closure bug).
  carousels.forEach(function (c) {
    c.element.addEventListener('click', function () { c.pause(); });
    c.element.addEventListener('touchstart', function () { c.pause(); }, { passive: true });
  });

  // Access to bulmaCarousel instance of an element
  var element = document.querySelector('#my-element');
  if (element && element.bulmaCarousel) {
    // bulmaCarousel instance is available as element.bulmaCarousel
    element.bulmaCarousel.on('before-show', function (state) {
      console.log(state);
    });
  }

  /*var player = document.getElementById('interpolation-video');
  player.addEventListener('loadedmetadata', function() {
    $('#interpolation-slider').on('input', function(event) {
      console.log(this.value, player.duration);
      player.currentTime = player.duration / 100 * this.value;
    })
  }, false);*/
  preloadInterpolationImages();

  $('#interpolation-slider').on('input', function (event) {
    setInterpolationImage(this.value);
  });
  setInterpolationImage(0);
  $('#interpolation-slider').prop('max', NUM_INTERP_FRAMES - 1);

  bulmaSlider.attach();

  // Video morphing logic (guarded to avoid errors when elements are absent)
  const mainVideo = document.getElementById('main-video');
  const miniVideo = document.getElementById('mini-video');
  const miniPlayer = document.getElementById('mini-player');
  const mainVideoContainer = document.getElementById('main-video-container');
  const closeButton = document.querySelector('.mini-player-close');

  if (mainVideo && miniVideo && miniPlayer && mainVideoContainer && closeButton) {
    // Sync the two videos
    mainVideo.addEventListener('play', () => miniVideo.play());
    mainVideo.addEventListener('pause', () => miniVideo.pause());
    miniVideo.addEventListener('play', () => mainVideo.play());
    miniVideo.addEventListener('pause', () => mainVideo.pause());

    // Keep videos in sync
    setInterval(() => {
      if (Math.abs(mainVideo.currentTime - miniVideo.currentTime) > 0.5) {
        miniVideo.currentTime = mainVideo.currentTime;
      }
    }, 1000);

    let miniPlayerVisible = true;

    // Handle close button click
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      miniPlayerVisible = false;
      miniPlayer.classList.remove('visible');
    });

    // Update scroll handler to respect visibility flag
    window.addEventListener('scroll', () => {
      const rect = mainVideoContainer.getBoundingClientRect();
      const isMainVideoOutOfView = rect.bottom < mainVideo.offsetHeight;

      if (isMainVideoOutOfView && miniPlayerVisible) {
        miniPlayer.classList.add('visible');
      } else {
        miniPlayer.classList.remove('visible');
      }
    });

    // Reset visibility when clicking mini player
    miniPlayer.addEventListener('click', (e) => {
      if (e.target !== closeButton) {
        miniPlayerVisible = true;
        mainVideoContainer.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Floating Table of Contents
  (function () {
    // Collect visible h2/h3 headings
    const headings = Array.from(document.querySelectorAll('h2, h3'))
      .filter(h => h.textContent.trim().length > 0 && h.offsetParent !== null);

    if (headings.length === 0) return;

    // Generate slug from text for element id
    const makeSlug = (str) => {
      const base = str.toLowerCase().trim()
        .replace(/[\s]+/g, '-')
        .replace(/[^a-z0-9\-]/g, '')
        .replace(/\-+/g, '-')
        .replace(/^\-+|\-+$/g, '');
      return base || 'section';
    };

    // Ensure each heading has a unique id
    const seen = new Map();
    headings.forEach(h => {
      if (!h.id) {
        let slug = makeSlug(h.textContent);
        if (seen.has(slug) || document.getElementById(slug)) {
          let i = 2;
          while (seen.has(`${slug}-${i}`) || document.getElementById(`${slug}-${i}`)) i++;
          slug = `${slug}-${i}`;
        }
        seen.set(slug, true);
        h.id = slug;
      }
    });

    // Build TOC container
    const nav = document.createElement('nav');
    nav.className = 'toc';
    const title = document.createElement('h4');
    title.textContent = 'Contents';
    nav.appendChild(title);

    const ul = document.createElement('ul');
    nav.appendChild(ul);

    // Populate TOC items
    headings.forEach(h => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${h.id}`;
      a.textContent = h.textContent.trim();
      if (h.tagName.toLowerCase() === 'h3') a.classList.add('toc-h3');
      li.appendChild(a);
      ul.appendChild(li);
    });

    document.body.appendChild(nav);

    // Scroll spy: highlight active section while scrolling
    const links = Array.from(nav.querySelectorAll('a'));
    const idToEl = new Map(headings.map(h => [h.id, h]));

    const setActive = (id) => {
      links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${id}`));
    };

    const onScroll = () => {
      const y = window.scrollY + 120; // Prefetch a bit to highlight the section being read
      let currentId = headings[0]?.id;
      for (const h of headings) {
        if (h.offsetTop <= y) currentId = h.id;
        else break;
      }
      if (currentId) setActive(currentId);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Smooth scroll on link click + update URL
    nav.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.tagName.toLowerCase() === 'a') {
        e.preventDefault();
        const id = t.getAttribute('href').slice(1);
        const target = idToEl.get(id);
        if (target) {
          const top = target.getBoundingClientRect().top + window.pageYOffset - 80;
          window.scrollTo({ top, behavior: 'smooth' });
          setActive(id);
          history.pushState(null, '', `#${id}`);
        }
      }
    });
  })();

  // Results Gallery (matches template): bulmaCarousel + lazy-load sources from data-src
  (function initResultsCarousel() {
    const slidesToShow = 1;
    const els = Array.from(document.querySelectorAll('.results-carousel'));
    if (els.length === 0 || !window.bulmaCarousel) return;

    const resultsOptions = {
      slidesToScroll: 1,
      slidesToShow: slidesToShow,
      loop: true,
      infinite: true,
      autoplay: true,
      autoplaySpeed: 5000,
    };

    // Lazy-load: populate <source src> only when video is (mostly) visible.
    const loadVideo = (video) => {
      const source = video.querySelector('source');
      if (!source) return;
      const dataSrc = source.getAttribute('data-src');
      if (!dataSrc) return;
      if (source.getAttribute('src') === dataSrc) return;

      source.setAttribute('src', dataSrc);
      video.load();
    };

    const tryPlay = (video) => {
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => { /* ignore autoplay blocks */ });
    };

    const supportsIO = 'IntersectionObserver' in window;

    els.forEach((el) => {
      const instances = bulmaCarousel.attach(el, resultsOptions);
      const slider = instances && instances[0];

      // BulmaCarousel pagination stores dataset.index (string) into state.next.
      // That can turn state.index into a string after a transition, breaking next/prev math.
      if (slider && typeof slider.on === 'function') {
        slider.on('after:show', function (state) {
          if (!state) return;
          state.index = parseInt(state.index, 10);
          state.next = parseInt(state.next, 10);
          state.length = parseInt(state.length, 10);
        });
      }

      if (!supportsIO) {
        // Fallback: eagerly load the first few videos.
        Array.from(el.querySelectorAll('video')).slice(0, slidesToShow).forEach(v => {
          loadVideo(v);
          tryPlay(v);
        });
      } else {
        const io = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            const video = entry.target;
            if (!(video instanceof HTMLVideoElement)) return;

            if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
              loadVideo(video);
              tryPlay(video);
            } else {
              video.pause();
            }
          });
        }, { root: null, threshold: [0, 0.6, 0.9] });

        Array.from(el.querySelectorAll('video')).forEach(v => io.observe(v));
      }

      // Pause autoplay on interaction so users can browse.
      el.addEventListener('click', function () {
        if (el.bulmaCarousel) el.bulmaCarousel.pause();
      });
      el.addEventListener('touchstart', function () {
        if (el.bulmaCarousel) el.bulmaCarousel.pause();
      }, { passive: true });
    });
  })();

  // AI-generated elbow connector arrows (fixed start label -> scrolling video sections)
  (function initAIGeneratedConnectors() {
    const calloutText = document.querySelector('.ai-generated-callout__text');
    if (!calloutText) return;

    // Keep this ordering aligned with the page section order.
    const targets = [
      { id: 'youtube-video', name: 'YouTube' },
      // Two separate arrows inside the Results Gallery section
      { id: 'results-human', name: 'Hand Morphology' },
      { id: 'results-robot', name: 'Robot Gripper Morphology' },
      { id: 'multi-stage-planning', name: 'Multi-stage Planning' },
      { id: 'prompt-following', name: 'Prompt Following' },
      { id: 'qualitative-comparisons', name: 'Qualitative Comparisons' },
    ];

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const svgNS = 'http://www.w3.org/2000/svg';

    // Create a fixed, full-viewport SVG layer for connectors.
    const svg = document.createElementNS(svgNS, 'svg');
    svg.classList.add('ai-generated-connectors');
    svg.setAttribute('aria-hidden', 'true');

    // Arrowhead marker
    const defs = document.createElementNS(svgNS, 'defs');
    const marker = document.createElementNS(svgNS, 'marker');
    marker.setAttribute('id', 'aiConnectorArrowHead');
    // Use user-space units so arrowhead size does NOT scale with stroke width.
    marker.setAttribute('markerUnits', 'userSpaceOnUse');
    // Small arrowhead in screen-space units (roughly pixels in our full-viewport viewBox).
    // ~2x scale
    marker.setAttribute('markerWidth', '40');
    marker.setAttribute('markerHeight', '40');
    marker.setAttribute('viewBox', '0 0 40 40');
    marker.setAttribute('overflow', 'visible');
    // Make the arrow tip land exactly at the path end point.
    // Overhang the tip past the path endpoint so no connector stroke peeks beyond the tip.
    marker.setAttribute('refX', '20');
    marker.setAttribute('refY', '20');
    marker.setAttribute('orient', 'auto');
    const head = document.createElementNS(svgNS, 'path');
    head.classList.add('ai-generated-connector-head');
    head.setAttribute('d', 'M0,0 L40,20 L0,40 Z');
    head.setAttribute('fill', 'currentColor');
    marker.appendChild(head);
    defs.appendChild(marker);
    svg.appendChild(defs);

    // One path per target (we'll show/hide based on visibility).
    const paths = targets.map(() => {
      const p = document.createElementNS(svgNS, 'path');
      p.classList.add('ai-generated-connector-line');
      p.setAttribute('marker-end', 'url(#aiConnectorArrowHead)');
      p.style.opacity = '0';
      svg.appendChild(p);
      return p;
    });

    document.body.appendChild(svg);

    let raf = null;
    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };

    function getTargetRect(targetEl) {
      // For sections with carousels/transforms, the first <video> can be off-screen.
      // Use the section/container rect instead so visibility detection stays correct.
      if (targetEl.id === 'results-gallery' || targetEl.id === 'results-human' || targetEl.id === 'results-robot') {
        return targetEl.getBoundingClientRect();
      }
      const focus = targetEl.querySelector('video, iframe') || targetEl;
      return focus.getBoundingClientRect();
    }

    function getContentRightEdge(targetEl) {
      // Prefer the nearest ancestor container (works when the target is inside the content box).
      let container = targetEl.closest('.container.is-max-desktop');
      // If the target is a section wrapper (outside the content box), fall back to the first inner container.
      if (!container) container = targetEl.querySelector?.('.container.is-max-desktop') || null;
      if (!container) return null;
      return container.getBoundingClientRect().right;
    }

    function getVisibleTargets(viewportH, viewportW) {
      const visible = [];
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        const el = document.getElementById(t.id);
        if (!el) continue;
        const r = getTargetRect(el);
        const isVisible = r.bottom > 80 && r.top < viewportH - 80 && r.right > 0 && r.left < viewportW;
        if (!isVisible) continue;
        visible.push({ i, el, r, cy: r.top + r.height / 2 });
      }
      // Top-to-bottom ordering helps keep the "fan" stable while scrolling.
      visible.sort((a, b) => a.cy - b.cy);
      return visible;
    }

    function update() {
      raf = null;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const EDGE_GAP_PX = 28; // ~2x: whitespace between content right edge and arrow tip

      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.setAttribute('width', String(w));
      svg.setAttribute('height', String(h));

      const calloutRect = calloutText.getBoundingClientRect();
      // Tail anchored to the true vertical center of the callout box.
      const sx = clamp(calloutRect.left - 20, 10, w - 10);
      const sy = clamp(calloutRect.top + calloutRect.height / 2, 20, h - 20);

      const visible = getVisibleTargets(h, w);
      // Keep it readable if lots of sections are visible at once.
      const MAX_ARROWS = 4;
      // Prefer showing both Results-gallery sub-arrows when they are visible.
      const pinnedIds = new Set(['results-human', 'results-robot']);
      const pinned = visible.filter(v => pinnedIds.has(v.el && v.el.id));
      const others = visible.filter(v => !pinnedIds.has(v.el && v.el.id));
      const ordered = pinned.length ? pinned.concat(others) : visible;
      const chosen = ordered.length <= MAX_ARROWS ? ordered : ordered.slice(0, MAX_ARROWS);

      // Default: hide everything.
      for (const p of paths) p.style.opacity = '0';
      if (chosen.length === 0) return;

      // Fan-out near the callout without moving the true tail point.
      const FAN_PX = 36; // ~2x
      const mid = (chosen.length - 1) / 2;

      for (let order = 0; order < chosen.length; order++) {
        const { i, el, r } = chosen[order];
        const p = paths[i];

        // End of arrow: stop at the right edge of the content box (do NOT point into the content).
        const contentRight = getContentRightEdge(el);
        const exBase = contentRight ?? r.right;
        const ex = clamp(exBase + EDGE_GAP_PX, 10, w - 10);
        const ey = clamp(r.top + r.height / 2, 20, h - 20);

        // Smooth connector. Add slight y-offset to the first control point to separate curves.
        const dx = clamp((sx - ex) * 0.55, 180, 520); // ~2x
        const c1x = clamp(sx - dx, 10, w - 10);
        const c2x = clamp(ex + dx * 0.55, 10, w - 10);
        const offsetY = (order - mid) * FAN_PX;
        const c1y = clamp(sy + offsetY, 20, h - 20);

        const d = `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${ey}, ${ex} ${ey}`;
        p.setAttribute('d', d);
        p.style.opacity = '1';
      }
    }

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();
  })();
});
