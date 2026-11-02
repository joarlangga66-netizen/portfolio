// ===== CONFIG =====
const CONTACT_EMAIL = 'joarlangga66@gmail.com';
const WEB3FORMS_KEY = '23c8e7be-e8a7-4613-88e2-a70a69866941'; // public form key, safe in site code

const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Year
document.querySelectorAll('#year, .year').forEach((el) => (el.textContent = new Date().getFullYear()));

// ===== Tools orbit: tools circle the centered heading.
// Two rings (outer and inner) turn together in one direction, keeping the tools in order,
// like the original strip. The back half is small and blurred; the front half is sharp.
// On narrow screens (phones) the tools circle as icon bubbles; tapping one shows its name.
// Drag (mouse or finger) left/right to spin. Reduced-motion visitors keep the plain marquee below.
(function toolsOrbit() {
  const box = document.querySelector('.tools');
  if (!box || reduceMotion) return;
  const compact = box.clientWidth < 860;
  const items = [...box.querySelectorAll('.marquee__track li')];
  const orbit = document.createElement('div');
  orbit.className = 'orbit';
  orbit.setAttribute('aria-hidden', 'true');
  const outerCount = Math.ceil(items.length / 2);
  const counts = [outerCount, items.length - outerCount];
  const nodes = items.map((li, i) => {
    const ring = i < outerCount ? 0 : 1;           // 0 = outer, 1 = inner
    const idx = ring ? i - outerCount : i;
    const el = document.createElement('span');
    el.className = 'orbit__item';
    const img = li.querySelector('img');
    el.innerHTML = `<span class="orbit__pill">${img ? img.outerHTML : ''}<span class="orbit__name">${li.textContent.trim()}</span></span>`;
    orbit.appendChild(el);
    // inner ring is offset half a step so items don't line up with the outer ring
    return { el, ring, base: ((idx + ring * 0.5) / counts[ring]) * Math.PI * 2 };
  });
  box.classList.add('tools--orbit');
  if (compact) box.classList.add('tools--orbit-compact');
  box.appendChild(orbit);
  orbit.querySelectorAll('img').forEach((img) => (img.draggable = false));

  const SPEED = 0.0001; // radians per ms (about one full turn per minute)
  let w = 0, h = 0;
  const measure = () => { w = orbit.clientWidth; h = orbit.clientHeight; };
  measure();
  addEventListener('resize', measure);
  const radii = () => {
    const rx = compact ? w / 2 - 32 : Math.min(w / 2 - 90, 480);
    const ry = compact ? Math.min(h / 2 - 34, 150) : Math.min(h / 2 - 26, 165);
    return compact ? [[rx, ry], [rx * 0.6, ry * 0.58]] : [[rx, ry], [rx * 0.73, ry * 0.6]];
  };

  // rot = current turn of the rings (radians); v = spin speed (radians per ms).
  // It eases to a stop while a mouse is over the section, or for a moment after a tool is tapped.
  let rot = 0, v = SPEED, last = performance.now(), hovered = false, holdUntil = 0, onScreen = true;
  box.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hovered = true; });
  box.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hovered = false; });
  box.addEventListener('fx-hold', () => (holdUntil = performance.now() + 1800));
  new IntersectionObserver(([e]) => (onScreen = e.isIntersecting)).observe(box);

  // Drag left/right to spin; letting go keeps the spin going, then it slows down.
  // A drag only starts after a few pixels of sideways movement, so taps and clicks still work.
  let pressed = false, dragging = false, startX = 0, lastX = 0, lastMove = 0, dragV = 0;
  box.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    pressed = true; dragging = false; startX = lastX = e.clientX; lastMove = performance.now(); dragV = 0;
  });
  box.addEventListener('pointermove', (e) => {
    if (!pressed) return;
    if (!dragging) {
      if (Math.abs(e.clientX - startX) < 6) return;
      dragging = true;
      try { box.setPointerCapture(e.pointerId); } catch (err) {} // keep tracking outside the section
      box.classList.add('is-dragging');
    }
    const now = performance.now();
    const step = -(e.clientX - lastX) / radii()[0][0]; // front tools follow the pointer
    rot += step;
    dragV = dragV * 0.6 + (step / Math.max(now - lastMove, 8)) * 0.4;
    lastX = e.clientX; lastMove = now;
  });
  const endDrag = () => {
    pressed = false;
    if (!dragging) return;
    dragging = false;
    box.classList.remove('is-dragging');
    if (performance.now() - lastMove > 120) dragV = 0; // held still before letting go: no fling
    v = Math.max(-0.012, Math.min(0.012, dragV));
  };
  box.addEventListener('pointerup', endDrag);
  box.addEventListener('pointercancel', endDrag);

  function frame(now) {
    const dt = Math.min(now - last, 50);
    last = now;
    if (!dragging) {
      const target = hovered || now < holdUntil ? 0 : SPEED;
      v += (target - v) * (1 - Math.exp(-dt / 900));
      rot += v * dt;
    }
    if (onScreen) {
      const R = radii();
      const cx = w / 2, cy = h / 2;
      for (const n of nodes) {
        const a = n.base + rot;         // front half moves right-to-left, like the old strip
        const depth = Math.sin(a);      // -1 = back, 1 = front
        const k = (depth + 1) / 2;      // 0 back .. 1 front
        const px = cx + Math.cos(a) * R[n.ring][0];
        const py = cy + depth * R[n.ring][1];
        const s = 0.58 + 0.42 * k;
        const st = n.el.style;
        st.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) translate(-50%, -50%) scale(${s.toFixed(3)})`;
        st.filter = k > 0.92 ? 'none' : `blur(${((1 - k) * 3.2).toFixed(2)}px)`;
        st.opacity = (0.5 + 0.5 * k).toFixed(3);
        st.zIndex = Math.round(k * 20); // heading sits at 15: only the front of the rings passes over it
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

// ===== Box effect: a box tilts toward the pointer, shows its 3D edge, and its edge glows.
// Mouse: while pointing at it. Touch screens: for a moment after a tap (taps only, so scrolling doesn't flash boxes).
(function boxGlow() {
  const BOXES = [
    '.glass', '.card', '.cred', '.svc', '.ind', '.tbl', '.ledger', '.ledger__row', '.quote__card', '.quote__shot',
    '.plate', '.method__steps li', '.form', '.info > div', '.ind-firm', '.about__photo', '.orbit__pill',
  ].join(', ');
  const all = [...document.querySelectorAll(BOXES)];
  // A box that only wraps other boxes (e.g. the frame around the job rows) is skipped,
  // so the inner boxes get the effect and two boxes never tilt at once.
  const boxes = all.filter((el) => !all.some((other) => other !== el && el.contains(other)));
  const EDGE = 1.5; // px per edge layer at the box's far corner (8 layers = about 12px thick)
  let lastType = 'mouse';
  addEventListener('pointerdown', (e) => (lastType = e.pointerType), true);

  // ---- shine: a white band of light sweeps across the box once (clipped to the box's shape)
  function shine(el) {
    if (reduceMotion) return;
    let s = el.querySelector(':scope > .fx-shine');
    if (!s) { s = document.createElement('span'); s.className = 'fx-shine'; s.setAttribute('aria-hidden', 'true'); el.appendChild(s); }
    s.classList.remove('go');
    void s.offsetWidth; // restart the animation
    s.classList.add('go');
  }

  // ---- sparkles: tiny white specks and fragments drift upward and fade out.
  // They live in one fixed layer over the page, so boxes with hidden overflow don't cut them off.
  const sparkLayer = document.createElement('div');
  sparkLayer.className = 'fx-sparks';
  sparkLayer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(sparkLayer);
  let sparksAlive = 0;
  function sparks(el, n, nearX, nearY) {
    if (reduceMotion) return;
    const r = el.getBoundingClientRect();
    for (let i = 0; i < n && sparksAlive < 70; i++) {
      const p = document.createElement('span');
      p.className = 'fx-spark' + (Math.random() < 0.45 ? ' fx-spark--frag' : '');
      let x, y;
      if (nearX != null && Math.random() < 0.6) { // mostly around the pointer
        x = nearX + (Math.random() - 0.5) * 60;
        y = nearY + (Math.random() - 0.5) * 30;
      } else { // otherwise anywhere along the upper part of the box
        x = r.left + Math.random() * r.width;
        y = r.top + r.height * (0.05 + Math.random() * 0.45);
      }
      const size = 2 + Math.random() * 3;
      p.style.cssText =
        `--x:${x.toFixed(0)}px;--y:${y.toFixed(0)}px;--s:${size.toFixed(1)}px;` +
        `--dx:${((Math.random() - 0.5) * 30).toFixed(0)}px;--rise:${(40 + Math.random() * 60).toFixed(0)}px;` +
        `--r:${(Math.random() * 180).toFixed(0)}deg;--t:${(900 + Math.random() * 700).toFixed(0)}ms`;
      sparksAlive++;
      p.addEventListener('animationend', () => { p.remove(); sparksAlive--; });
      sparkLayer.appendChild(p);
    }
  }

  boxes.forEach((el) => {
    el.classList.add('fx-box');
    const pill = el.classList.contains('orbit__pill'); // tool pills: thinner edge, more tilt
    const edge = pill ? 0.75 : EDGE;
    const lean = pill ? 0.4 : 0.25; // keeps a little bottom edge showing even when aimed at the center
    let timer = 0;
    const set = (k, val) => el.style.setProperty(k, val);
    const aim = (clientX, clientY) => {
      const r = el.getBoundingClientRect();
      const x = clientX - r.left, y = clientY - r.top;
      set('--mx', x + 'px');
      set('--my', y + 'px');
      if (reduceMotion) return;
      const max = Math.min(pill ? 12 : 4, 1400 / r.width); // bigger boxes tilt less
      set('--ry', (((x / r.width) - 0.5) * 2 * max).toFixed(2) + 'deg');
      set('--rx', ((0.5 - y / r.height) * 2 * max).toFixed(2) + 'deg');
      // 3D edge: the side opposite the pointer tips toward the viewer, so the box's thickness shows there
      set('--ex', (-((x / r.width) - 0.5) * 2 * edge).toFixed(2) + 'px');
      set('--ey', (-((y / r.height) - 0.5) * 2 * edge + lean).toFixed(2) + 'px');
    };
    const off = () => {
      el.classList.remove('fx-on');
      ['--rx', '--ry'].forEach((k) => set(k, '0deg'));
      ['--ex', '--ey'].forEach((k) => set(k, '0px'));
    };
    let px = null, py = null, trickle = 0;
    el.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      el.classList.add('fx-on');
      px = e.clientX; py = e.clientY;
      shine(el);
      sparks(el, 8, px, py);
      clearInterval(trickle);
      trickle = setInterval(() => sparks(el, 1, px, py), 130); // a gentle trickle while the mouse stays
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      px = e.clientX; py = e.clientY;
      aim(e.clientX, e.clientY);
    });
    el.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse') return;
      clearInterval(trickle);
      off();
    });
    el.addEventListener('click', (e) => {
      if (lastType === 'mouse') return;
      aim(e.clientX, e.clientY);
      shine(el);
      sparks(el, 12, e.clientX, e.clientY);
      el.classList.add('fx-on');
      clearTimeout(timer);
      timer = setTimeout(off, 1600);
      if (pill) el.dispatchEvent(new CustomEvent('fx-hold', { bubbles: true })); // pause the tools briefly
    });
  });
})();

// ===== Tools marquee: duplicate items so the -50% loop is seamless =====
document.querySelectorAll('.marquee__track').forEach((track) => {
  [...track.children].forEach((li) => {
    const copy = li.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    track.appendChild(copy);
  });
});

// ===== Theme toggle =====
function currentTheme() {
  return root.dataset.theme === 'dark' ? 'dark' : 'light';
}
document.getElementById('themeBtn').addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch (e) {} // remember for next visit
});

// ===== Scroll reveal + counters =====
function countUp(el) {
  const target = +el.dataset.count;
  if (reduceMotion) { el.textContent = target; return; }
  // Years (e.g. 2022) count up from a nearby value instead of from 0
  const from = target > 1900 ? target - 12 : 0;
  const start = performance.now();
  const dur = 1400;
  (function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  })(start);
}

const revealObs = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    e.target.querySelectorAll('[data-count]').forEach(countUp);
    revealObs.unobserve(e.target);
  });
}, { threshold: 0.12 });
document.querySelectorAll('[data-reveal]').forEach((el) => revealObs.observe(el));

// ===== Active nav link =====
const navLinks = document.querySelectorAll('.rail__nav a, .tabbar a');
const sectionObs = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const id = '#' + e.target.id;
    navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('.section').forEach((s) => sectionObs.observe(s));

// ===== Mobile tab bar hides on scroll down =====
const tabbar = document.querySelector('.tabbar');
let lastY = scrollY;
addEventListener('scroll', () => {
  const y = scrollY;
  tabbar.classList.toggle('hide', y > lastY && y > 200);
  lastY = y;
}, { passive: true });

// ===== Modal (testimonial screenshots) =====
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modalBody');
let lastFocus = null;

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = '';
  if (lastFocus) lastFocus.focus();
}

// Testimonial screenshot opens in the modal
document.querySelectorAll('[data-shot]').forEach((b) => b.addEventListener('click', () => {
  modalBody.innerHTML = '<h3 style="margin:0 40px 18px 0;font-size:24px">Original message</h3>';
  const img = document.createElement('img');
  img.src = b.dataset.shot;
  img.alt = b.querySelector('img').alt;
  modalBody.appendChild(img);
  lastFocus = b;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  modal.querySelector('.modal__close').focus();
}));
modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeModal));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

// ===== WhatsApp chat widget =====
const WHATSAPP_NUMBER = '639071880968';
const chat = document.getElementById('chat');
const chatPanel = document.getElementById('chatPanel');
const chatFab = document.getElementById('chatFab');
const chatMsg = document.getElementById('chatMsg');
document.getElementById('chatTime').textContent =
  new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

function setChat(open) {
  chat.classList.toggle('open', open);
  chatPanel.hidden = !open;
  chatFab.setAttribute('aria-expanded', String(open));
  chatFab.setAttribute('aria-label', open ? 'Close chat' : 'Chat with Joar on WhatsApp');
  if (open) chatMsg.focus();
}
chatFab.addEventListener('click', () => setChat(chatPanel.hidden));
document.getElementById('chatClose').addEventListener('click', () => { setChat(false); chatFab.focus(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !chatPanel.hidden) { setChat(false); chatFab.focus(); } });
document.getElementById('chatForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatMsg.value.trim() || 'Hi Joar!';
  window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
});

// ===== FAQ: one open at a time =====
const faqs = document.querySelectorAll('.acc details');
faqs.forEach((d) => d.addEventListener('toggle', () => {
  if (d.open) faqs.forEach((o) => { if (o !== d) o.open = false; });
}));

// ===== Contact form (opens mail app) =====
const form = document.getElementById('contactForm');
const hint = document.getElementById('formHint');
const sendBtn = document.getElementById('sendBtn');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = form.elements;
  if (f.website.value) return; // honeypot

  const bad = [];
  if (!f.first.value.trim()) bad.push(f.first);
  if (!/^\S+@\S+\.\S+$/.test(f.email.value.trim())) bad.push(f.email);
  if (f.msg.value.trim().length < 5) bad.push(f.msg);
  form.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));

  if (bad.length) {
    bad.forEach((el) => el.classList.add('invalid'));
    hint.textContent = 'Add your name, a real email, and a short note.';
    hint.className = 'hint err';
    sendBtn.classList.remove('shake'); void sendBtn.offsetWidth; sendBtn.classList.add('shake');
    bad[0].focus();
    return;
  }

  const name = (f.first.value + ' ' + f.last.value).trim();
  const subject = 'Bookkeeping inquiry from ' + name;
  const body = 'Name: ' + name + '\nEmail: ' + f.email.value + '\nSoftware: ' + f.software.value + '\n\n' + f.msg.value;

  // Fallback if direct sending fails: open the visitor's mail app with the message ready
  const openMailApp = () => {
    location.href = 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    hint.textContent = "Couldn't send directly, so your mail app has the message ready. Just hit send.";
    hint.className = 'hint err';
  };

  sendBtn.classList.add('sent');
  sendBtn.disabled = true;
  hint.textContent = 'Sending…';
  hint.className = 'hint';

  // Web3Forms emails the message to the inbox tied to this access key ("Portfolio Contact Form")
  fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      access_key: WEB3FORMS_KEY,
      subject,
      from_name: 'Joar Langga Portfolio',
      name,
      email: f.email.value.trim(),
      service: f.software.value,
      message: f.msg.value.trim(),
    }),
  })
    .then((r) => r.json())
    .then((data) => {
      if (String(data.success) !== 'true') throw new Error(data.message || 'Not sent');
      form.reset();
      hint.textContent = "✓ Message sent! I usually reply the same day.";
      hint.className = 'hint ok';
    })
    .catch(openMailApp)
    .finally(() => {
      sendBtn.classList.remove('sent');
      sendBtn.disabled = false;
    });
});

// ===== Subtle amber sparkles behind the mouse (desktop only, off for reduced motion) =====
if (!reduceMotion && matchMedia('(pointer: fine)').matches) {
  let lastX = 0, lastY = 0, lastT = 0, alive = 0;
  addEventListener('mousemove', (e) => {
    const now = performance.now();
    // Throttle hard so it stays a hint, not a trail
    if (now - lastT < 90 || Math.hypot(e.clientX - lastX, e.clientY - lastY) < 30 || alive >= 6) return;
    lastT = now; lastX = e.clientX; lastY = e.clientY;
    const size = 4 + Math.random() * 3;
    const s = document.createElement('span');
    s.className = 'sparkle';
    s.setAttribute('aria-hidden', 'true');
    s.style.cssText =
      '--x:' + (e.clientX + Math.random() * 10 - 5 - size / 2) + 'px;' +
      '--y:' + (e.clientY + Math.random() * 10 - 5 - size / 2) + 'px;' +
      '--dx:' + (Math.random() * 12 - 6) + 'px;--dy:' + (6 + Math.random() * 10) + 'px;' +
      'width:' + size + 'px;height:' + size + 'px';
    document.body.appendChild(s);
    alive++;
    s.addEventListener('animationend', () => { s.remove(); alive--; });
  }, { passive: true });
}

// ===== Animated contour background =====
(function contours() {
  const canvas = document.getElementById('bg');
  const ctx = canvas.getContext('2d');
  let w, h, dpr;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
    if (vCanvas) { vCanvas.width = w; vCanvas.height = h; layout = null; }
  }

  const LINES = 18;
  const VERSE = '“But my God shall supply all your need according to his riches in glory in Christ Jesus.”   Philippians 4:19';

  function waveY(i, x, t) {
    const nx = x / w;
    return (h / (LINES - 1)) * i
      + Math.sin(nx * 5.2 + t * 0.00018 + i * 0.45) * 38 * dpr
      + Math.sin(nx * 11.3 - t * 0.00011 + i * 0.9) * 14 * dpr
      + Math.cos(nx * 2.1 + i * 0.3 + t * 0.00007) * 46 * dpr;
  }

  // Philippians 4:19 written faintly along a wave. It has its own canvas (#verse) so the blur
  // is a single CSS filter instead of a canvas blur per letter per frame.
  const vCanvas = document.createElement('canvas');
  vCanvas.id = 'verse';
  vCanvas.setAttribute('aria-hidden', 'true');
  canvas.after(vCanvas);
  const vctx = vCanvas.getContext('2d');
  let layout = null; // cached font size, lines and letter widths; rebuilt on resize

  resize();
  addEventListener('resize', resize);
  if (document.fonts) document.fonts.ready.then(() => { layout = null; }); // re-measure once Poppins loads

  function buildLayout() {
    let size = 20 * dpr;
    const font = () => 'italic 500 ' + size + 'px Poppins, system-ui, sans-serif';
    vctx.font = font();
    // Desktop: keep the verse in the content area, not behind the side menu
    const left = innerWidth > 1100 ? (parseFloat(getComputedStyle(root).getPropertyValue('--rail-w')) || 312) * dpr : 0;
    const maxW = (w - left) * 0.9;
    let lines = [VERSE];
    if (vctx.measureText(VERSE).width > maxW) {
      // Narrow screens: split over two waves, shrinking only if still too wide
      const mid = VERSE.lastIndexOf(' ', Math.floor(VERSE.length / 2) + 6);
      lines = [VERSE.slice(0, mid), VERSE.slice(mid + 1)];
      const widest = Math.max(...lines.map((s) => vctx.measureText(s).width));
      if (widest > maxW) { size = Math.max(11 * dpr, (size * maxW) / widest); vctx.font = font(); }
    }
    layout = {
      left,
      font: vctx.font,
      lines: lines.map((text) => {
        const chars = [...text].map((ch) => ({ ch, cw: vctx.measureText(ch).width }));
        return { chars, width: chars.reduce((sum, c) => sum + c.cw, 0) };
      }),
    };
  }

  function drawVerse(t, rgb) {
    if (!layout) buildLayout();
    vctx.clearRect(0, 0, w, h);
    vctx.font = layout.font;
    vctx.fillStyle = 'rgba(' + rgb + ',0.11)';
    const drift = Math.sin(t * 0.00006) * 30 * dpr;
    layout.lines.forEach((line, n) => {
      const i = 14 + n; // lower part of the screen; a second line uses the next wave down
      let x = layout.left + (w - layout.left - line.width) / 2 + drift;
      for (const { ch, cw } of line.chars) {
        const cx = x + cw / 2;
        const angle = Math.atan2(waveY(i, cx + 2, t) - waveY(i, cx - 2, t), 4);
        vctx.setTransform(Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), cx, waveY(i, cx, t) - 6 * dpr);
        vctx.fillText(ch, -cw / 2, 0);
        x += cw;
      }
    });
    vctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    const rgb = getComputedStyle(root).getPropertyValue('--contour').trim() || '11,30,63';
    ctx.lineWidth = 1 * dpr;
    const step = 14 * dpr;
    for (let i = 0; i < LINES; i++) {
      ctx.strokeStyle = 'rgba(' + rgb + ',' + (i % 4 === 0 ? 0.09 : 0.05) + ')';
      ctx.beginPath();
      for (let x = 0; x <= w + step; x += step) {
        const y = waveY(i, x, t);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    drawVerse(t, rgb);
  }

  if (reduceMotion) { draw(0); addEventListener('resize', () => draw(0)); return; }
  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(loop);
  });
  function loop(t) {
    if (!running) return;
    draw(t);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

// ===== Sound effects: a blip when pointing at or clicking something, and card flicks while scrolling.
// No background music. All made with the Web Audio API (no audio files).
// Browsers only allow sound after the visitor's first click, tap or key press.
// A floating speaker button turns it on/off; the choice is remembered.
(function sounds() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  let enabled = true;
  try { enabled = localStorage.getItem('sound') !== 'off'; } catch (e) {}
  let ac = null, master = null, fx = null, ambientGain = null, noise = null;

  // ---- speaker button (sits above the WhatsApp button)
  const btn = document.createElement('button');
  btn.className = 'sound-btn';
  btn.type = 'button';
  btn.innerHTML =
    '<svg class="i-on" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/></svg>' +
    '<svg class="i-off" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M17 9l5 6M22 9l-5 6"/></svg>';
  const paint = () => {
    btn.classList.toggle('is-off', !enabled);
    btn.setAttribute('aria-label', enabled ? 'Turn sound off' : 'Turn sound on');
    btn.title = enabled ? 'Sound on' : 'Sound off';
  };
  paint();
  document.body.appendChild(btn);

  function noiseBuffer() {
    const b = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function reverb() { // short soft room, so clicks don't sound dry
    const len = ac.sampleRate * 1.6;
    const b = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    const conv = ac.createConvolver();
    conv.buffer = b;
    return conv;
  }

  function init() {
    if (ac) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = enabled ? 1 : 0;
    master.connect(ac.destination);
    const rev = reverb();
    const revGain = ac.createGain();
    revGain.gain.value = 0.35;
    rev.connect(revGain).connect(master);
    fx = ac.createGain(); // click sounds: dry + a little room
    fx.connect(master);
    fx.connect(rev);
    noise = noiseBuffer();
  }

  // ---- one-shot sounds
  function blip({ freq, dur, gain, type = 'sine', drop = 1, noiseAmt = 0, bp = 3000, delay = 0 }) {
    if (!ac || !enabled || ac.state !== 'running') return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * drop, t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(fx);
    o.start(t); o.stop(t + dur + 0.02);
    if (noiseAmt) {
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), ng = ac.createGain();
      s.buffer = noise;
      f.type = 'bandpass'; f.frequency.value = bp; f.Q.value = 1.2;
      ng.gain.setValueAtTime(noiseAmt, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.6);
      s.connect(f).connect(ng).connect(fx);
      s.start(t); s.stop(t + dur);
    }
  }
  const softClick = () => blip({ freq: 1900 + Math.random() * 200, dur: 0.05, gain: 0.05, drop: 0.7, noiseAmt: 0.03, bp: 4200 });
  // one card flick: a short papery snap with a slightly random pitch (used for scrolling and pointing)
  function flick(delay = 0) {
    if (!ac || !enabled || ac.state !== 'running') return;
    const t = ac.currentTime + delay;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 1600; f.Q.value = 0.8;
    const peak = 0.11 + Math.random() * 0.03, dur = 0.028 + Math.random() * 0.012;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(fx);
    s.start(t, Math.random() * 0.4); s.stop(t + dur + 0.01);
  }

  // ---- game-menu style sounds (original sounds in the style of classic console game menus)
  // pointing at an option: a short, clean electronic blip
  const menuHover = () => {
    blip({ freq: 1250, dur: 0.045, gain: 0.09, type: 'triangle', drop: 0.97 });
    blip({ freq: 2500, dur: 0.03, gain: 0.012, type: 'square', drop: 0.97 });
  };
  // clicking: a punchier two-tone confirm, the second tone higher
  const menuSelect = () => {
    blip({ freq: 620, dur: 0.07, gain: 0.15, type: 'triangle', drop: 1.08, noiseAmt: 0.04, bp: 1200 });
    blip({ freq: 930, dur: 0.11, gain: 0.12, type: 'triangle', drop: 1.0, delay: 0.06 });
    blip({ freq: 1860, dur: 0.06, gain: 0.015, type: 'square', drop: 1.0, delay: 0.06 });
  };

  // ---- start on the first interaction (browser rule), then play the click sound
  function wake() {
    init();
    if (enabled && ac.state === 'suspended') ac.resume();
  }
  addEventListener('pointerdown', (e) => {
    wake();
    if (e.button === 0 && !(e.target instanceof Node && btn.contains(e.target))) menuSelect(); // game-menu confirm on click
  }, true);
  addEventListener('keydown', wake, true);

  function setSound(on) {
    enabled = on;
    try { localStorage.setItem('sound', on ? 'on' : 'off'); } catch (e) {}
    paint();
    init();
    master.gain.setTargetAtTime(on ? 1 : 0, ac.currentTime, 0.15);
    if (on) ac.resume();
  }
  btn.addEventListener('click', () => {
    setSound(!enabled);
    if (enabled) setTimeout(softClick, 60);
  });

  // ---- game-menu blip when the mouse moves onto a tool, box, button, link or menu option
  const POINTABLE = '.fx-box, a, button, summary, select, input, textarea, label, [role="button"]';
  let lastBox = null;
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const b = e.target.closest && e.target.closest(POINTABLE);
    if (b !== lastBox) { lastBox = b; if (b) menuHover(); }
  });

  // ---- card flicks while scrolling: one flick per ~50px scrolled, with a gap of at least 75ms
  // between flicks so each one is heard on its own; stops when scrolling stops
  let lastY = scrollY, acc = 0, lastFlick = 0;
  addEventListener('scroll', () => {
    acc += Math.abs(scrollY - lastY);
    lastY = scrollY;
    const now = performance.now();
    if (acc >= 50 && now - lastFlick > 75) {
      flick();
      acc = 0;
      lastFlick = now;
    }
  }, { passive: true });
})();

// ===== Video introduction: a cover card (portrait + play button) hides the video until it's played,
// and comes back when the video ends, so visitors never see a mid-sentence still frame.
(function introCover() {
  const video = document.getElementById('introVideo');
  const cover = document.getElementById('introCover');
  if (!video || !cover) return;
  cover.addEventListener('click', () => {
    cover.hidden = true;
    video.play().catch(() => {});
    video.focus();
  });
  video.addEventListener('ended', () => { video.currentTime = 0; cover.hidden = false; });
})();
