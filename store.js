/* The Line — local-first store. All financial data lives on this device.
   One key in localStorage. Export and delete are always one tap away. */
(function (global) {
  'use strict';
  var KEY = 'nb.v1';
  var NB = global.NB = global.NB || {};

  function defaults() {
    return {
      v: 1,
      createdAt: null,            /* ISO date of first use */
      onboarded: false,
      settings: {
        currency: '€',
        payday: { day: null, irregular: false },   /* day of month, or irregular */
        weeklyDay: 0,                              /* 0 = Sunday … 6 = Saturday */
        reminders: { payday: true, weekly: true, monthly: true },
        country: 'generic',
        theme: 'auto'
      },
      focus: null,                /* 'buffer' | 'debt' | 'fund' | 'invest' */
      method: 'pyf',              /* 'pyf' | '503020' | 'zero' */
      plan: {
        income: null, irregular: false, fixed: null,
        transferAmount: null, transferDay: null,
        efCurrent: null, efTarget: null,
        debt: { name: '', balance: null, rate: null, min: null, extra: null },
        goal: { amount: null, date: '', why: '' },
        step: null, gap: '', reviewDate: ''
      },
      readings: [],               /* { date, assets:{}, liabilities:{}, total } */
      checks: [],                 /* { date, in, out, left, note, wants } */
      paydays: [],                /* { date, amount, status:'done'|'adjusted'|'skipped', tooMuch } */
      debtLog: [],                /* { date, balance } */
      rematch: { due: null, seen: false },
      exportedAt: null,
      lastOpened: null,
      lineAnimatedFor: null
    };
  }

  function load() {
    var s = null;
    try { s = JSON.parse(global.localStorage.getItem(KEY)); } catch (e) { s = null; }
    var d = defaults();
    if (!s || typeof s !== 'object') return d;
    /* shallow-merge unknown keys so older saves keep working */
    Object.keys(d).forEach(function (k) { if (s[k] === undefined) s[k] = d[k]; });
    Object.keys(d.settings).forEach(function (k) { if (s.settings[k] === undefined) s.settings[k] = d.settings[k]; });
    Object.keys(d.plan).forEach(function (k) { if (s.plan[k] === undefined) s.plan[k] = d.plan[k]; });
    return s;
  }
  function save(s) {
    try { global.localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (e) { return false; }
  }
  function reset() { try { global.localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }

  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function exportJSON(s) {
    return JSON.stringify({ exportedAt: new Date().toISOString(), app: 'the-line', version: 1, data: s }, null, 2);
  }
  function csvCell(v) { v = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function exportCSV(s) {
    var out = ['type,date,a,b,c,note'];
    s.readings.forEach(function (r) { out.push(['networth', r.date, r.assetsTotal, r.liabilitiesTotal, r.total, ''].map(csvCell).join(',')); });
    s.checks.forEach(function (c) { out.push(['check', c.date, c.in, c.out, c.left, c.note || ''].map(csvCell).join(',')); });
    s.paydays.forEach(function (p) { out.push(['payday', p.date, p.amount, p.status, p.tooMuch ? 'too much' : '', ''].map(csvCell).join(',')); });
    s.debtLog.forEach(function (d) { out.push(['debt', d.date, d.balance, '', '', ''].map(csvCell).join(',')); });
    return out.join('\r\n');
  }
  function download(text, name, type) {
    var blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  /* base64url helpers for the course → app handoff (nothing is sent anywhere; it rides in the URL fragment) */
  function encodeHandoff(obj) {
    var json = JSON.stringify(obj);
    var b = btoa(unescape(encodeURIComponent(json)));
    return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodeHandoff(str) {
    try {
      var b = str.replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
      return JSON.parse(decodeURIComponent(escape(atob(b))));
    } catch (e) { return null; }
  }

  NB.store = { KEY: KEY, defaults: defaults, load: load, save: save, reset: reset, today: today, pad: pad, exportJSON: exportJSON, exportCSV: exportCSV, download: download, encodeHandoff: encodeHandoff, decodeHandoff: decodeHandoff };
})(window);
