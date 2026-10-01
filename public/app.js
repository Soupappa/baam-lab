(async () => {
  const [registryResponse, graphResponse] = await Promise.all([
    fetch('/data/registry.json', { cache: 'no-store' }),
    fetch('/data/graph.jsonld', { cache: 'no-store' })
  ]);
  if (!registryResponse.ok) throw new Error(`Registre Lab indisponible (${registryResponse.status})`);
  const registry = await registryResponse.json();
  if (graphResponse.ok) {
    const node = document.createElement('script');
    node.type = 'application/ld+json';
    node.textContent = JSON.stringify(await graphResponse.json());
    document.head.appendChild(node);
  }

  const themeButton = document.querySelector('.theme-toggle');
  const setTheme = (dark) => {
    document.documentElement.classList.toggle('dark', dark);
    themeButton.setAttribute('aria-pressed', String(dark));
    localStorage.setItem('baam.lab.theme', dark ? 'dark' : 'light');
  };
  themeButton.addEventListener('click', () => setTheme(!document.documentElement.classList.contains('dark')));

  document.querySelector('#manifest-state').textContent = `${String(registry.assets.length).padStart(2, '0')} SYSTÈMES`;
  document.querySelector('#registry-hash').textContent = `HASH / ${registry.meta.sourceHash.slice(0, 12).toUpperCase()}`;
  const list = document.querySelector('#project-list');
  list.innerHTML = registry.assets.map((asset, index) => {
    const primary = asset.url
      ? `<a href="${asset.url}" target="_blank" rel="noreferrer">OUVRIR ↗</a>`
      : `<span class="project-soon">BIENTÔT</span>`;
    return `
      <article class="project-card" id="${asset.id}" data-system="${asset.id}">
        <div class="project-visual">
          <span class="visual-label">${asset.id.toUpperCase()} / SYSTÈME VIVANT</span>
          <canvas aria-label="Visualisation générative de ${asset.title}"></canvas>
        </div>
        <div class="project-copy">
          <p class="project-index">${String(index + 1).padStart(2, '0')}</p>
          <p class="project-type">${asset.type.replaceAll('-', ' ')} · ${asset.status}</p>
          <h2 class="project-title">${asset.title}</h2>
          <p class="project-summary">${asset.summary}</p>
          <ul class="tags">${asset.tags.map((tag) => `<li>${tag}</li>`).join('')}</ul>
          <div class="project-links">${primary}</div>
        </div>
      </article>`;
  }).join('');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const colors = () => document.documentElement.classList.contains('dark')
    ? { paper: '#080808', ink: '#f4f4ee', accent: '#f00098', cyan: '#00d9d0' }
    : { paper: '#f7f7f2', ink: '#090909', accent: '#f00098', cyan: '#00aeb0' };

  function hashSeed(text) {
    let value = 2166136261;
    for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
    return value >>> 0;
  }
  function random(seed) {
    let state = seed || 1;
    return () => ((state = Math.imul(48271, state) % 2147483647) & 2147483647) / 2147483647;
  }
  function fit(canvas) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    return { width: rect.width, height: rect.height, scale: dpr };
  }

  class Field {
    constructor(canvas, id) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.id = id;
      this.rand = random(hashSeed(id));
      this.pointer = { x: .5, y: .5, active: false };
      this.visible = true;
      this.points = [];
      this.initialize();
      const holder = canvas.parentElement;
      holder.addEventListener('pointermove', (event) => {
        const rect = holder.getBoundingClientRect();
        this.pointer = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height, active: true };
      });
      holder.addEventListener('pointerleave', () => { this.pointer.active = false; });
      new IntersectionObserver(([entry]) => { this.visible = entry.isIntersecting; }, { rootMargin: '180px' }).observe(holder);
    }
    initialize() {
      const count = this.id === 'pixel-bloom' ? 190 : 120;
      for (let i = 0; i < count; i += 1) {
        this.points.push({
          x: this.rand(), y: this.rand(),
          vx: (this.rand() - .5) * .0018, vy: (this.rand() - .5) * .0018,
          phase: this.rand() * Math.PI * 2, kind: i % 4
        });
      }
    }
    clear(background) {
      const size = fit(this.canvas);
      this.ctx.setTransform(size.scale, 0, 0, size.scale, 0, 0);
      this.ctx.fillStyle = background;
      this.ctx.fillRect(0, 0, size.width, size.height);
      return size;
    }
    frame(time) {
      if (!this.visible && !reduced) return;
      if (this.id === 'r-time') this.rtime(time);
      else if (this.id === 'pixel-bloom') this.pixel(time);
      else this.prime(time);
    }
    rtime(time) {
      const c = colors();
      const { width, height } = this.clear(c.ink);
      const ctx = this.ctx;
      const px = this.pointer.x * width;
      const py = this.pointer.y * height;
      ctx.lineCap = 'round';
      for (let ring = 0; ring < 38; ring += 1) {
        const y0 = height * (.12 + ring / 46);
        const amplitude = 10 + ring * .7;
        ctx.beginPath();
        for (let x = -20; x <= width + 20; x += 8) {
          const distance = Math.hypot(x - px, y0 - py);
          const mouseWave = this.pointer.active ? Math.exp(-distance / 230) * 38 * Math.sin(distance * .025 - time * .002) : 0;
          const y = y0 + Math.sin(x * .012 + ring * .19 + time * .00045) * amplitude + mouseWave;
          if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = ring % 7 === 0 ? c.accent : `rgba(247,247,242,${.16 + ring / 95})`;
        ctx.lineWidth = ring % 7 === 0 ? 2.4 : .85;
        ctx.stroke();
      }
      const radius = Math.min(width, height) * (.12 + .025 * Math.sin(time * .0007));
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    pixel(time) {
      const c = colors();
      const { width, height } = this.clear(c.paper);
      const ctx = this.ctx;
      const palette = [c.accent, c.cyan, '#7755ff', c.ink];
      this.points.forEach((point, index) => {
        const attractX = this.pointer.active ? this.pointer.x : .5 + .22 * Math.sin(time * .00017 + point.kind);
        const attractY = this.pointer.active ? this.pointer.y : .5 + .22 * Math.cos(time * .00013 + point.kind * 1.7);
        const dx = attractX - point.x;
        const dy = attractY - point.y;
        const direction = point.kind % 2 ? 1 : -.55;
        point.vx += dx * .000014 * direction + Math.sin(time * .0005 + point.phase) * .000004;
        point.vy += dy * .000014 * direction + Math.cos(time * .00047 + point.phase) * .000004;
        point.vx *= .991; point.vy *= .991;
        point.x = (point.x + point.vx + 1) % 1;
        point.y = (point.y + point.vy + 1) % 1;
        const x = point.x * width; const y = point.y * height;
        if (index % 3 === 0) {
          const other = this.points[(index * 17 + 11) % this.points.length];
          const ox = other.x * width; const oy = other.y * height;
          if (Math.hypot(x - ox, y - oy) < 110) {
            ctx.strokeStyle = `${palette[point.kind]}28`;
            ctx.lineWidth = .8;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ox, oy); ctx.stroke();
          }
        }
        ctx.fillStyle = `${palette[point.kind]}${index % 6 === 0 ? 'cc' : '72'}`;
        ctx.beginPath(); ctx.arc(x, y, index % 9 === 0 ? 4.5 : 2, 0, Math.PI * 2); ctx.fill();
      });
    }
    prime(time) {
      const c = colors();
      const { width, height } = this.clear(c.ink);
      const ctx = this.ctx;
      const cols = Math.max(18, Math.floor(width / 22));
      const rows = Math.max(18, Math.floor(height / 22));
      const max = cols * rows + 1;
      const prime = new Uint8Array(max + 1).fill(1); prime[0] = prime[1] = 0;
      for (let p = 2; p * p <= max; p += 1) if (prime[p]) for (let n = p * p; n <= max; n += p) prime[n] = 0;
      const gapX = width / cols; const gapY = height / rows;
      const drift = Math.sin(time * .00032) * gapX * .36;
      for (let n = 1; n <= cols * rows; n += 1) {
        const col = (n - 1) % cols; const row = Math.floor((n - 1) / cols);
        const x = (col + .5) * gapX + Math.sin(row * .43 + time * .00025) * drift;
        const y = (row + .5) * gapY;
        const distance = Math.hypot(x / width - this.pointer.x, y / height - this.pointer.y);
        if (prime[n]) {
          ctx.fillStyle = distance < .23 && this.pointer.active ? c.accent : c.paper;
          ctx.fillRect(x - 2.2, y - 2.2, 4.4, 4.4);
        } else if (n % 7 === 0) {
          ctx.fillStyle = 'rgba(240,0,152,.22)'; ctx.fillRect(x - .8, y - .8, 1.6, 1.6);
        }
      }
      ctx.strokeStyle = c.accent; ctx.lineWidth = 1.2;
      for (let i = 0; i < 7; i += 1) {
        ctx.beginPath();
        const radius = Math.min(width, height) * (.11 + i * .075 + .01 * Math.sin(time * .0004 + i));
        ctx.arc(width * this.pointer.x, height * this.pointer.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  const fields = [...document.querySelectorAll('.project-card')].map((card) => new Field(card.querySelector('canvas'), card.dataset.system));
  const heroCanvas = document.querySelector('#hero-canvas');
  const hero = new Field(heroCanvas, 'pixel-bloom');
  hero.points.length = 90;
  let last = 0;
  function animate(time) {
    if (!reduced || !last) {
      hero.pixel(time * .55);
      fields.forEach((field) => field.frame(time));
      last = time;
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})().catch((error) => {
  console.error(error);
  document.querySelector('#project-list').innerHTML = `<p style="padding:40px;border:4px solid #f00098;font:900 3rem Impact;color:#f00098">LE LAB NE RÉPOND PAS<br><small>${error.message}</small></p>`;
});
