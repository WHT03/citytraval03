/* =========================================================
   周末出走 · 交互与渲染
   1) 程序化生成城市矢量风景  2) 卡片渲染 + 筛选
   3) 收藏 / 随机推荐 / 详情浮层
   ========================================================= */

(function () {
  'use strict';

  /* ---------- 工具 ---------- */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 确定性伪随机：同一城市每次渲染图案一致
  function seeded(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    let s = h >>> 0;
    return function () {
      s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  /* ---------- 矢量风景生成 ---------- */
  const W = 400, H = 300;

  function house(x, baseY, w, h, color, op, curved) {
    const peak = curved
      ? `Q${x + w * 0.26} ${baseY - h} ${x + w / 2} ${baseY - h - 13}` +
        `Q${x + w * 0.74} ${baseY - h} ${x + w} ${baseY - h}`
      : `L${x + w / 2} ${baseY - h - 8}L${x + w} ${baseY - h}`;
    return `<path d="M${x} ${baseY}L${x} ${baseY - h}${peak}L${x + w} ${baseY}Z" fill="${color}" opacity="${op}"/>`;
  }

  const BUILDERS = {
    /* 水乡：河道、桥、两层屋檐 */
    water(c, rnd) {
      let out = `<circle cx="308" cy="84" r="30" fill="#fff6e6" opacity=".8"/>`;
      let x = -10;
      while (x < W + 10) {
        const w = 20 + rnd() * 14, h = 15 + rnd() * 18;
        out += house(x, 196, w, h, c, 0.42, true);
        x += w + 7;
      }
      x = -18;
      while (x < W + 10) {
        const w = 30 + rnd() * 24, h = 30 + rnd() * 24;
        out += house(x, 222, w, h, c, 0.92, true);
        if (rnd() > 0.45) {
          out += `<rect x="${x + w * 0.55}" y="${222 - h * 0.55}" width="4" height="5" fill="#f8dcae" opacity=".55" rx="1"/>`;
        }
        x += w + 11;
      }
      out += `<rect x="0" y="222" width="${W}" height="${H - 222}" fill="${c}" opacity=".14"/>`;
      out += `<path d="M116 222q36 -32 76 0" fill="none" stroke="${c}" stroke-width="5" opacity=".8" stroke-linecap="round"/>`;
      out += `<path d="M116 222q36 -32 76 0" fill="none" stroke="${c}" stroke-width="1.2" opacity=".35"/>`;
      for (let i = 0; i < 6; i++) {
        const y = 238 + i * 10;
        out += `<path d="M${20 + rnd() * 120} ${y}h${30 + rnd() * 70}" stroke="${c}" stroke-width="1.4" opacity="${0.14 - i * 0.012}" stroke-linecap="round"/>`;
      }
      return out;
    },

    /* 茶山与湖 */
    hills(c, rnd) {
      let out = `<circle cx="86" cy="70" r="24" fill="#fff6e6" opacity=".7"/>`;
      out += `<path d="M0 158Q64 96 132 142T268 130T400 152L400 250L0 250Z" fill="${c}" opacity=".3"/>`;
      out += `<path d="M0 190Q86 142 176 184T336 180T400 196L400 254L0 254Z" fill="${c}" opacity=".52"/>`;
      // 湖面
      out += `<rect x="0" y="240" width="${W}" height="60" fill="${c}" opacity=".12"/>`;
      out += `<path d="M0 240h400" stroke="#ffffff" stroke-width="1.2" opacity=".35"/>`;
      for (let i = 0; i < 4; i++) {
        out += `<path d="M${28 + i * 96} ${254 + i * 11}h${44 + rnd() * 34}" stroke="${c}" stroke-width="1.3" opacity="${0.18 - i * 0.03}" stroke-linecap="round"/>`;
      }
      // 近岸
      out += `<path d="M0 286Q120 274 240 284T400 280L400 300L0 300Z" fill="${c}" opacity=".9"/>`;
      out += `<path d="M0 292Q140 282 260 290T400 286" fill="none" stroke="#ffffff" stroke-width="1.1" opacity=".16"/>`;
      return out;
    },

    /* 海岸 */
    coast(c, rnd) {
      let out = `<circle cx="126" cy="164" r="21" fill="#fff1d8" opacity=".9"/>`;
      out += `<rect x="0" y="186" width="${W}" height="${H - 186}" fill="${c}" opacity=".26"/>`;
      out += `<path d="M0 186h400" stroke="${c}" stroke-width="1.2" opacity=".3"/>`;
      for (let i = 0; i < 5; i++) {
        const y = 200 + i * 17;
        out += `<path d="M${20 + rnd() * 60} ${y}q${26 + rnd() * 20} -7 ${60 + rnd() * 40} 0" fill="none" stroke="${c}" stroke-width="1.6" opacity="${0.28 - i * 0.03}" stroke-linecap="round"/>`;
      }
      out += `<path d="M0 300L0 246q34 -6 54 18q18 22 46 24q-30 8 -44 12z" fill="${c}" opacity=".95"/>`;
      out += `<path d="M292 300l16 -34l22 34z" fill="${c}" opacity=".8"/>`;
      out += `<path d="M228 92q7 -8 14 0M246 84q6 -7 12 0" fill="none" stroke="${c}" stroke-width="1.5" opacity=".45" stroke-linecap="round"/>`;
      return out;
    },

    /* 山峦 */
    mountain(c, rnd) {
      let out = `<circle cx="300" cy="72" r="22" fill="#fff6e6" opacity=".7"/>`;
      // 远山：圆润的脊线，避免生硬的三角形
      out += `<path d="M0 176Q44 116 92 148Q128 172 166 128Q206 82 246 132Q286 180 322 136Q356 96 400 130L400 300L0 300Z" fill="${c}" opacity=".28"/>`;
      out += `<path d="M0 208Q56 158 110 194Q160 228 204 182Q250 136 296 188Q336 232 372 198Q388 184 400 192L400 300L0 300Z" fill="${c}" opacity=".5"/>`;
      // 近山
      out += `<path d="M0 250Q64 212 122 242Q176 270 224 232Q272 194 316 236Q356 272 400 240L400 300L0 300Z" fill="${c}" opacity=".9"/>`;
      // 山脚的松树
      for (let i = 0; i < 6; i++) {
        const x = 24 + i * 66 + rnd() * 16, h = 14 + rnd() * 8;
        out += `<path d="M${x} 300l${-h * 0.3} ${-h}h${h * 0.6}z" fill="${c}" opacity=".95"/>
                <path d="M${x} 300l${-h * 0.42} ${-h * 1.7}h${h * 0.84}z" fill="${c}" opacity=".95"/>`;
      }
      return out;
    },

    /* 闽南古厝 + 石塔 */
    town(c, rnd) {
      let out = `<circle cx="76" cy="88" r="26" fill="#fff3de" opacity=".7"/>`;
      // 石塔（东西塔剪影）
      const px = 336;
      out += `<g fill="${c}" opacity=".88">`;
      out += `<path d="M${px - 11} 262L${px - 7} 166h14l4 96z"/>`;
      for (let i = 0; i < 4; i++) {
        const y = 172 + i * 24, w = 16 - i * 1.4;
        out += `<path d="M${px - w - 7} ${y}Q${px} ${y - 7} ${px + w + 7} ${y}L${px + w + 3} ${y + 5}Q${px} ${y + 1} ${px - w - 3} ${y + 5}z"/>`;
      }
      out += `<path d="M${px - 6} 166Q${px} 140 ${px + 6} 166z"/>`;
      out += `<rect x="${px - 1}" y="128" width="2" height="14"/>`;
      out += `</g>`;
      let x = -14;
      while (x < W + 10) {
        const w = 34 + rnd() * 26, h = 40 + rnd() * 26;
        out += house(x, 272, w, h, c, 0.86, true);
        if (rnd() > 0.5) {
          out += `<rect x="${x + w * 0.35}" y="${272 - h * 0.5}" width="5" height="7" fill="#f8d9a4" opacity=".5" rx="1"/>`;
        }
        x += w + 9;
      }
      out += `<rect x="0" y="272" width="${W}" height="28" fill="${c}" opacity=".16"/>`;
      // 树
      out += `<circle cx="56" cy="248" r="26" fill="${c}" opacity=".5"/><rect x="52" y="248" width="7" height="30" fill="${c}" opacity=".5"/>`;
      out += `<circle cx="392" cy="252" r="20" fill="${c}" opacity=".4"/><rect x="389" y="252" width="6" height="26" fill="${c}" opacity=".4"/>`;
      return out;
    },

    /* 城市天际线 */
    city(c, rnd) {
      let out = `<circle cx="72" cy="80" r="20" fill="#fff6e6" opacity=".55"/>`;
      // 远景
      let x = -10;
      while (x < W + 10) {
        const w = 22 + rnd() * 18, h = 60 + rnd() * 60;
        out += `<rect x="${x}" y="${232 - h}" width="${w}" height="${h + 70}" fill="${c}" opacity=".22"/>`;
        x += w + 6;
      }
      // 近景
      x = -16;
      while (x < W + 10) {
        const w = 30 + rnd() * 26, h = 90 + rnd() * 90;
        const top = 232 - h;
        out += `<rect x="${x}" y="${top}" width="${w}" height="${h + 70}" fill="${c}" opacity=".92"/>`;
        for (let r = 0; r < 4; r++) {
          for (let cI = 0; cI < 3; cI++) {
            if (rnd() > 0.55) continue;
            out += `<rect x="${x + 7 + cI * 9}" y="${top + 14 + r * 13}" width="4" height="5" fill="#f7dbaa" opacity=".42"/>`;
          }
        }
        if (rnd() > 0.7) out += `<rect x="${x + w / 2}" y="${top - 22}" width="2" height="22" fill="${c}" opacity=".5"/>`;
        x += w + 8;
      }
      out += `<rect x="0" y="290" width="${W}" height="10" fill="${c}" opacity=".9"/>`;
      return out;
    }
  };

  function sceneHTML(d) {
    const rnd = seeded(d.id + d.art);
    const build = BUILDERS[d.art] || BUILDERS.city;
    return `<svg class="scene" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      ${build(d.palette[2], rnd)}
    </svg><div class="art-grain"></div>`;
  }

  function paint(el, d) {
    el.style.background = `linear-gradient(168deg, ${d.palette[0]} 0%, ${d.palette[1]} 60%, ${d.palette[1]} 100%)`;
    el.innerHTML = sceneHTML(d);
  }

  /* ---------- 图标 ---------- */
  const ICON = {
    train: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="3" width="12" height="13" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6 10h12M9 20l2-4M15 20l-2-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    coin: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 9l3 4l3-4M9 15h6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    sun: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    arrow: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    heart: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.4-4.6-7.4-9.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.4 3C19.4 15.4 12 20 12 20z"/></svg>`,
    pin: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-6.1 6-10.2A6 6 0 0 0 6 10.8C6 14.9 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="10.6" r="2" fill="currentColor"/></svg>`
  };

  /* ---------- 状态 ---------- */
  const SAVE_KEY = 'we_saved_v1';
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(SAVE_KEY)) || []; } catch (e) { saved = []; }

  let activeFilter = 'all';

  /* ---------- 卡片渲染 ---------- */
  function cardHTML(d, index) {
    const isSaved = saved.includes(d.id);
    return `
    <article class="card" tabindex="0" role="button" data-id="${d.id}" data-theme="${d.theme}"
             aria-label="${d.name} 周末指南" style="transition-delay:${Math.min(index, 8) * 55}ms">
      <div class="card__art" data-art></div>
      <div class="card__veil" style="position:absolute;inset:0;pointer-events:none"></div>
      <span class="card__badge">${ICON.train}${d.transport}</span>
      <button class="card__save ${isSaved ? 'is-saved' : ''}" type="button" data-save
              aria-label="收藏 ${d.name}" aria-pressed="${isSaved}">${ICON.heart}</button>
      <div class="card__body">
        <div class="card__title-row">
          <h3>${d.name}</h3>
          <span class="card__en">${d.en}</span>
        </div>
        <p class="card__tagline">${d.tagline}</p>
        <ul class="card__facts">
          <li>${ICON.coin}${d.budget}</li>
          <li>${ICON.sun}${d.season}</li>
        </ul>
        <div class="card__foot">
          <div class="card__tags">
            <span>${d.days}</span>
            ${d.tags.slice(0, 2).map(t => `<span>${t}</span>`).join('')}
          </div>
          <span class="card__more">查看指南 ${ICON.arrow}</span>
        </div>
      </div>
    </article>`;
  }

  const grid = $('#grid');
  grid.innerHTML = DESTINATIONS.map(cardHTML).join('');

  // 绘制每张卡片的矢量风景
  $$('.card', grid).forEach(card => {
    const d = DESTINATIONS.find(x => x.id === card.dataset.id);
    const art = $('[data-art]', card);
    paint(art, d);
    // 暗角与场景说明放进图内，跟随图片一起缩放
    art.appendChild(card.querySelector('.card__veil'));
    art.insertAdjacentHTML('beforeend', `<span class="card__art-label">${d.sceneLabel}</span>`);
  });

  /* ---------- 筛选 ---------- */
  const filters = $('#filters');
  filters.innerHTML = THEMES.map(t => {
    const n = t.key === 'all' ? DESTINATIONS.length : DESTINATIONS.filter(d => d.theme === t.key).length;
    return `<button class="chip ${t.key === 'all' ? 'is-active' : ''}" type="button" role="tab"
              aria-selected="${t.key === 'all'}" data-filter="${t.key}">${t.label}<span class="chip__count">${n}</span></button>`;
  }).join('');

  function applyFilter(key) {
    activeFilter = key;
    $$('.chip', filters).forEach(c => {
      const on = c.dataset.filter === key;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-selected', String(on));
    });
    let visible = 0;
    $$('.card', grid).forEach((card, i) => {
      const show = key === 'all' || card.dataset.theme === key;
      card.classList.toggle('is-hidden', !show);
      if (show) {
        visible++;
        card.classList.remove('is-in');
        // 重新入场
        card.style.transitionDelay = `${visible * 45}ms`;
        requestAnimationFrame(() => card.classList.add('is-in'));
      }
    });
    $('#empty').hidden = visible > 0;
  }

  filters.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    applyFilter(chip.dataset.filter);
  });

  $$('[data-jump]').forEach(a => {
    a.addEventListener('click', () => applyFilter(a.dataset.jump));
  });

  /* ---------- 入场动画 ---------- */
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    $$('.card', grid).forEach(c => io.observe(c));
  } else {
    $$('.card', grid).forEach(c => c.classList.add('is-in'));
  }

  /* ---------- 收藏 ---------- */
  function persistSaved() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); } catch (e) {}
  }

  grid.addEventListener('click', e => {
    const saveBtn = e.target.closest('[data-save]');
    if (saveBtn) {
      e.stopPropagation();
      const id = saveBtn.closest('.card').dataset.id;
      const idx = saved.indexOf(id);
      if (idx > -1) saved.splice(idx, 1); else saved.push(id);
      persistSaved();
      saveBtn.classList.toggle('is-saved', idx === -1);
      saveBtn.setAttribute('aria-pressed', String(idx === -1));
      return;
    }
    const card = e.target.closest('.card');
    if (card) openModal(card.dataset.id);
  });

  grid.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.card');
    if (!card || e.target.closest('[data-save]')) return;
    e.preventDefault();
    openModal(card.dataset.id);
  });

  /* ---------- 随机推荐 ---------- */
  function randomPick() {
    const pool = DESTINATIONS.filter(d => activeFilter === 'all' || d.theme === activeFilter);
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const card = grid.querySelector(`.card[data-id="${pick.id}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    card.classList.remove('is-in');
    void card.offsetWidth;
    card.classList.add('is-in');
    setTimeout(() => {
      card.classList.add('flash');
      setTimeout(() => card.classList.remove('flash'), 1500);
    }, reduced ? 0 : 420);
  }
  $('#randomPick').addEventListener('click', randomPick);
  $('#heroRandom').addEventListener('click', randomPick);

  /* ---------- 详情浮层 ---------- */
  const modal = $('#modal');
  let lastFocus = null;

  function openModal(id) {
    const d = DESTINATIONS.find(x => x.id === id);
    if (!d) return;
    lastFocus = document.activeElement;

    $('#modalRegion').textContent = `${d.region} · ${d.days}`;
    $('#modalTitle').textContent = d.name;
    $('#modalTagline').textContent = d.tagline;
    $('#modalFacts').innerHTML = [d.transport, d.budget, d.season, ...d.tags]
      .map(t => `<li>${t}</li>`).join('');
    $('#modalPlan').innerHTML = d.plan
      .map(([t, txt]) => `<li><time>${t}</time><span>${txt}</span></li>`).join('');
    $('#modalSpots').innerHTML = d.spots.map(s => `<li>${s}</li>`).join('');

    const art = $('#modalArt');
    paint(art, d);
    art.insertAdjacentHTML('beforeend',
      `<div class="modal__veil"></div><span class="modal__artlabel">${d.sceneLabel}</span>`);

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.modal__panel').scrollTop = 0;
    setTimeout(() => $('.modal__close').focus(), 50);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  modal.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  /* ---------- 首页明信片 ---------- */
  [['#pc1', 'hangzhou'], ['#pc2', 'dali'], ['#pc3', 'suzhou']].forEach(([sel, id]) => {
    const el = $(sel);
    const d = DESTINATIONS.find(x => x.id === id);
    if (el && d) paint(el, d);
  });

  /* ---------- Header 阴影 & 导航高亮 ---------- */
  const header = $('#siteHeader');
  const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const sections = ['top', 'destinations', 'howto', 'about']
    .map(id => document.getElementById(id)).filter(Boolean);
  const navLinks = $$('.nav__link');
  if ('IntersectionObserver' in window) {
    const navIO = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        navLinks.forEach(a => {
          const hit = a.getAttribute('href') === '#' + en.target.id;
          a.classList.toggle('is-active', hit);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(s => navIO.observe(s));
  }
})();
