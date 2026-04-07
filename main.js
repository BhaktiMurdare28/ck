/* ============================================================
   CORE KONSTRUCT — main.js
   Landing page: scroll reveal, navbar, FAQ, character counter,
   testimonial carousel, counter animation, mobile nav
   ============================================================ */

// ── Navbar scroll effect ──────────────────────────────────────
const navbar = document.getElementById('navbar');
if (navbar) {
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
}

// ── Mobile nav toggle ─────────────────────────────────────────
const hamburger    = document.getElementById('hamburger');
const mobileNav    = document.getElementById('mobile-nav');
if (hamburger && mobileNav) {
  hamburger.addEventListener('click', () => {
    mobileNav.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', mobileNav.classList.contains('open'));
  });
  mobileNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => mobileNav.classList.remove('open'));
  });
}

// ── Scroll Reveal (IntersectionObserver) ─────────────────────
const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
if (revealEls.length) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, entry.target.dataset.delay ? parseInt(entry.target.dataset.delay) : 0);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => observer.observe(el));
}

// ── FAQ Accordion ─────────────────────────────────────────────
const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach(item => {
  const btn    = item.querySelector('.faq-question');
  const answer = item.querySelector('.faq-answer');
  if (!btn || !answer) return;

  btn.addEventListener('click', () => {
    const isActive = item.classList.contains('active');
    // Close all
    faqItems.forEach(fi => {
      fi.classList.remove('active');
      const a = fi.querySelector('.faq-answer');
      if (a) a.style.maxHeight = '0';
    });
    // Toggle clicked
    if (!isActive) {
      item.classList.add('active');
      answer.style.maxHeight = answer.scrollHeight + 'px';
    }
  });
});

// ── Character Counter (contact form) ─────────────────────────
const msgBox   = document.getElementById('contact-message');
const counter  = document.getElementById('char-counter');
const MAX_CHAR = 500;
if (msgBox && counter) {
  const update = () => {
    const len = msgBox.value.length;
    counter.textContent = `${len} / ${MAX_CHAR} characters`;
    counter.className = 'char-counter';
    if (len > MAX_CHAR * 0.8) counter.classList.add('warning');
    if (len > MAX_CHAR * 0.95) { counter.classList.remove('warning'); counter.classList.add('danger'); }
    if (len > MAX_CHAR) {
      msgBox.value = msgBox.value.slice(0, MAX_CHAR);
      counter.textContent = `${MAX_CHAR} / ${MAX_CHAR} characters (limit reached)`;
    }
  };
  msgBox.addEventListener('input', update);
  update();
}

// ── Contact Form Submit ───────────────────────────────────────
const contactForm    = document.getElementById('contact-form');
const formSuccessMsg = document.getElementById('form-success');
if (contactForm) {
  contactForm.addEventListener('submit', e => {
    e.preventDefault();
    contactForm.style.display = 'none';
    if (formSuccessMsg) formSuccessMsg.style.display = 'block';
  });
}

// ── Testimonial Carousel ──────────────────────────────────────
const track = document.getElementById('carousel-track');
const dots  = document.querySelectorAll('.carousel-dot');
let current = 0;
let autoplay;

function goToSlide(idx) {
  if (!track) return;
  const cards  = track.querySelectorAll('.testi-card');
  const visible = Math.max(1, Math.floor(track.parentElement.offsetWidth / 380));
  const maxIdx = Math.max(0, cards.length - visible);
  current = Math.min(Math.max(idx, 0), maxIdx);
  const offset = current * (cards[0] ? cards[0].offsetWidth + 28 : 408);
  track.style.transform = `translateX(-${offset}px)`;
  dots.forEach((d, i) => d.classList.toggle('active', i === current));
}

if (dots.length) {
  dots.forEach((dot, i) => dot.addEventListener('click', () => { clearInterval(autoplay); goToSlide(i); }));
  autoplay = setInterval(() => {
    const cards   = track ? track.querySelectorAll('.testi-card').length : 0;
    const visible = Math.max(1, Math.floor((track ? track.parentElement.offsetWidth : 1200) / 380));
    goToSlide(current + 1 > cards - visible ? 0 : current + 1);
  }, 4000);
  goToSlide(0);
}

// ── Counter Animation ─────────────────────────────────────────
function animateCounter(el) {
  const target = parseInt(el.dataset.target || el.textContent.replace(/\D/g, ''));
  const suffix = el.dataset.suffix || '';
  const duration = 1800;
  const start = performance.now();
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(ease * target) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

const counterEls = document.querySelectorAll('[data-counter]');
if (counterEls.length) {
  const co = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { animateCounter(e.target); co.unobserve(e.target); }
    });
  }, { threshold: 0.5 });
  counterEls.forEach(el => co.observe(el));
}

// ── Smooth scroll for anchor links ───────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ── Toast notification helper ─────────────────────────────────
function showToast(msg, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}
window.showToast = showToast;
