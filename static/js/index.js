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
  var carousels = bulmaCarousel.attach('.carousel', options);

  // Loop on each carousel initialized
  for (var i = 0; i < carousels.length; i++) {
    // Add listener to user interaction events
    carousels[i].element.addEventListener('click', function () {
      // Stop autoplay on user interaction
      carousels[i].pause();
    });
    carousels[i].element.addEventListener('touchstart', function () {
      // Stop autoplay on user interaction
      carousels[i].pause();
    });
  }

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
});
