// Mod Phone v0.1.1 — phone-style mod menu for SillyTavern (trial: 1 app, "สไตล์การเขียน")
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
  let view = 'home', root;

  function clock() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

  function render() {
    try { draw(); } catch (e) {
      console.error('[Mod Phone]', e);
      root.querySelector('.mp-screen').innerHTML =
        '<div class="mp-status"><span>Mod Phone error</span><button class="mp-x" data-act="shut" aria-label="ปิด">✕</button></div>' +
        '<pre style="padding:16px;white-space:pre-wrap;font-size:12px;overflow:auto">' + esc(e && e.stack || e) + '</pre>';
    }
  }

  function draw() {
    const s = S();
    let body = '';
    if (view === 'home') {
      body = `<div class="mp-grid">${APPS.map(a => `<button class="mp-app" data-app="${a.id}"><span class="mp-ico">${a.icon}</span><span class="mp-lbl">${esc(a.name)}</span></button>`).join('')}</div>`;
    } else {
      const a = APPS.find(x => x.id === view);
      body = `<div class="mp-head"><button class="mp-back" data-act="home" aria-label="กลับ">‹</button><span>${esc(a.name)}</span></div><div class="mp-list">` +
        a.groups.map(g => `<section class="mp-grp"><h3>${esc(g.name)}${g.type === 'multi' ? '<small>เลือกได้หลายอย่าง</small>' : ''}</h3><div class="mp-chips">` +
          g.opts.map(o => {
            const on = g.type === 'multi' ? (s[g.id] || []).includes(o.id) : s[g.id] === o.id;
            return `<button class="mp-chip${on ? ' on' : ''}" data-g="${g.id}" data-o="${o.id}">${esc(o.label)}</button>`;
          }).join('') + `</div>` +
          (g.id === 'tone' && s.tone === 'custom' ? `<textarea class="mp-custom" placeholder="พิมพ์สไตล์การบรรยายที่ต้องการ">${esc(s.customTone)}</textarea>` : '') +
          `</section>`).join('') + `</div>`;
    }
    root.querySelector('.mp-screen').innerHTML =
      `<div class="mp-status"><span>${clock()}</span><button class="mp-x" data-act="shut" aria-label="ปิด">✕</button></div><div class="mp-body">${body}</div><button class="mp-home" data-act="close" aria-label="ปิด"></button>`;
  }

  function onClick(e) {
    const s = S();
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.app) { view = t.dataset.app; render(); }
    else if (t.dataset.act === 'shut') { root.classList.remove('open'); }
    else if (t.dataset.act === 'home') { view = 'home'; render(); }
    else if (t.dataset.act === 'close') { if (view !== 'home') { view = 'home'; render(); } else root.classList.remove('open'); }
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
      `<button id="mp-tab" aria-label="เปิดเมนู mod">MOD</button><div id="mp-root"><div class="mp-screen"></div></div>`);
    root = document.getElementById('mp-root');
    document.getElementById('mp-tab').addEventListener('click', () => { view = 'home'; render(); root.classList.add('open'); });
    root.addEventListener('click', e => { if (e.target === root) root.classList.remove('open'); else onClick(e); });
    root.addEventListener('input', e => { if (e.target.classList.contains('mp-custom')) { S().customTone = e.target.value; save(); apply(); } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') root.classList.remove('open'); });
    try { ctx().eventSource.on(ctx().eventTypes.CHAT_CHANGED, apply); } catch (e) {}
  }

  if (window.jQuery) jQuery(init); else window.addEventListener('load', init);
})();
