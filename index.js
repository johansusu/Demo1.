// Mod Phone v0.2.0 — phone-style mod menu for SillyTavern (trial: 1 app, "สไตล์การเขียน")
(function () {
  const KEY = 'mod_phone';
  const ctx = () => SillyTavern.getContext();

  // ---- Data: add apps / groups / options here ----
  const APPS = [
    {
      id: 'style', icon: '✍️', name: 'สไตล์การเขียน',
      groups: [
        { id: 'length', name: 'ความยาวเวลาตอบ', type: 'single', def: 'mid', opts: [
          { id: 'chat', label: 'แชท', p: 'Reply like a chat message: 1-3 short sentences, casual rhythm, minimal narration.' },
          { id: 'short', label: 'สั้น', p: 'Keep the reply short: about one paragraph.' },
          { id: 'mid', label: 'กลาง', p: 'Medium length: about 2-3 paragraphs.' },
          { id: 'long', label: 'ยาว', p: 'Long, detailed reply: 4 or more paragraphs.' },
        ]},
        { id: 'tone', name: 'ลักษณะบรรยาย', type: 'single', opts: [
          { id: 'romance', label: 'โรแมนติก', p: 'Romantic tone: emphasize emotion, closeness, small gestures and tension between characters.' },
          { id: 'action', label: 'แอคชั่น', p: 'Action tone: dynamic and kinetic, clear choreography, strong momentum.' },
          { id: 'horror', label: 'สยองขวัญ', p: 'Horror tone: dread, unease, oppressive atmosphere, slow reveal of the unsettling.' },
          { id: 'ln', label: 'ไลท์โนเวล', p: 'Light novel style: lively narration, inner thoughts, witty humor and genre tropes.' },
          { id: 'anime', label: 'อนิเมะ', p: 'Anime style: expressive reactions, exaggerated emotion, dramatic moments and anime tropes.' },
          { id: 'xianxia', label: 'นิยายจีน', p: 'Chinese web novel (xianxia/wuxia) style: ornate, elegant narration, martial-world flavor, formal diction.' },
          { id: 'romcom', label: 'รอม-คอม', p: 'Romantic comedy style: playful banter, awkward moments, misunderstandings, heart-fluttering beats balanced with humor.' },
          { id: 'custom', label: 'custom', custom: true },
        ]},
        { id: 'pace', name: 'การดำเนินเรื่อง', type: 'single', def: 'normal', opts: [
          { id: 'slow', label: 'slow burn', p: 'Slow-burn pacing: develop gradually, linger on moments, never rush events or relationship milestones.' },
          { id: 'normal', label: 'normal', p: 'Normal pacing: balanced story progression.' },
          { id: 'fast', label: 'fast', p: 'Fast pacing: move the story forward quickly; advance events in every reply.' },
        ]},
        { id: 'form', name: 'ตอบแบบไหน', type: 'single', def: 'balance', opts: [
          { id: 'dialogue', label: 'เน้นไดอาล็อก', p: 'Focus on dialogue: mostly spoken lines, minimal narration.' },
          { id: 'balance', label: 'บาล้านซ์', p: 'Balance dialogue and narration evenly.' },
          { id: 'narration', label: 'เน้นบรรยาย', p: 'Focus on narration: descriptive prose, less dialogue.' },
        ]},
        { id: 'focus', name: 'เน้นบรรยายอะไร', type: 'multi', opts: [
          { id: 'plot', label: 'พล็อต', p: 'plot developments' },
          { id: 'chars', label: 'ตัวละคร/ความสัมพันธ์', p: 'characters and their relationships' },
          { id: 'world', label: 'บรรยายโลก', p: 'the world and setting' },
          { id: 'mystery', label: 'ปริศนา', p: 'mysteries, clues and intrigue' },
        ]},
      ],
    },
  ];

  // ---- State ----
  const S = () => {
    const es = ctx().extensionSettings;
    if (!es[KEY]) {
      es[KEY] = {};
      APPS.forEach(a => a.groups.forEach(g => { es[KEY][g.id] = g.type === 'multi' ? [] : (g.def || null); }));
      es[KEY].customTone = '';
    }
    return es[KEY];
  };
  const save = () => { try { ctx().saveSettingsDebounced(); } catch (e) {} };

  // ---- Build the prompt and send it to ST ----
  function apply() {
    try {
      const s = S(), lines = [];
      APPS.forEach(a => a.groups.forEach(g => {
        if (g.type === 'multi') {
          const picked = g.opts.filter(o => (s[g.id] || []).includes(o.id)).map(o => o.p);
          if (picked.length) lines.push('Put extra narrative emphasis on: ' + picked.join('; ') + '.');
        } else {
          const o = g.opts.find(o => o.id === s[g.id]);
          if (!o) return;
          if (o.custom) { if (s.customTone.trim()) lines.push('Narration style: ' + s.customTone.trim()); }
          else lines.push(o.p);
        }
      }));
      const text = lines.length ? '[Writing style settings. Follow these for every reply.]\n' + lines.map(l => '- ' + l).join('\n') : '';
      // position 1 = IN_CHAT, depth 0 = latest, role 0 = system
      ctx().setExtensionPrompt(KEY, text, 1, 0, false, 0);
    } catch (e) { console.error('[Mod Phone]', e); }
  }

  // ---- UI ----
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let view = 'home', bubble, win;

  const clock = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // keep an element fully inside the viewport
  function place(el, x, y) {
    const w = el.offsetWidth, h = el.offsetHeight;
    x = Math.min(Math.max(0, x), Math.max(0, innerWidth - w));
    y = Math.min(Math.max(0, y), Math.max(0, innerHeight - h));
    el.style.left = x + 'px'; el.style.top = y + 'px';
  }
  function remember(key, el) {
    const s = S(); s.pos = s.pos || {};
    const r = el.getBoundingClientRect();
    s.pos[key] = { x: r.left, y: r.top }; save();
  }

  // drag by `handle`; a tap (no movement) calls onTap
  function makeDraggable(el, handle, key, onTap) {
    let id = null, sx = 0, sy = 0, ox = 0, oy = 0, moved = false;
    handle.addEventListener('pointerdown', e => {
      const b = e.target.closest('button');
      if (b && b !== handle) return;
      id = e.pointerId; sx = e.clientX; sy = e.clientY; moved = false;
      const r = el.getBoundingClientRect(); ox = r.left; oy = r.top;
      try { handle.setPointerCapture(id); } catch (err) {}
    });
    handle.addEventListener('pointermove', e => {
      if (id === null || e.pointerId !== id) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      moved = true; place(el, ox + dx, oy + dy);
    });
    const end = e => {
      if (id === null || e.pointerId !== id) return;
      id = null;
      if (moved) remember(key, el); else if (onTap && e.type === 'pointerup') onTap();
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  function draw() {
    const s = S();
    let body = '';
    if (view === 'home') {
      body = `<div class="mp-grid">${APPS.map(a => `<button class="mp-app" data-app="${a.id}"><span class="mp-ico">${a.icon}</span><span class="mp-lbl">${esc(a.name)}</span></button>`).join('')}</div>`;
    } else {
      const a = APPS.find(x => x.id === view);
      body = `<div class="mp-head"><button class="mp-back" data-act="home" aria-label="กลับ">‹</button><span>${esc(a.name)}</span></div>` +
        a.groups.map(g => `<section class="mp-grp"><h3>${esc(g.name)}${g.type === 'multi' ? '<small>เลือกได้หลายอย่าง</small>' : ''}</h3><div class="mp-chips">` +
          g.opts.map(o => {
            const on = g.type === 'multi' ? (s[g.id] || []).includes(o.id) : s[g.id] === o.id;
            return `<button class="mp-chip${on ? ' on' : ''}" data-g="${g.id}" data-o="${o.id}">${esc(o.label)}</button>`;
          }).join('') + `</div>` +
          (g.id === 'tone' && s.tone === 'custom' ? `<textarea class="mp-custom" placeholder="พิมพ์สไตล์การบรรยายที่ต้องการ">${esc(s.customTone || '')}</textarea>` : '') +
          `</section>`).join('');
    }
    win.querySelector('.mp-body').innerHTML = body;
  }

  function render() {
    try { win.querySelector('.mp-clock').textContent = clock(); draw(); }
    catch (e) {
      console.error('[Mod Phone]', e);
      win.querySelector('.mp-body').innerHTML = '<pre style="white-space:pre-wrap;font-size:11px">' + esc(e && e.stack || e) + '</pre>';
    }
  }

  function openWin() {
    view = 'home'; win.classList.add('open'); render();
    const p = (S().pos || {}).win;
    if (p) place(win, p.x, p.y);
    else place(win, innerWidth - win.offsetWidth - 10, (innerHeight - win.offsetHeight) / 2);
  }
  const closeWin = () => win.classList.remove('open');
  const toggle = () => (win.classList.contains('open') ? closeWin() : openWin());

  function onClick(e) {
    const s = S(), t = e.target.closest('button'); if (!t) return;
    if (t.dataset.app) { view = t.dataset.app; render(); }
    else if (t.dataset.act === 'shut') closeWin();
    else if (t.dataset.act === 'home') { view = 'home'; render(); }
    else if (t.dataset.act === 'close') { if (view !== 'home') { view = 'home'; render(); } else closeWin(); }
    else if (t.dataset.g) {
      const g = APPS.flatMap(a => a.groups).find(x => x.id === t.dataset.g), id = t.dataset.o;
      if (g.type === 'multi') { const arr = s[g.id] || []; s[g.id] = arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]; }
      else s[g.id] = s[g.id] === id ? null : id;
      save(); apply(); render();
    }
  }

  function init() {
    S(); apply();
    document.body.insertAdjacentHTML('beforeend',
      `<button id="mp-bubble" aria-label="เปิดเมนู mod">📱</button>` +
      `<div id="mp-win"><div class="mp-status"><span class="mp-clock"></span><span class="mp-grip"></span><button class="mp-x" data-act="shut" aria-label="ปิด">✕</button></div>` +
      `<div class="mp-body"></div><button class="mp-home" data-act="close" aria-label="กลับหน้าโฮม"></button></div>`);
    bubble = document.getElementById('mp-bubble');
    win = document.getElementById('mp-win');

    const bp = (S().pos || {}).bubble;
    if (bp) place(bubble, bp.x, bp.y); else place(bubble, innerWidth - 62, innerHeight * 0.1);
    makeDraggable(bubble, bubble, 'bubble', toggle);
    makeDraggable(win, win.querySelector('.mp-status'), 'win', null);

    win.addEventListener('click', onClick);
    win.addEventListener('input', e => { if (e.target.classList.contains('mp-custom')) { S().customTone = e.target.value; save(); apply(); } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeWin(); });
    window.addEventListener('resize', () => {
      [bubble, win].forEach(el => { const r = el.getBoundingClientRect(); place(el, r.left, r.top); });
    });
    try { ctx().eventSource.on(ctx().eventTypes.CHAT_CHANGED, apply); } catch (e) {}
  }

  if (window.jQuery) jQuery(init); else window.addEventListener('load', init);
})();
