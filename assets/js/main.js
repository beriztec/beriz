const header = document.getElementById('header');
const menuBtn = document.getElementById('menuBtn');
const mobileNav = document.getElementById('mobileNav');
const logoStage = document.getElementById('berizLogoStage');
const scrollLogo = document.getElementById('berizScrollLogo');
const progressFill = document.getElementById('logoProgressFill');
const capabilities = [...document.querySelectorAll('[data-capability]')];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const steps = document.querySelectorAll('.method-step');
const lineFill = document.getElementById('lineFill');

menuBtn?.addEventListener('click', () => {
  mobileNav.classList.toggle('open');
  menuBtn.classList.toggle('open');
  menuBtn.setAttribute('aria-label', mobileNav.classList.contains('open') ? 'Fechar menu' : 'Abrir menu');
});
mobileNav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  mobileNav.classList.remove('open');
  menuBtn?.classList.remove('open');
}));

const io = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el));

/* Mobile reveals use smaller distances and staggered timing so touch
   layouts keep the same sense of progression as the desktop experience. */
const mobileMotionQuery = window.matchMedia('(max-width: 700px)');
if (mobileMotionQuery.matches) {
  const mobileTargets = [...document.querySelectorAll('.brand-card, .social-service, .profile-note, .audience-cell, .srow')];
  mobileTargets.forEach((element, index) => {
    element.classList.add('mobile-reveal');
    element.style.setProperty('--mobile-delay', `${(index % 4) * 70}ms`);
  });

  if (reduceMotion) {
    mobileTargets.forEach(element => element.classList.add('mobile-in'));
  } else {
    const mobileIO = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('mobile-in');
        mobileIO.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -4% 0px' });
    mobileTargets.forEach(element => mobileIO.observe(element));
  }
}

/* Contact modal + lead capture */
const contactModal = document.getElementById('contactModal');
const contactDialog = contactModal?.querySelector('.contact-dialog');
const contactForm = document.getElementById('contactForm');
const contactSuccess = document.getElementById('contactSuccess');
const contactFormStatus = document.getElementById('contactFormStatus');
const contactTriggers = document.querySelectorAll('a[href="#contato"], a[href^="mailto:contato@"]');
let lastContactTrigger = null;

function setContactStatus(message = '', type = 'error') {
  if (!contactFormStatus) return;
  contactFormStatus.textContent = message;
  contactFormStatus.dataset.type = type;
}

function openContactModal(trigger) {
  if (!contactModal || !contactDialog || !contactForm) return;
  lastContactTrigger = trigger || document.activeElement;
  contactModal.inert = false;
  contactModal.classList.add('is-open');
  contactModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  contactForm.querySelector('[name="source_page"]').value = window.location.href;
  contactForm.querySelector('[name="contact_context"]').value = trigger?.textContent?.trim() || 'Contato';
  setContactStatus();
  window.setTimeout(() => contactForm.querySelector('input:not([type="hidden"])')?.focus(), 180);
}

function closeContactModal() {
  if (!contactModal) return;
  contactModal.classList.remove('is-open');
  contactModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  window.setTimeout(() => { contactModal.inert = true; }, 360);
  window.setTimeout(() => lastContactTrigger?.focus?.(), 80);
}

contactTriggers.forEach(trigger => trigger.addEventListener('click', event => {
  event.preventDefault();
  openContactModal(trigger);
}));
contactModal?.querySelectorAll('[data-close-contact]').forEach(button => button.addEventListener('click', closeContactModal));
document.addEventListener('keydown', event => {
  if (!contactModal?.classList.contains('is-open')) return;
  if (event.key === 'Escape') closeContactModal();
  if (event.key !== 'Tab' || !contactDialog) return;
  const focusable = [...contactDialog.querySelectorAll('button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), a[href]')];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

const whatsappInput = contactForm?.querySelector('[name="whatsapp"]');
whatsappInput?.addEventListener('input', event => {
  const digits = event.target.value.replace(/\D/g, '').slice(0, 11);
  event.target.setCustomValidity('');
  let formatted = digits;
  if (digits.length > 2) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length > 7) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  event.target.value = formatted;
});

function validateContactForm() {
  if (!contactForm) return false;
  let valid = true;
  if (whatsappInput) {
    const whatsappDigits = whatsappInput.value.replace(/\D/g, '');
    whatsappInput.setCustomValidity(whatsappDigits.length >= 10 ? '' : 'Informe um WhatsApp com DDD.');
  }
  contactForm.querySelectorAll('.form-field').forEach(field => field.classList.remove('has-error'));
  [...contactForm.elements].forEach(field => {
    if (!field.willValidate || field.checkValidity()) return;
    field.closest('.form-field')?.classList.add('has-error');
    valid = false;
  });
  if (!valid) setContactStatus('Revise os campos obrigatórios antes de continuar.');
  return valid;
}

/* Envio: o formulário monta uma mensagem estruturada com os dados do lead
   e abre o WhatsApp da Beriz com ela pronta. Nada é gravado em servidor.
   A janela é aberta de forma síncrona, ainda dentro do clique, para não
   ser bloqueada pelo navegador. */
const WHATSAPP_NUMBER = '5511994724695';
const contactWhatsLink = document.getElementById('contactWhatsLink');

function buildWhatsAppMessage(formData) {
  const field = name => String(formData.get(name) || '').trim();
  const lines = ['Olá! Vim pelo site da Beriz e gostaria de conversar.', ''];
  const add = (label, value) => { if (value) lines.push(`*${label}:* ${value}`); };
  add('Nome', field('name'));
  add('E-mail', field('email'));
  add('WhatsApp', field('whatsapp'));
  add('Empresa', field('company'));
  add('Faturamento mensal', field('monthly_revenue'));
  add('Objetivo', field('main_goal'));
  add('Desafio atual', field('message'));
  return lines.join('\n');
}

contactForm?.addEventListener('submit', event => {
  event.preventDefault();
  if (!validateContactForm()) return;
  const formData = new FormData(contactForm);
  if (String(formData.get('website') || '').trim()) {
    contactForm.hidden = true;
    contactSuccess.hidden = false;
    return;
  }

  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildWhatsAppMessage(formData))}`;
  if (contactWhatsLink) contactWhatsLink.href = waUrl;
  window.open(waUrl, '_blank', 'noopener');

  setContactStatus();
  contactForm.reset();
  contactForm.hidden = true;
  contactSuccess.hidden = false;
});

contactModal?.querySelectorAll('[data-close-contact]').forEach(button => button.addEventListener('click', () => {
  window.setTimeout(() => {
    if (contactForm) contactForm.hidden = false;
    if (contactSuccess) contactSuccess.hidden = true;
  }, 380);
}));

const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));

function logoScrollProgress() {
  const hero = document.querySelector('.hero');
  if (!hero || !logoStage) return 0;
  const vh = window.innerHeight;

  if (window.innerWidth <= 980) {
    const stageRect = logoStage.getBoundingClientRect();
    const start = vh * 0.92;
    const end = vh * 0.22;
    return clamp((start - stageRect.top) / (start - end));
  }

  const rect = hero.getBoundingClientRect();
  const scrollable = Math.max(1, hero.offsetHeight - vh * 0.72);
  return clamp((-rect.top + 24) / scrollable);
}

function updateLogoInteraction() {
  if (!logoStage || !scrollLogo) return;
  const p = reduceMotion ? 1 : logoScrollProgress();

  const rotation = reduceMotion ? 0 : p * 96;
  const opacity = reduceMotion ? 1 : 1 - p * 0.76;

  logoStage.style.setProperty('--logo-rotation', `${rotation}deg`);
  logoStage.style.setProperty('--logo-opacity', opacity.toFixed(3));
  if (progressFill) progressFill.style.width = `${(p * 100).toFixed(1)}%`;

  capabilities.forEach((item, index) => {
    const threshold = 0.12 + index * 0.115;
    item.classList.toggle('is-visible', p >= threshold);
  });
}

function updateMethod() {
  const flow = document.querySelector('.method-flow');
  if (!flow || !lineFill) return;
  const rect = flow.getBoundingClientRect();
  const vh = window.innerHeight;
  const progress = clamp((vh * 0.72 - rect.top) / rect.height);
  lineFill.style.height = `${progress * 100}%`;
  steps.forEach((step, i) => step.classList.toggle('in', progress >= (i + 0.35) / steps.length));
}

function updateScroll() {
  header?.classList.toggle('scrolled', window.scrollY > 35);
  updateLogoInteraction();
  updateMethod();
}

let ticking = false;
function requestUpdate() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    updateScroll();
    ticking = false;
  });
}

window.addEventListener('scroll', requestUpdate, { passive: true });
window.addEventListener('resize', requestUpdate, { passive: true });
updateScroll();

/* ================= BERIZ V9 — EDITORIAL HEADER + INSTANT CURSOR ================= */

/* Preloader: single orchestrated entrance, then release scroll */
const preloader = document.getElementById('preloader');
const introSeen = document.documentElement.classList.contains('intro-seen');
if (reduceMotion || !preloader || introSeen) {
  preloader?.classList.add('done');
} else {
  /* Abertura 3D: a logo gira e é preenchida de verde, depois "mergulha".
     O tempo conta desde o início da navegação (não desde que este script
     rodou): no total fica ~1,15s e, se a página demorou mais que isso para
     chegar aqui, a abertura sai na hora. Não espera imagens (evento load).
     Só aparece na primeira página vista da sessão. */
  document.body.classList.add('loading');
  try { sessionStorage.setItem('berizIntro', '1'); } catch (_) {}
  const wait = Math.max(0, 1150 - performance.now());
  setTimeout(() => {
    preloader.classList.add('exit');
    setTimeout(() => {
      preloader.classList.add('done');
      document.body.classList.remove('loading');
    }, 480);
  }, wait);
}

/* Scroll progress bar */
const scrollProgress = document.getElementById('scrollProgress');
function updateScrollProgress() {
  if (!scrollProgress) return;
  const doc = document.documentElement;
  const max = doc.scrollHeight - doc.clientHeight;
  const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
  scrollProgress.style.width = `${pct}%`;
}
window.addEventListener('scroll', updateScrollProgress, { passive: true });
updateScrollProgress();

/* Custom cursor — fine pointer devices only.
   Position is applied 1:1 with the mouse (no lerp/lag): both the dot
   and the ring are updated directly inside mousemove via rAF, so the
   cursor never trails behind the pointer. Only hover-state SIZE/OPACITY
   changes keep a short CSS transition (see .cursor-ring in style.css). */
const fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
if (fine && !reduceMotion) {
  document.body.classList.add('has-cursor');
  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  document.body.append(dot, ring);

  let mx = innerWidth / 2, my = innerHeight / 2;
  let queued = false;

  function paintCursor() {
    const t = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
    dot.style.transform = t;
    ring.style.transform = t;
    queued = false;
  }

  window.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    if (!queued) {
      queued = true;
      requestAnimationFrame(paintCursor);
    }
  });

  document.querySelectorAll('a, button, .btn, .pilar, .srow, .audience-cell').forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('hover'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
  });
}

/* Cursor spotlight on dark sections */
if (!reduceMotion) {
  document.querySelectorAll('.spotlight').forEach(section => {
    section.addEventListener('mousemove', e => {
      const rect = section.getBoundingClientRect();
      section.style.setProperty('--sx', `${e.clientX - rect.left}px`);
      section.style.setProperty('--sy', `${e.clientY - rect.top}px`);
    });
  });
}

/* Magnetic pull on primary CTAs */
if (fine && !reduceMotion) {
  document.querySelectorAll('.btn-primary, .btn-green').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * 0.22}px, ${y * 0.28}px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  });
}

/* Orchestrated clip-line reveal for the hero headline */
const clipIO = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      clipIO.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });
document.querySelectorAll('.clip-lines').forEach(el => clipIO.observe(el));

/* ================= Dissolving logo — reusable particle field =================
   Procedurally builds a particle field shaped like the Beriz mark (a
   sphere made of flowing wave bands): dots near the center stay dense
   (forming the mark), dots further out — especially toward the bottom —
   are scattered outward and faded, giving a crumbling/sand-like look.
   This is pure math (no image pixel sampling), so it always renders the
   same way regardless of how the page is opened. A slow per-particle
   drift keeps it feeling alive without being distracting. Pauses
   automatically when its section is off-screen. When `scrollDust` is
   on, the loose/scattered particles also get an extra push tied to
   scroll position — like sand blowing off the mark as the section
   passes through the viewport. `clipSide` ('left' | 'right') hard-locks
   the whole effect to one half of the screen. */
function mountDissolveField(opts) {
  const canvas = document.getElementById(opts.canvasId);
  const section = document.querySelector(opts.sectionSelector);
  if (!canvas || !section) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth <= 720 ? 1.5 : 2);

  let particles = [];
  let W = 0, H = 0;
  let raf = null;
  let visible = true;
  let clock = performance.now();

  function buildParticles() {
    const count = window.innerWidth <= 720 ? 80 : 100;
    const bands = 200;
    const mult = opts.alphaMult || 1;
    const list = [];
    let attempts = 0;

    while (list.length < count && attempts < count * 8) {
      attempts++;
      const rr = 0.5 * Math.sqrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const x = rr * Math.cos(theta);
      const y = rr * Math.sin(theta);
      const dist = rr / 0.5;

      // Flowing wavy bands, echoing the mark's stripe pattern —
      // thin gaps between bands stand in for the negative-space lines.
      const wave = Math.sin((y * bands + Math.sin(theta * 2 + 1.3) * 1.1) * Math.PI + x * 1.6);
      if (wave < 0.08) continue;

      // Mostly grouped/clustered (reads as the mark at rest); only a
      // minority sit loose as ambient sand, concentrated at the edges.
      const bottomBias = Math.max(0, y / 0.5) * 0.22;
      const scatterChance = Math.min(0.5, Math.pow(dist, 2.2) * 0.4 + bottomBias);
      const dust = Math.random() < scatterChance;

      let px = x, py = y;
      if (dust) {
        const force = (0.25 + Math.random() * 0.9) * (0.4 + dist);
        const ang = Math.random() * Math.PI * 2;
        px += Math.cos(ang) * force * 0.35;
        py += Math.sin(ang) * force * 0.35 + dist * 0.18;
      }

      list.push({
        x: px, y: py,
        dust,
        baseAlpha: (dust ? (0.10 + Math.random() * 0.14) : (0.30 + Math.random() * 0.28)) * mult,
        r: dust ? (0.6 + Math.random() * 1) : (0.9 + Math.random() * 1.4),
        seed: Math.random() * Math.PI * 2,
        speed: 0.15 + Math.random() * 0.25,
        drift: 3 + Math.random() * 6
      });
    }
    particles = list;
  }

  function resize() {
    W = section.offsetWidth;
    H = section.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function scrollProgress() {
    if (!opts.scrollDust) return 0.5;
    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    return clamp((vh - rect.top) / (vh + rect.height));
  }

  function draw(t) {
    if (!visible) { raf = null; return; }
    ctx.clearRect(0, 0, W, H);
    const isNarrow = W < 900;
    const anchorX = isNarrow ? 0.5 : opts.anchorX;
    const cx = W * anchorX;
    const cy = H * opts.anchorY;
    const scale = isNarrow
      ? Math.min(W, H * 1.4) * 0.85
      : Math.min(W * opts.scaleW, H * opts.scaleH) * opts.scaleMult;
    const time = reduceMotion ? 0 : (t - clock) / 1000;
    const sp = (scrollProgress() - 0.5) * (opts.scrollDust ? 1 : 0);

    ctx.save();
    if (!isNarrow && opts.clipSide === 'left') {
      ctx.beginPath(); ctx.rect(0, 0, W / 2, H); ctx.clip();
    } else if (!isNarrow && opts.clipSide === 'right') {
      ctx.beginPath(); ctx.rect(W / 2, 0, W / 2, H); ctx.clip();
    }

    ctx.fillStyle = opts.color || '#f1efe9';
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const wobX = reduceMotion ? 0 : Math.sin(time * p.speed + p.seed) * p.drift;
      const wobY = reduceMotion ? 0 : Math.cos(time * p.speed + p.seed) * p.drift * 0.6;
      const dustX = sp * (p.dust ? 260 : 30);
      const dustY = sp * (p.dust ? 40 : 6);
      const fade = 1 - Math.min(0.85, Math.abs(sp) * (p.dust ? 1.5 : 0.7));
      const px = cx + p.x * scale + wobX + dustX;
      const py = cy + p.y * scale + wobY + dustY;
      ctx.globalAlpha = p.baseAlpha * fade;
      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    raf = requestAnimationFrame(draw);
  }

  function play() {
    if (raf || !particles.length) return;
    clock = performance.now();
    raf = requestAnimationFrame(draw);
  }
  function pause() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  buildParticles();
  resize();
  draw(performance.now());
  play();

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      buildParticles();
      draw(performance.now());
    }, 150);
  }, { passive: true });

  const dIO = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      visible = entry.isIntersecting;
      if (visible) play(); else pause();
    });
  }, { threshold: 0.01 });
  dIO.observe(section);
}

/* Opening hero — mark anchored to the left half, dissolves/scatters
   as the section scrolls out of view. Hard-clipped to the left half
   of the screen. */
mountDissolveField({
  canvasId: 'berizDissolve',
  sectionSelector: '.opening-hero',
  anchorX: 0.26,
  anchorY: 0.5,
  scaleW: 0.34,
  scaleH: 0.85,
  scaleMult: 1,
  alphaMult: 1,
  color: '#f1efe9',
  scrollDust: true,
  clipSide: 'left'
});

/* Método section — mark emerging from the right (opposite side of the
   hero mark), full normal color, hard-clipped to the right half of the
   screen, with a dust drift that responds to how far the section has
   scrolled through view */
mountDissolveField({
  canvasId: 'berizMethodDissolve',
  sectionSelector: '.method',
  anchorX: 0.8,
  anchorY: 0.32,
  scaleW: 0.4,
  scaleH: 0.4,
  scaleMult: 1,
  alphaMult: 1,
  color: '#11120f',
  scrollDust: true,
  clipSide: 'right'
});
