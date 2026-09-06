/* The Line — screens and behaviour. Local-first; nothing financial leaves the device. */
(function () {
  'use strict';
  const S = NB.store, E = NB.engine;
  let state = S.load();
  const view = document.getElementById('view');
  const tabbar = document.getElementById('tabbar');
  const sheet = document.getElementById('sheet');
  const sym = () => state.settings.currency;
  const f = (n, o) => E.fmt(n, sym(), o);
  const esc = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const save = () => { state.lastOpened = S.today(); S.save(state); };
  const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const standalone = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } };

  /* ---------- appearance follows the system (no app-specific setting) ---------- */
  function applyTheme() {
    document.documentElement.removeAttribute('data-theme');
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--ground').trim() || '#0B0C0E');
  }
  try { matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTheme); } catch (e) { /* ignore */ }

  /* ---------- toast + sheet ---------- */
  let toastT = null;
  function toast(msg) {
    let el = document.querySelector('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = msg; el.hidden = false; el.onclick = () => { el.hidden = true; };
    clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 4000);
  }
  function openSheet(key) {
    const ex = E.explain(state, key); if (!ex) return;
    document.getElementById('sheetTitle').textContent = ex.title;
    document.getElementById('sheetBody').innerHTML = ex.rows.map(r => `<div class="kv"><span class="dim">${esc(r[0])}</span><span class="v">${esc(r[1])}</span></div>`).join('') + (ex.note ? `<p class="caption" style="margin-top:12px;">${esc(ex.note)}</p>` : '');
    if (typeof sheet.showModal === 'function') sheet.showModal(); else sheet.setAttribute('open', '');
  }
  document.getElementById('sheetClose').addEventListener('click', () => sheet.close ? sheet.close() : sheet.removeAttribute('open'));
  sheet.addEventListener('click', e => { if (e.target === sheet && sheet.close) sheet.close(); });

  /* ---------- the line ---------- */
  function lineSVG(readings, opts) {
    opts = opts || {};
    const W = 386, H = opts.h || 170, padX = 6, padT = 14, padB = 22;
    if (readings.length < 2) {
      const y = H / 2;
      return `<svg class="line" viewBox="0 0 ${W} ${H}" role="img" aria-label="${readings.length ? 'One reading so far.' : 'No readings yet.'}">
        <line class="base" x1="${padX}" y1="${y}" x2="${W - padX}" y2="${y}"/>
        ${readings.length ? `<circle class="dot" cx="${W - padX - 4}" cy="${y}" r="4.5"/><text x="${W - padX - 4}" y="${y + 20}" text-anchor="end">${esc(E.shortDate(readings[0].date))}</text>` : ''}
      </svg>`;
    }
    const vals = readings.map(r => r.total);
    let min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (max - min < 1) { max += 50; min -= 50; }
    const span = max - min, pad = span * 0.12; min -= pad; max += pad;
    const t0 = new Date(readings[0].date).getTime(), t1 = new Date(readings[readings.length - 1].date).getTime();
    const X = i => { const t = new Date(readings[i].date).getTime(); return padX + (t1 === t0 ? (i / (readings.length - 1)) : (t - t0) / (t1 - t0)) * (W - padX * 2); };
    const Y = v => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
    const pts = readings.map((r, i) => [X(i), Y(r.total)]);
    let d = '', gaps = '';
    pts.forEach((p, i) => {
      if (i === 0) { d += `M${p[0].toFixed(1)},${p[1].toFixed(1)}`; return; }
      const days = E.daysBetween(readings[i - 1].date, readings[i].date);
      if (days > 75) { gaps += `<line class="gap" x1="${pts[i - 1][0].toFixed(1)}" y1="${pts[i - 1][1].toFixed(1)}" x2="${p[0].toFixed(1)}" y2="${p[1].toFixed(1)}"/>`; d += `M${p[0].toFixed(1)},${p[1].toFixed(1)}`; }
      else d += ` L${p[0].toFixed(1)},${p[1].toFixed(1)}`;
    });
    const last = pts[pts.length - 1], ch = E.change(readings);
    const down = ch && ch.amount < 0;
    const zeroY = (min < 0 && max > 0) ? Y(0) : null;
    const area = `${d.replace(/M/g, (m, i) => i ? 'L' : 'M')} L${last[0].toFixed(1)},${(H - padB).toFixed(1)} L${pts[0][0].toFixed(1)},${(H - padB).toFixed(1)} Z`;
    const len = Math.round(pts.reduce((a, p, i) => i ? a + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0, 0) + 10);
    const draw = opts.animate && !reduced() ? ' draw' : '';
    return `<svg class="line" viewBox="0 0 ${W} ${H}" role="img" aria-label="Net worth over time: ${readings.length} readings, from ${E.fmt(readings[0].total, sym())} on ${esc(E.shortDate(readings[0].date))} to ${E.fmt(readings[readings.length - 1].total, sym())} on ${esc(E.shortDate(readings[readings.length - 1].date))}.">
      ${zeroY !== null ? `<line class="base" x1="${padX}" y1="${zeroY.toFixed(1)}" x2="${W - padX}" y2="${zeroY.toFixed(1)}"/><text x="${padX}" y="${(zeroY - 4).toFixed(1)}">0</text>` : ''}
      <path class="fill${down ? ' down' : ''}${draw}" d="${area}"/>
      ${gaps}
      <path class="path${down ? ' down' : ''}${draw}" d="${d}" style="--len:${len}"/>
      <circle class="dot${down ? ' down' : ''}" cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="4.5"/>
      <text x="${padX}" y="${H - 6}">${esc(E.shortDate(readings[0].date))}</text>
      <text x="${W - padX}" y="${H - 6}" text-anchor="end">${esc(E.shortDate(readings[readings.length - 1].date))}</text>
    </svg>`;
  }
  function updateSparkIcon() {
    const el = document.getElementById('sparkIcon'); if (!el) return;
    const r = state.readings;
    if (r.length < 2) { el.setAttribute('points', '3,17 8,13 12,15 17,8 21,5'); return; }
    const vals = r.map(x => x.total); let min = Math.min.apply(null, vals), max = Math.max.apply(null, vals); if (max - min < 1) { max += 1; min -= 1; }
    el.setAttribute('points', r.map((x, i) => `${(3 + i / (r.length - 1) * 18).toFixed(1)},${(19 - (x.total - min) / (max - min) * 14).toFixed(1)}`).join(' '));
  }

  /* ---------- router ---------- */
  const routes = {};
  function parse() {
    const h = location.hash || '#/home';
    const [path, q] = h.slice(1).split('?');
    const query = {}; (q || '').split('&').forEach(kv => { if (!kv) return; const [k, v] = kv.split('='); query[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
    return { path: path || '/home', query };
  }
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  function render() {
    const { path, query } = parse();
    let name = path.replace(/^\//, '') || 'home';
    if (name.indexOf('import') === 0 || query.import) name = 'import';
    if (!state.onboarded && !['start', 'import', 'networth', 'about'].includes(name)) { location.hash = '#/start'; return; }
    const fn = routes[name] || routes.home;
    view.innerHTML = '';
    view.scrollTop = 0; window.scrollTo(0, 0);
    fn(query);
    const t = view.querySelector('.title') || view.querySelector('.hero-num') || view.querySelector('.eyebrow'); if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
    tabbar.hidden = !state.onboarded || ['start', 'import', 'payday', 'rematch'].includes(name);
    tabbar.querySelectorAll('a').forEach(a => { const tab = a.getAttribute('data-tab'); const on = tab === name || (tab === 'home' && name === 'networth') || (tab === 'settings' && ['reminders', 'about'].includes(name)); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    updateSparkIcon();
  }
  window.addEventListener('hashchange', render);
  const html = s => { view.innerHTML = s; };
  const $ = sel => view.querySelector(sel);
  const $$ = sel => Array.from(view.querySelectorAll(sel));
  const on = (sel, ev, fn) => $$(sel).forEach(el => el.addEventListener(ev, fn));
  const field = (id, label, value, opts) => { opts = opts || {}; return `<label class="field${opts.compact ? ' compact' : ''}" for="${id}"><span class="label">${esc(label)}</span><span class="in">${opts.nosym ? '' : `<span class="sym" aria-hidden="true">${esc(sym())}</span>`}<input id="${id}" type="number" inputmode="decimal" enterkeyhint="${opts.enter || 'next'}" step="${opts.step || '0.01'}" ${opts.min !== undefined ? `min="${opts.min}"` : ''} ${opts.max !== undefined ? `max="${opts.max}"` : ''} placeholder="${esc(opts.ph || '0')}" value="${value === null || value === undefined ? '' : esc(value)}"></span>${opts.hint ? `<span class="hint">${esc(opts.hint)}</span>` : ''}</label>`; };
  const val = id => E.num(document.getElementById(id) && document.getElementById(id).value);
  const focusChoices = () => E.FOCUS.map(o => `<button class="choice" type="button" data-focus="${o.key}" aria-pressed="${state.focus === o.key ? 'true' : 'false'}"><span>${esc(o.label)}</span><span class="sub">${esc(o.sub)}</span></button>`).join('');

  const brand = `<div class="brand"><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="3,17 8,13 12,15 17,8 21,5"/></svg>The Line</div>`;

  /* ---------- onboarding: two questions, or none ---------- */
  routes.start = query => {
    const step = query.q || '1';
    if (step === '1') {
      const days = Array.from({ length: 31 }, (_, i) => i + 1);
      html(`<div class="screen">
        <div class="grow">${brand}
          <p class="eyebrow" style="margin-top:40px;">One of two questions</p>
          <h1 class="title big">When do you get paid?</h1>
          <p class="body dim">It sets the moment the app shows up. Nothing else about you is asked.</p>
          <label class="field" for="obDay"><span class="label">Day of the month</span><span class="in"><select id="obDay">${days.map(d => `<option value="${d}" ${d === (state.settings.payday.day || 25) ? 'selected' : ''}>${E.ordinal(d)}</option>`).join('')}</select></span></label>
          <div class="choices" style="margin-top:14px;">
            <button class="choice" type="button" id="obVaries" aria-pressed="${state.settings.payday.irregular ? 'true' : 'false'}"><span>It varies — shifts, commission, freelance</span><span class="sub">You'll budget on your lowest recent month. Everything above it is a windfall.</span></button>
          </div>
        </div>
        <div class="bottom"><button class="btn primary" type="button" id="obNext">Next</button>
          <p class="caption" style="text-align:center;margin-top:12px;">Finished the course? <a class="link" href="#/import">Import your Module 9 plan instead</a></p></div>
      </div>`);
      on('#obVaries', 'click', e => { const b = e.currentTarget; b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); });
      on('#obNext', 'click', () => { state.settings.payday.day = parseInt($('#obDay').value, 10); state.settings.payday.irregular = $('#obVaries').getAttribute('aria-pressed') === 'true'; state.plan.irregular = state.settings.payday.irregular; if (!state.plan.transferDay) state.plan.transferDay = state.settings.payday.day >= 28 ? 1 : state.settings.payday.day + 1; save(); go('#/start?q=2'); });
      return;
    }

    html(`<div class="screen">
      <div class="grow">${brand}
        <p class="eyebrow" style="margin-top:40px;">Two of two</p>
        <h1 class="title big">What are you working on?</h1>
        <p class="body dim">It sets which step you're on and what the home screen asks of you.</p>
        <div class="choices" role="group" aria-label="What are you working on">${focusChoices()}</div>
      </div>
      <div class="bottom"><button class="btn primary" type="button" id="obDone" ${state.focus ? '' : 'disabled'}>Next: your first reading</button><button class="btn ghost" type="button" id="obBack">Back</button></div>
    </div>`);
    on('.choice', 'click', e => { $$('.choice').forEach(c => c.setAttribute('aria-pressed', 'false')); e.currentTarget.setAttribute('aria-pressed', 'true'); state.focus = e.currentTarget.getAttribute('data-focus'); $('#obDone').disabled = false; });
    on('#obBack', 'click', () => go('#/start?q=1'));
    on('#obDone', 'click', () => { state.plan.step = E.FOCUS_STEP[state.focus]; state.createdAt = state.createdAt || S.today(); save(); go('#/networth?first=1'); });
  };

  /* ---------- import from the course (rides in the URL fragment; nothing is sent) ---------- */
  routes.import = query => {
    const raw = query.import || (location.hash.match(/import=([^&]+)/) || [])[1];
    const data = raw ? S.decodeHandoff(raw) : null;
    if (!data) {
      html(`<div class="screen"><div class="grow">${brand}<h1 class="title big" style="margin-top:40px;">Import your plan</h1>
        <p class="body dim">At the end of Module 9, the one-page plan has an "open in the app" button. It brings your numbers here through the link itself — nothing is uploaded anywhere.</p>
        <p class="body dim">No plan was found in this link.</p></div>
        <div class="bottom"><a class="btn quiet" href="https://financial-literacy-course.netlify.app/course/module-9.html#p3">Open Module 9</a><button class="btn ghost" type="button" id="imStart">Start without it</button></div></div>`);
      on('#imStart', 'click', () => go('#/start?q=1'));
      return;
    }
    const p = data.plan || {};
    const rows = [['Net worth', p.netWorth !== null && p.netWorth !== undefined ? f(p.netWorth) : null], ['Net monthly income', p.income ? f(p.income) : null], ['Essential costs', p.fixed ? f(p.fixed) : null], ['Method', p.method || null], ['Automatic transfer', p.transferAmount ? f(p.transferAmount) + (p.transferDay ? ' on the ' + E.ordinal(p.transferDay) : '') : null], ['Emergency fund', p.efCurrent !== undefined || p.efTarget ? f(p.efCurrent || 0) + ' → ' + (p.efTarget ? f(p.efTarget) : '—') : null], ['Debt first', p.debt || null], ['Step', p.step !== undefined && p.step !== '' && p.step !== null ? 'Step ' + p.step : null], ['Goal', p.goal || null], ['Weekly check', p.weeklyDay || null]].filter(r => r[1]);
    html(`<div class="screen"><div class="grow">${brand}
      <p class="eyebrow" style="margin-top:40px;">From Module 9</p><h1 class="title big">Your plan, already here.</h1>
      <p class="body dim">No questions to answer. Check it looks right and it becomes the living version.</p>
      <div class="rows">${rows.map(r => `<div class="row"><span class="k">${esc(r[0])}</span><span class="v on">${esc(r[1])}</span></div>`).join('')}</div>
      ${rows.length ? '' : '<p class="body dim">The plan in this link is empty — you can still start and fill it in.</p>'}
    </div><div class="bottom"><button class="btn primary" type="button" id="imUse">Use this plan</button><button class="btn ghost" type="button" id="imSkip">Start fresh instead</button></div></div>`);
    on('#imSkip', 'click', () => go('#/start?q=1'));
    on('#imUse', 'click', () => {
      const pl = state.plan;
      if (p.income) pl.income = p.income; if (p.fixed) pl.fixed = p.fixed; if (p.transferAmount) pl.transferAmount = p.transferAmount; if (p.transferDay) pl.transferDay = p.transferDay;
      if (p.efCurrent !== undefined) pl.efCurrent = p.efCurrent; if (p.efTarget) pl.efTarget = p.efTarget;
      if (p.debt) pl.debt.name = p.debt; if (p.goalAmount) pl.goal.amount = p.goalAmount; if (p.goalDate) pl.goal.date = p.goalDate; if (p.goalWhy) pl.goal.why = p.goalWhy;
      if (p.step !== undefined && p.step !== '' && p.step !== null) pl.step = parseInt(p.step, 10); if (p.gap) pl.gap = p.gap; if (p.reviewDate) pl.reviewDate = p.reviewDate;
      const m = { '50 / 30 / 20': '503020', 'Zero-based': 'zero', 'Pay yourself first': 'pyf' }[p.method]; if (m) state.method = m;
      const wd = E.DAYS.indexOf(p.weeklyDay); if (wd >= 0) state.settings.weeklyDay = wd;
      if (p.transferDay) state.settings.payday.day = p.transferDay > 1 ? p.transferDay - 1 : 31;
      if (p.netWorth !== null && p.netWorth !== undefined && !state.readings.length) {
        const date = p.netWorthDate || S.today();
        state.readings.push({ date, assets: {}, liabilities: {}, assetsTotal: null, liabilitiesTotal: null, total: E.round2(p.netWorth), imported: true });
        state.rematch.due = E.addMonths(date, 6);
      }
      state.createdAt = state.createdAt || S.today(); state.onboarded = true; save();
      history.replaceState(null, '', location.pathname); go('#/home');
    });
  };

  /* ---------- net worth: the monthly reading (same fields as Module 1) ---------- */
  const A = [['a1', 'Cash & savings'], ['a2', 'Current account'], ['a3', 'Investments'], ['a4', 'Pension savings'], ['a5', 'Property value'], ['a6', 'Vehicle value'], ['a7', 'Other valuables']];
  const L = [['l1', 'Credit card debt'], ['l2', 'Student loans'], ['l3', 'Car loan'], ['l4', 'Mortgage'], ['l5', 'Other debt (incl. BNPL)']];
  routes.networth = query => {
    const first = query.first === '1' || !state.readings.length;
    const last = state.readings[state.readings.length - 1];
    const pre = last && !last.imported ? last : { assets: {}, liabilities: {} };
    html(`<div class="screen"><div class="grow">
      <p class="eyebrow">${first ? 'Your first reading' : 'Monthly update · pre-filled with last time'}</p>
      <h1 class="title">${first ? 'What do you own, and what do you owe?' : 'What changed?'}</h1>
      <p class="body dim small">Estimates are fine. Skip what doesn't apply. ${first ? 'This is the first point on the line — the second one is where it gets interesting.' : 'Only the total is kept; the fields make it honest.'}</p>
      <div class="section"><h2>Own</h2>${A.map(a => field('nw_' + a[0], a[1], pre.assets[a[0]], { compact: true })).join('')}</div>
      <div class="section"><h2>Owe</h2>${L.map(l => field('nw_' + l[0], l[1], pre.liabilities[l[0]], { compact: true })).join('')}</div>
      <div class="section"><div class="kv"><span class="dim">Own</span><span class="v" id="nwA">—</span></div><div class="kv"><span class="dim">Owe</span><span class="v" id="nwL">—</span></div><div class="kv"><span>Net worth</span><span class="v" id="nwT" style="font-size:24px;">—</span></div></div>
    </div><div class="bottom"><button class="btn primary" type="button" id="nwSave">Save reading</button>${first ? '<button class="btn ghost" type="button" id="nwSkip">Skip for now</button>' : '<button class="btn ghost" type="button" id="nwCancel">Cancel</button>'}</div></div>`);
    const recalc = () => { const t = E.readingTotals(collect(A), collect(L)); $('#nwA').textContent = f(t.assetsTotal); $('#nwL').textContent = f(t.liabilitiesTotal); $('#nwT').textContent = f(t.total); };
    const collect = list => { const o = {}; list.forEach(x => { const v = val('nw_' + x[0]); if (v !== null) o[x[0]] = v; }); return o; };
    on('input', 'input', recalc); recalc();
    on('#nwSave', 'click', () => {
      const assets = collect(A), liabilities = collect(L);
      if (!Object.keys(assets).length && !Object.keys(liabilities).length) { toast('Enter at least one number — an estimate is fine.'); return; }
      const t = E.readingTotals(assets, liabilities), date = S.today();
      state.readings = state.readings.filter(r => r.date !== date);
      state.readings.push(Object.assign({ date, assets, liabilities }, t)); state.readings.sort((a, b) => a.date < b.date ? -1 : 1);
      if (!state.rematch.due) state.rematch.due = E.addMonths(state.readings[0].date, 6);
      state.lineAnimatedFor = null; state.onboarded = true; state.createdAt = state.createdAt || date; save(); go('#/home');
    });
    on('#nwSkip', 'click', () => { state.onboarded = true; state.createdAt = state.createdAt || S.today(); save(); go('#/home'); });
    on('#nwCancel', 'click', () => go('#/home'));
  };

  /* ---------- home: the line, then one action, then nothing ---------- */
  routes.home = () => {
    const today = S.today(), r = state.readings, last = r[r.length - 1];
    const ch = E.changeText(r, sym()), act = E.nextAction(state, today), sig = E.fitSignals(state, today)[0];
    const enc = E.encouragement(state);
    const animate = last && state.lineAnimatedFor !== last.date;
    if (animate) { state.lineAnimatedFor = last.date; save(); }
    const exportNudge = state.createdAt && E.daysBetween(state.createdAt, today) >= 90 && !state.exportedAt;
    const focusNow = E.focusLabel(state.focus || E.focusForStep(E.currentStep(state)));
    html(`<div class="screen"><div class="grow">
      <p class="eyebrow">Net worth${last ? ' · ' + esc(E.shortDate(last.date)) : ''}</p>
      ${last ? `<p class="hero-num">${f(last.total)}</p>` : `<p class="hero-num dim">—</p>`}
      ${ch ? `<p class="delta ${ch.dir}"><button class="tapnum" type="button" data-explain="change">${esc(ch.text)}</button></p>` : last ? `<p class="small dim">One reading so far — the second one is where this gets interesting.</p>` : `<p class="small dim">No reading yet. The first one takes two minutes.</p>`}
      <div class="line-wrap">${lineSVG(r, { animate })}</div>
      ${enc ? `<p class="hand">${esc(enc)}</p>` : ''}
      ${sig ? `<div class="note attn"><span>${esc(sig.text)}</span>${sig.action ? `<button class="link accent act" type="button" data-sig="${esc(JSON.stringify(sig.action))}">${esc(sig.action.label)}</button>` : ''}</div>` : ''}
      ${exportNudge ? `<div class="note"><span>Three months of history now lives only on this phone. Worth an export.</span><a class="link act" href="#/settings">Export a copy</a></div>` : ''}
    </div>
    <div class="bottom">
      <p class="caption" style="margin-bottom:8px;">${focusNow ? `Working on ${esc(focusNow.toLowerCase())} · <a class="link" href="#/plan">change</a>` : `<a class="link" href="#/plan">Choose what you're working on</a>`}</p>
      <p class="body" style="margin-bottom:${act.label ? '12px' : '0'};">${esc(act.text)}</p>
      ${act.label ? `<button class="btn ${act.kind === 'payday' || act.kind === 'check' ? 'primary' : ''}" type="button" data-go="${act.route}">${esc(act.label)}</button>` : ''}
    </div></div>`);
    on('[data-go]', 'click', e => go(e.currentTarget.getAttribute('data-go')));
    on('[data-explain]', 'click', e => openSheet(e.currentTarget.getAttribute('data-explain')));
    on('[data-sig]', 'click', e => applySignal(JSON.parse(e.currentTarget.getAttribute('data-sig'))));
  };
  function applySignal(a) {
    if (a.type === 'lower') { state.plan.transferAmount = a.amount; save(); toast('Transfer set to ' + f(a.amount) + '. Changing the number isn\'t starting over.'); render(); }
    else if (a.type === 'switch') { state.method = a.to; save(); toast('Method: ' + E.METHODS[a.to] + '. Changing method isn\'t starting over — everything carries across.'); render(); }
    else if (a.type === 'route') go(a.route);
  }

  /* ---------- payday: five seconds ---------- */
  routes.payday = () => {
    const amt = E.savingsTarget(state), irregular = state.settings.payday.irregular;
    html(`<div class="screen"><div class="grow">
      <p class="eyebrow">Payday</p>
      <h1 class="title big">${irregular ? 'Money came in. How much of the extra goes to savings?' : amt ? 'Move ' + f(amt) + ' to savings?' : 'Did money move to savings?'}</h1>
      <p class="body dim small">This is a note to yourself, not a bank transfer — the app can't move money and won't pretend to.</p>
      <div id="pdAlt" hidden>${field('pdAmount', 'Amount moved', amt, {})}</div>
      <div id="pdSkip" hidden><p class="body" style="margin-top:20px;">Too much this month?</p><div class="row-btns"><button class="btn quiet" type="button" data-skip="yes">Yes</button><button class="btn quiet" type="button" data-skip="no">No, just this month</button></div></div>
    </div>
    <div class="bottom" id="pdBtns">
      <button class="btn primary" type="button" id="pdDone">${irregular ? 'Enter the amount' : 'Done'}</button>
      <button class="btn quiet" type="button" id="pdDiff">Different amount</button>
      <button class="btn ghost" type="button" id="pdSkipBtn">Skip this month</button>
    </div></div>`);
    const log = (status, amount, tooMuch) => { state.paydays.push({ date: S.today(), amount, status, tooMuch: !!tooMuch }); save(); };
    on('#pdDone', 'click', () => { if (irregular || $('#pdAlt').hidden === false) { const v = val('pdAmount'); if (v === null) { $('#pdAlt').hidden = false; document.getElementById('pdAmount').focus(); $('#pdDone').textContent = 'Done'; return; } log(v === amt ? 'done' : 'adjusted', v); } else log('done', amt); toast('Logged. That\'s the whole job.'); go('#/home'); });
    on('#pdDiff', 'click', () => { $('#pdAlt').hidden = false; document.getElementById('pdAmount').focus(); $('#pdDone').textContent = 'Done'; });
    on('#pdSkipBtn', 'click', () => { $('#pdSkip').hidden = false; $('#pdBtns').hidden = true; });
    on('[data-skip]', 'click', e => {
      const yes = e.currentTarget.getAttribute('data-skip') === 'yes';
      log('skipped', 0, yes);
      if (yes && amt) { const lower = Math.max(10, Math.round(amt / 2 / 5) * 5); state.plan.transferAmount = lower; save(); toast('Standing amount lowered to ' + f(lower) + '. Skipping isn\'t failing.'); }
      else toast('Skipped. Nothing else happens.');
      go('#/home');
    });
  };

  /* ---------- weekly check: three numbers ---------- */
  routes.check = query => {
    const light = query.light === '1';
    const method = state.method;
    html(`<div class="screen"><div class="grow">
      <p class="eyebrow">Weekly check · ${esc(E.DAYS[new Date().getDay()])}</p>
      <h1 class="title">${light ? 'One number.' : 'Three numbers.'}</h1>
      <p class="body dim small">Rough is right. Round to the nearest ten.</p>
      ${light ? '' : field('ckIn', 'Came in this week', null) + field('ckOut', 'Went out', null)}
      ${field('ckLeft', "What's left", null)}
      ${!light && method === '503020' ? field('ckWants', 'Roughly how much went on wants?', null, { hint: 'Restaurants, clothes, going out. A guess is fine.' }) : ''}
      ${!light && method === 'zero' ? field('ckUnassigned', 'Anything unassigned?', null, { hint: 'Zero is the goal. A number here is just information.' }) : ''}
      ${light ? '' : `<label class="field" for="ckNote"><span class="label">What surprised you?</span><textarea id="ckNote" class="hand" rows="2" placeholder="optional"></textarea></label>`}
    </div><div class="bottom"><button class="btn primary" type="button" id="ckSave">Save check</button><button class="btn ghost" type="button" data-go="#/home">Not now</button></div></div>`);
    on('[data-go]', 'click', e => go(e.currentTarget.getAttribute('data-go')));
    on('#ckSave', 'click', () => {
      const left = val('ckLeft'), inn = val('ckIn'), out = val('ckOut');
      if (left === null && inn === null && out === null) { toast('One number is enough.'); return; }
      const c = { date: S.today(), in: inn, out, left, note: (document.getElementById('ckNote') || {}).value || '', wants: val('ckWants'), unassigned: val('ckUnassigned') };
      state.checks = state.checks.filter(x => x.date !== c.date); state.checks.push(c); save();
      const obs = E.observation(state.checks, sym());
      const target = E.leftForVariable(state);
      html(`<div class="screen"><div class="grow">
        <p class="eyebrow">Saved</p>
        ${left !== null ? `<p class="hero-num">${f(left)}</p><p class="small dim">left this week</p>` : `<p class="hero-num">${f(inn || 0)} → ${f(out || 0)}</p><p class="small dim">in and out</p>`}
        ${target !== null && left !== null && method === 'pyf' ? `<p class="small dim" style="margin-top:14px;">Your plan leaves about ${f(target)} a month for everything variable. <button class="tapnum" type="button" data-explain="left">How that's worked out</button></p>` : ''}
        ${obs ? `<div class="note">${esc(obs)}</div>` : ''}
        ${c.note ? `<p class="hand" style="margin-top:20px;">“${esc(c.note)}”</p>` : ''}
      </div><div class="bottom"><button class="btn" type="button" data-go="#/home">Done</button></div></div>`);
      on('[data-go]', 'click', e => go(e.currentTarget.getAttribute('data-go')));
      on('[data-explain]', 'click', e => openSheet(e.currentTarget.getAttribute('data-explain')));
    });
  };

  /* ---------- plan: the Module 9 page, alive ---------- */
  routes.plan = () => {
    const p = state.plan, m = state.method;
    const target = E.savingsTarget(state), left = E.leftForVariable(state), imp = E.impossibility(state);
    const stepOpts = E.STEPS.map(s => `<option value="${s.n}" ${String(p.step) === String(s.n) ? 'selected' : ''}>Step ${s.n} — ${esc(s.short)}</option>`).join('');
    const stepNow = E.currentStep(state);
    const stepNote = stepNow !== null && E.STEPS[stepNow] ? E.STEPS[stepNow].does + '. ' + E.STEPS[stepNow].why : 'Pick one and the home screen starts asking for that.';
    html(`<div class="screen"><div class="grow">
      <p class="eyebrow">Plan</p><h1 class="title">One page. Boring on purpose.</h1>
      <div class="section"><h2>Working on now</h2>
        <p class="caption" style="margin-bottom:10px;">This sets which step you're on and what the home screen asks of you. Change it whenever the answer changes — nothing resets.</p>
        <div class="choices" role="group" aria-label="What you're working on">${focusChoices()}</div>
        <label class="field" for="plStep" style="margin-top:14px;"><span class="label">Order-of-operations step</span><span class="in"><select id="plStep"><option value="">— not set —</option>${stepOpts}</select></span></label>
        <p class="caption" id="plStepNote">${esc(stepNote)}</p>
      </div>
      <div class="section"><h2>Method</h2>
        <div class="seg" role="group" aria-label="Budgeting method">${Object.keys(E.METHODS).map(k => `<button type="button" data-method="${k}" aria-pressed="${m === k ? 'true' : 'false'}">${esc(E.METHODS[k])}</button>`).join('')}</div>
        <p class="caption" style="margin-top:8px;">Changing method isn't starting over. The line, the fund, the streak of real actions — all of it carries across.</p>
      </div>
      <div class="section"><h2>Money in and out</h2>
        ${field('plIncome', p.irregular ? 'Lowest month in the last six' : 'Net monthly income', p.income, { compact: true, hint: p.irregular ? 'Everything above this is a windfall to allocate when it arrives.' : 'What actually lands in your account.' })}
        ${field('plFixed', 'Fixed costs', p.fixed, { compact: true, hint: 'Rent, bills, subscriptions, minimum debt payments.' })}
        ${m === '503020' ? `<div class="kv"><span class="dim">Savings target (20%)</span><span class="v"><button class="tapnum" type="button" data-explain="savingsTarget">${f(target)}</button></span></div>` : field('plTransfer', m === 'zero' ? 'Assigned to savings' : 'Transfer on payday', p.transferAmount, { compact: true })}
        ${field('plTransferDay', 'Transfer day of month', p.transferDay, { compact: true, nosym: true, step: '1', min: 1, max: 31, ph: 'day' })}
        <div class="kv"><span class="dim">Left for everything variable</span><span class="v ${left !== null && left < 0 ? 'down' : ''}"><button class="tapnum" type="button" data-explain="left">${f(left)}</button></span></div>
        ${imp ? `<div class="note attn"><span>${esc(imp.text)}</span></div>` : ''}
      </div>
      <div class="section"><h2>Emergency fund</h2><div class="grid2">${field('plEfCur', 'Saved so far', p.efCurrent, { compact: true })}${field('plEfTgt', 'Target', p.efTarget, { compact: true, hint: 'Leave blank to use the stages.' })}</div></div>
      <div class="section"><h2>Debt being attacked</h2>
        <label class="field" for="plDebtName"><span class="label">Which one, and why</span><span class="in"><input id="plDebtName" type="text" value="${esc(p.debt.name)}" placeholder="e.g. the card — highest rate" autocomplete="off"></span></label>
        <div class="grid2">${field('plDebtBal', 'Balance', p.debt.balance, { compact: true })}${field('plDebtRate', 'Rate, % a year', p.debt.rate, { compact: true, nosym: true, step: '0.1', ph: '0' })}</div>
        <div class="grid2">${field('plDebtMin', 'Minimum payment', p.debt.min, { compact: true })}${field('plDebtExtra', 'Extra per month', p.debt.extra, { compact: true, hint: 'Speed is the discount.' })}</div>
      </div>
      <div class="section"><h2>The dated goal</h2>
        ${field('plGoalAmt', 'Amount', p.goal.amount, { compact: true })}
        <div class="grid2"><label class="field" for="plGoalDate"><span class="label">By</span><span class="in"><input id="plGoalDate" type="text" value="${esc(p.goal.date)}" placeholder="June 2027" autocomplete="off"></span></label>
        <label class="field" for="plGoalWhy"><span class="label">Because</span><span class="in"><input id="plGoalWhy" type="text" value="${esc(p.goal.why)}" placeholder="a real safety net" autocomplete="off"></span></label></div>
      </div>
      <div class="section"><h2>Protection and review</h2>
        <label class="field" for="plGap"><span class="label">Protection gap still to close</span><span class="in"><input id="plGap" type="text" value="${esc(p.gap)}" placeholder="e.g. income protection — check employer first" autocomplete="off"></span></label>
        <label class="field" for="plReview"><span class="label">Next review</span><span class="in"><input id="plReview" type="date" value="${esc(p.reviewDate)}"></span></label>
      </div>
    </div><div class="bottom"><button class="btn primary" type="button" id="plSave">Save plan</button></div></div>`);
    const syncFocusUi = () => {
      $$('[data-focus]').forEach(c => c.setAttribute('aria-pressed', c.getAttribute('data-focus') === state.focus ? 'true' : 'false'));
      const n = E.currentStep(state), note = $('#plStepNote');
      if (note) note.textContent = n !== null && E.STEPS[n] ? E.STEPS[n].does + '. ' + E.STEPS[n].why : 'Pick one and the home screen starts asking for that.';
    };
    on('[data-focus]', 'click', e => {
      state.focus = e.currentTarget.getAttribute('data-focus');
      state.plan.step = E.FOCUS_STEP[state.focus];
      $('#plStep').value = String(state.plan.step);
      save(); syncFocusUi();
      toast('Working on ' + E.focusLabel(state.focus).toLowerCase() + '. Nothing was reset.');
    });
    on('#plStep', 'change', e => {
      state.plan.step = e.target.value === '' ? null : parseInt(e.target.value, 10);
      state.focus = E.focusForStep(state.plan.step);
      save(); syncFocusUi();
    });
    on('[data-method]', 'click', e => { state.method = e.currentTarget.getAttribute('data-method'); save(); toast('Method: ' + E.METHODS[state.method] + '. Nothing was reset.'); render(); });
    on('[data-explain]', 'click', e => openSheet(e.currentTarget.getAttribute('data-explain')));
    on('#plSave', 'click', () => {
      const pl = state.plan;
      pl.income = val('plIncome'); pl.fixed = val('plFixed');
      if (document.getElementById('plTransfer')) pl.transferAmount = val('plTransfer');
      pl.transferDay = val('plTransferDay'); pl.efCurrent = val('plEfCur'); pl.efTarget = val('plEfTgt');
      const nb = val('plDebtBal');
      if (nb !== null && nb !== pl.debt.balance) { state.debtLog.push({ date: S.today(), balance: nb }); }
      pl.debt = { name: $('#plDebtName').value.trim(), balance: nb, rate: val('plDebtRate'), min: val('plDebtMin'), extra: val('plDebtExtra') };
      pl.goal = { amount: val('plGoalAmt'), date: $('#plGoalDate').value.trim(), why: $('#plGoalWhy').value.trim() };
      pl.step = $('#plStep').value === '' ? null : parseInt($('#plStep').value, 10); pl.gap = $('#plGap').value.trim(); pl.reviewDate = $('#plReview').value;
      if (pl.transferDay && !state.settings.payday.day) state.settings.payday.day = pl.transferDay > 1 ? pl.transferDay - 1 : 31;
      save(); toast('Plan saved.'); go('#/home');
    });
  };

  /* ---------- progress: compared only to your own past ---------- */
  routes.progress = () => {
    const r = state.readings, p = state.plan, ef = E.efStages(state), ds = E.debtSpeed(p.debt), step = E.currentStep(state);
    const first = r[0], last = r[r.length - 1];
    const pctEf = ef.next ? Math.min(100, ef.current / ef.next.target * 100) : 100;
    html(`<div class="screen"><div class="grow">
      <p class="eyebrow">Progress · compared only to your own past</p><h1 class="title">The line, in full.</h1>
      <div class="line-wrap">${lineSVG(r, { h: 220 })}</div>
      ${first && last && r.length > 1 ? `<div class="kv"><span class="dim">Since ${esc(E.shortDate(first.date))}</span><span class="v ${last.total - first.total > 0 ? 'up' : last.total - first.total < 0 ? 'down' : ''}">${f(last.total - first.total, { sign: true })}</span></div>` : ''}
      <ul class="readings">${r.slice().reverse().slice(0, 6).map(x => `<li><span class="d">${esc(E.shortDate(x.date))}</span><span class="n">${f(x.total)}</span></li>`).join('') || '<li class="empty">No readings yet.</li>'}</ul>
      <button class="btn quiet" type="button" data-go="#/networth" style="margin-top:12px;">${r.length ? 'Add a reading' : 'Take the first reading'}</button>

      <div class="section"><h2>Emergency fund</h2>
        ${ef.next ? `<div class="kv"><span>Next: ${esc(ef.next.label)}</span><span class="v"><button class="tapnum" type="button" data-explain="ef">${f(ef.current)} of ${f(ef.next.target)}</button></span></div>
        <div class="bar" role="img" aria-label="${Math.round(pctEf)} percent of the next stage"><i style="width:${pctEf.toFixed(1)}%"></i></div>
        <div class="milestones">${ef.stages.map(s => `<span>${esc(s.label)} ${f(s.target, { dp: 0 })}</span>`).join('')}</div>
        ${ef.monthsToNext !== null ? `<p class="caption" style="margin-top:8px;">${ef.monthsToNext === 0 ? 'There.' : ef.monthsToNext + (ef.monthsToNext === 1 ? ' month' : ' months') + ' at ' + f(p.transferAmount) + ' a month.'}</p>` : p.transferAmount ? '' : '<p class="caption" style="margin-top:8px;">Set a transfer in the plan to see when the next stage lands.</p>'}` : `<p class="body dim small">${ef.current ? 'Past every stage that\'s set. Set a target in the plan if you want another.' : 'No savings yet — the first €50 is the hardest. The buffer comes first: €500.'}</p>`}
      </div>

      <div class="section"><h2>Debt</h2>
        ${p.debt.balance ? `<div class="kv"><span>${esc(p.debt.name || 'Balance')}</span><span class="v">${f(p.debt.balance)}</span></div>
          ${ds ? `<div class="kv"><span class="dim">Paying ${f(p.debt.min + ds.extra)} instead of ${f(p.debt.min)} saves</span><span class="v up"><button class="tapnum" type="button" data-explain="debt">${f(ds.saved)}</button></span></div><p class="caption">${ds.monthsSaved > 0 ? ds.monthsSaved + ' months sooner. ' : ''}${ds.extra ? '' : 'Add an extra amount in the plan to see the discount.'}</p>` : '<p class="caption">Add the rate and minimum in the plan to see what speed saves.</p>'}
          ${state.debtLog.length > 1 ? `<ul class="readings" style="margin-top:8px;">${state.debtLog.slice(-4).reverse().map(d => `<li><span class="d">${esc(E.shortDate(d.date))}</span><span class="n">${f(d.balance)}</span></li>`).join('')}</ul>` : ''}` : '<p class="body dim small">No debt being tracked. If there is one, the plan has a place for it.</p>'}
      </div>

      <div class="section"><h2>Order of operations</h2>
        <div class="rows">${E.STEPS.map(s => `<div class="row"><span class="k ${step === s.n ? '' : 'dim'}">${step === s.n ? '● ' : step !== null && s.n < step ? '✓ ' : '○ '}Step ${s.n} — ${esc(s.short)}${step === s.n ? `<small>${esc(s.why)}</small>` : ''}</span></div>`).join('')}</div>
        ${step !== null && step < 7 ? `<p class="caption" style="margin-top:8px;">What unlocks step ${step + 1}: ${esc(E.STEPS[step].does.toLowerCase())}.</p>` : ''}
      </div>
    </div></div>`);
    on('[data-go]', 'click', e => go(e.currentTarget.getAttribute('data-go')));
    on('[data-explain]', 'click', e => openSheet(e.currentTarget.getAttribute('data-explain')));
  };

  /* ---------- rematch: then vs now ---------- */
  routes.rematch = () => {
    const r = state.readings, first = r[0], last = r[r.length - 1];
    if (!first) { go('#/home'); return; }
    const diff = E.round2(last.total - first.total), months = Math.max(1, Math.round(E.daysBetween(first.date, last.date) / 30));
    const done = state.paydays.filter(x => x.status !== 'skipped').length, checks = state.checks.length;
    html(`<div class="screen"><div class="grow">
      <p class="eyebrow">The rematch</p><h1 class="title big">${esc(E.shortDate(first.date))} vs now.</h1>
      <div class="kv"><span class="dim">Then</span><span class="v">${f(first.total)}</span></div>
      <div class="kv"><span class="dim">Now</span><span class="v">${f(last.total)}</span></div>
      <div class="kv"><span>Direction</span><span class="v ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}">${f(diff, { sign: true })}</span></div>
      <p class="hand" style="margin-top:18px;">${diff >= 0 ? 'direction is the only score' : 'a second data point is where the information is'}</p>
      <div class="section"><h2>Which habits survived</h2>
        <div class="kv"><span class="dim">Payday transfers logged</span><span class="v">${done} of ${months}</span></div>
        <div class="kv"><span class="dim">Weekly checks</span><span class="v">${checks}</span></div>
        <p class="caption" style="margin-top:8px;">If the transfer stopped, was the amount too high or the date wrong? If the check stopped, it was probably too long — try the one-number version.</p>
      </div>
    </div><div class="bottom"><button class="btn primary" type="button" id="rmNext">Schedule the next one</button><button class="btn ghost" type="button" data-go="#/networth">Take a new reading first</button></div></div>`);
    on('[data-go]', 'click', e => go(e.currentTarget.getAttribute('data-go')));
    on('#rmNext', 'click', () => { state.rematch = { due: E.addMonths(S.today(), 6), seen: false }; save(); toast('Next rematch: ' + E.monthLabel(state.rematch.due) + '.'); go('#/home'); });
  };

  /* ---------- settings ---------- */
  routes.settings = () => {
    const s = state.settings;
    html(`<div class="screen"><div class="grow">
      <p class="eyebrow">Settings</p><h1 class="title">Yours to change.</h1>
      <div class="rows">
        <label class="row" for="stPayday"><span class="k">Payday<small>the day the prompt shows up</small></span><span class="v on"><select id="stPayday" class="mono" style="background:transparent;border:none;color:inherit;font:inherit;text-align:right;">${Array.from({ length: 31 }, (_, i) => i + 1).map(d => `<option value="${d}" ${s.payday.day === d ? 'selected' : ''}>${E.ordinal(d)}</option>`).join('')}</select></span></label>
        <button class="row tap" type="button" id="stIrregular"><span class="k">Irregular income<small>budget on the lowest recent month</small></span><span class="v ${s.payday.irregular ? 'on' : ''}">${s.payday.irregular ? 'On' : 'Off'}</span></button>
        <label class="row" for="stWeekly"><span class="k">Weekly check day</span><span class="v on"><select id="stWeekly" style="background:transparent;border:none;color:inherit;font:inherit;text-align:right;">${E.DAYS.map((d, i) => `<option value="${i}" ${s.weeklyDay === i ? 'selected' : ''}>${d}</option>`).join('')}</select></span></label>
        <a class="row tap" href="#/reminders"><span class="k">Reminders<small>payday, weekly, the rematch</small></span><span class="chev">›</span></a>
        <div class="row"><span class="k">Currency</span><span class="seg" style="width:150px;" role="group" aria-label="Currency">${['€', '$', '£'].map(c => `<button type="button" data-cur="${c}" aria-pressed="${s.currency === c ? 'true' : 'false'}">${c}</button>`).join('')}</span></div>
        <label class="row" for="stCountry"><span class="k">Country layer<small>tax and pension specifics, when configured</small></span><span class="v on"><select id="stCountry" style="background:transparent;border:none;color:inherit;font:inherit;text-align:right;max-width:150px;">${Object.keys(window.FL_COUNTRIES || { generic: { name: 'Generic' } }).map(k => `<option value="${k}" ${s.country === k ? 'selected' : ''}>${esc((window.FL_COUNTRIES || {})[k] ? window.FL_COUNTRIES[k].name : k)}</option>`).join('')}</select></span></label>
      </div>
      <div class="section"><h2>Data</h2>
        <div class="rows">
          <button class="row tap" type="button" id="stJson"><span class="k">Export everything<small>JSON — the whole history</small></span><span class="chev">↓</span></button>
          <button class="row tap" type="button" id="stCsv"><span class="k">Export as CSV<small>readings, checks, paydays</small></span><span class="chev">↓</span></button>
          <button class="row tap" type="button" id="stDelete"><span class="k" style="color:var(--down)">Delete everything<small>actually deletes — there is no server copy</small></span><span class="chev">›</span></button>
        </div>
        <p class="caption" style="margin-top:10px;">Financial data stays on this device. Nothing is sent anywhere. That also means a lost phone loses the history — export now and then.</p>
      </div>
      <div class="section"><h2>Subscription</h2>
        <p class="body small dim">Free while it's in preview. When a subscription comes, cancelling will be exactly as easy as signing up, and this app will never earn a commission on anything you open or buy. It compares; it doesn't recommend.</p>
      </div>
      <div class="section"><h2>About</h2>
        <p class="body small dim">The companion to the course. It shows up at the moments money decisions happen, asks for one thing, and remembers the answer. <a class="link" href="https://financial-literacy-course.netlify.app/">Back to the course</a></p>
        <p class="caption">Education, not financial advice.</p>
      </div>
    </div></div>`);
    on('#stPayday', 'change', e => { s.payday.day = parseInt(e.target.value, 10); save(); });
    on('#stIrregular', 'click', () => { s.payday.irregular = !s.payday.irregular; state.plan.irregular = s.payday.irregular; save(); render(); });
    on('#stWeekly', 'change', e => { s.weeklyDay = parseInt(e.target.value, 10); save(); });
    on('[data-cur]', 'click', e => { s.currency = e.currentTarget.getAttribute('data-cur'); save(); render(); });
    on('#stCountry', 'change', e => { s.country = e.target.value; save(); });
    on('#stJson', 'click', () => { S.download(S.exportJSON(state), 'the-line-export.json', 'application/json'); state.exportedAt = S.today(); save(); toast('Exported.'); });
    on('#stCsv', 'click', () => { S.download(S.exportCSV(state), 'the-line-export.csv', 'text/csv;charset=utf-8'); state.exportedAt = S.today(); save(); toast('Exported.'); });
    on('#stDelete', 'click', () => {
      html(`<div class="screen"><div class="grow"><p class="eyebrow">Delete everything</p><h1 class="title big">This removes every reading, check and plan from this device.</h1><p class="body dim">There is no server copy, so there is no undo. Export first if you might want it later.</p></div>
        <div class="bottom"><button class="btn quiet" type="button" id="delExport">Export first</button><button class="btn danger" type="button" id="delYes">Delete everything</button><button class="btn ghost" type="button" data-go="#/settings">Keep it</button></div></div>`);
      on('[data-go]', 'click', e => go(e.currentTarget.getAttribute('data-go')));
      on('#delExport', 'click', () => { S.download(S.exportJSON(state), 'the-line-export.json', 'application/json'); toast('Exported.'); });
      on('#delYes', 'click', () => { S.reset(); state = S.load(); applyTheme(); toast('Deleted.'); go('#/start?q=1'); });
    });
  };

  /* ---------- reminders: honest about what works today ---------- */
  routes.reminders = () => {
    const s = state.settings, installed = standalone(), perm = ('Notification' in window) ? Notification.permission : 'unsupported';
    html(`<div class="screen"><div class="grow">
      <p class="eyebrow"><a class="link" href="#/settings">‹ Settings</a></p><h1 class="title">Reminders</h1>
      <p class="body dim small">Tied to moments, never to nagging. At most four or five a month, and you choose which.</p>
      <div class="rows">
        ${[['payday', 'Payday prompt', 'the day you get paid'], ['weekly', 'Weekly check', E.DAYS[s.weeklyDay] + 's'], ['monthly', 'Net worth update', 'once a month']].map(r => `<button class="row tap" type="button" data-rem="${r[0]}"><span class="k">${r[1]}<small>${esc(r[2])}</small></span><span class="v ${s.reminders[r[0]] ? 'on' : ''}">${s.reminders[r[0]] ? 'On' : 'Off'}</span></button>`).join('')}
      </div>
      <div class="section"><h2>Calendar files — work everywhere, today</h2>
        <p class="body small dim">Each one adds a repeating event to your calendar. The calendar does the reminding; nothing leaves the device.</p>
        <button class="btn quiet" type="button" data-ics="payday" ${s.payday.day ? '' : 'disabled'}>Payday transfer · monthly on the ${s.payday.day ? esc(E.ordinal(state.plan.transferDay || s.payday.day)) : '—'}</button>
        <button class="btn quiet" type="button" data-ics="weekly">Weekly check · every ${esc(E.DAYS[s.weeklyDay])}</button>
        <button class="btn quiet" type="button" data-ics="rematch" ${state.rematch.due ? '' : 'disabled'}>Rematch · ${state.rematch.due ? esc(E.monthLabel(state.rematch.due)) : 'after your first reading'}</button>
      </div>
      <div class="section"><h2>Notifications</h2>
        ${installed ? (perm === 'granted' ? '<p class="body small dim">Allowed. Reminders that arrive while the app is closed need a server that doesn\'t exist yet — until then the calendar files above do the job, and the app shows what\'s due whenever it opens.</p>' : perm === 'denied' ? '<p class="body small dim">Blocked in your device settings. The calendar files above work regardless.</p>' : '<p class="body small dim">Allow notifications and the app can nudge you when something is due while it\'s open.</p><button class="btn quiet" type="button" id="rmPerm">Allow notifications</button>') : '<p class="body small dim">iPhone only allows reminders from apps on your home screen. Add this app there first (Share → Add to Home Screen) — takes 5 seconds — then come back here.</p>'}
      </div>
    </div></div>`);
    on('[data-rem]', 'click', e => { const k = e.currentTarget.getAttribute('data-rem'); s.reminders[k] = !s.reminders[k]; save(); render(); });
    on('[data-ics]', 'click', e => downloadIcs(e.currentTarget.getAttribute('data-ics')));
    on('#rmPerm', 'click', () => { Notification.requestPermission().then(() => render()); });
  };
  function downloadIcs(kind) {
    const s = state.settings, pad = S.pad, now = new Date();
    const stamp = now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate()) + 'T' + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + '00Z';
    const esc2 = t => String(t).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    let summary, rrule = '', start, desc;
    const d0 = new Date(); let startDate;
    if (kind === 'payday') {
      const day = state.plan.transferDay || s.payday.day; startDate = new Date(d0.getFullYear(), d0.getMonth(), Math.min(day, new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate())); if (startDate < d0) startDate.setMonth(startDate.getMonth() + 1);
      summary = 'Move ' + (E.savingsTarget(state) ? f(E.savingsTarget(state)) : 'your transfer') + ' to savings'; rrule = 'RRULE:FREQ=MONTHLY;BYMONTHDAY=' + day; desc = 'Payday. Confirm, adjust or skip in The Line — skipping is fine.';
    } else if (kind === 'weekly') {
      startDate = new Date(d0); startDate.setDate(d0.getDate() + ((s.weeklyDay - d0.getDay() + 7) % 7));
      summary = 'Weekly money check — three numbers'; rrule = 'RRULE:FREQ=WEEKLY;BYDAY=' + ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][s.weeklyDay]; desc = 'In, out, left. Rough numbers. One minute.';
    } else {
      const p = state.rematch.due.split('-'); startDate = new Date(+p[0], +p[1] - 1, +p[2]);
      summary = 'Net worth rematch — then vs now'; desc = 'Re-run the reading and compare with ' + (state.readings[0] ? E.shortDate(state.readings[0].date) + ' (' + f(state.readings[0].total) + ')' : 'your first reading') + '. Direction is the only score.';
    }
    const ymd = startDate.getFullYear() + pad(startDate.getMonth() + 1) + pad(startDate.getDate());
    const end = new Date(startDate); end.setDate(end.getDate() + 1); const ymdEnd = end.getFullYear() + pad(end.getMonth() + 1) + pad(end.getDate());
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//The Line//EN', 'BEGIN:VEVENT', 'UID:the-line-' + kind + '-' + ymd + '@the-line', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + ymd, 'DTEND;VALUE=DATE:' + ymdEnd, rrule, 'SUMMARY:' + esc2(summary), 'DESCRIPTION:' + esc2(desc), 'BEGIN:VALARM', 'TRIGGER:PT9H', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc2(summary), 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
    S.download(ics, 'the-line-' + kind + '.ics', 'text/calendar;charset=utf-8'); toast('Calendar file ready.');
  }

  /* ---------- boot ---------- */
  applyTheme();
  if (state.onboarded) { state.lastOpened = S.today(); save(); }
  if (!location.hash) location.hash = state.onboarded ? '#/home' : '#/start';
  render();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))) {
    navigator.serviceWorker.register(new URL('sw.js', document.baseURI)).catch(() => { /* offline is optional */ });
  }
})();
