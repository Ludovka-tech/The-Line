/* The Line — one engine, three presentations.
   income · fixed · savingsTarget · variable(observed). Deterministic and inspectable:
   every number the app shows can explain itself (see explain()). */
(function (global) {
  'use strict';
  var NB = global.NB = global.NB || {};

  var STEPS = [
    { n: 0, does: 'Cover essentials and every minimum payment', short: 'essentials & minimums', why: 'Missed payments cost fees and damage your record. Nothing else matters until this is automatic.', action: 'Put every payment on autopay for the minimum.' },
    { n: 1, does: 'Build the €300–€500 buffer', short: 'the buffer', why: 'Breaks the cycle where every small emergency becomes new debt.', action: 'Set one transfer for the day after payday. €25 counts.' },
    { n: 2, does: 'Take any employer pension match in full', short: 'employer match', why: "An immediate 100% return. Many people never check whether they have this.", action: 'Find out whether your employer matches, and take all of it.' },
    { n: 3, does: 'Kill high-interest debt (roughly 8–10%+)', short: 'high-interest debt', why: 'Paying off 19% debt is a guaranteed 19% return.', action: 'Increase one payment on the highest-rate debt by a specific amount.' },
    { n: 4, does: 'Grow the emergency fund to 3–6 months', short: '3–6 month fund', why: 'What lets you stay invested later, and say no in the meantime.', action: 'Raise the transfer to the fund. One month of essentials first.' },
    { n: 5, does: "Use tax-advantaged accounts you're eligible for", short: 'tax-advantaged accounts', why: "A return you don't have to earn in the market.", action: 'Ask a local expert which accounts you qualify for, and what the catch is.' },
    { n: 6, does: 'Invest for long-term goals', short: 'long-term investing', why: 'Money with no deadline, in a low-cost diversified form you understand.', action: 'Write down your time horizon and your three weighted criteria.' },
    { n: 7, does: 'Save separately for dated goals', short: 'dated goals', why: "Anything needed inside a few years doesn't belong in volatile assets.", action: 'Give each dated goal its own account with a date on it.' }
  ];
  var FOCUS = [
    { key: 'buffer', step: 1, label: 'A first buffer', sub: 'A few hundred in a separate account, so small emergencies stop going on a card.' },
    { key: 'debt', step: 3, label: 'Clearing a debt', sub: 'One balance, attacked faster than the minimum.' },
    { key: 'fund', step: 4, label: 'The emergency fund', sub: 'Three to six months of essentials, in stages.' },
    { key: 'invest', step: 6, label: 'Starting to invest', sub: 'Money with no deadline, once the rest is in place.' }
  ];
  var FOCUS_STEP = {}; FOCUS.forEach(function (f) { FOCUS_STEP[f.key] = f.step; });
  function focusLabel(key) { for (var i = 0; i < FOCUS.length; i++) if (FOCUS[i].key === key) return FOCUS[i].label; return null; }
  /* the nearest focus for a hand-picked step, so the two never disagree */
  function focusForStep(n) {
    if (n === null || n === undefined || n === '') return null;
    n = parseInt(n, 10);
    if (n <= 1) return 'buffer';
    if (n <= 3) return 'debt';
    if (n <= 5) return 'fund';
    return 'invest';
  }
  var METHODS = { pyf: 'Pay yourself first', '503020': '50 / 30 / 20', zero: 'Zero-based' };
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function round2(n) { return Math.round(n * 100) / 100; }
  function fmt(n, sym, opts) {
    sym = sym || '€'; opts = opts || {};
    if (n === null || n === undefined || isNaN(n)) return '—';
    var neg = n < 0, abs = Math.round(Math.abs(n) * 100) / 100;
    var parts = abs.toFixed(opts.dp === undefined ? 2 : opts.dp).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '−' : (opts.sign && n > 0 ? '+' : '')) + sym + parts.join('.');
  }
  function num(v) { var n = parseFloat(String(v === null || v === undefined ? '' : v).replace(/,/g, '')); return isNaN(n) ? null : n; }
  function parseDate(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function daysBetween(a, b) { return Math.round((parseDate(b) - parseDate(a)) / 86400000); }
  function addMonths(iso, m) { var d = parseDate(iso); d.setMonth(d.getMonth() + m); return d.getFullYear() + '-' + NB.store.pad(d.getMonth() + 1) + '-' + NB.store.pad(d.getDate()); }
  function shortDate(iso) { var d = parseDate(iso); return d.getDate() + ' ' + MONTHS[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''); }
  function monthLabel(iso) { var d = parseDate(iso); return MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function ordinal(d) { d = parseInt(d, 10); var s = ['th', 'st', 'nd', 'rd'], v = d % 100; return d + (s[(v - 20) % 10] || s[v] || s[0]); }

  /* ---------- the shared model ---------- */
  function savingsTarget(state) {
    var p = state.plan, m = state.method;
    if (m === '503020') return p.income ? round2(p.income * 0.2) : null;
    return p.transferAmount;    /* pyf: a fixed amount the user picks; zero: whatever they assign */
  }
  function leftForVariable(state) {
    var p = state.plan, t = savingsTarget(state);
    if (p.income === null || p.fixed === null || t === null) return null;
    return round2(p.income - p.fixed - t);
  }
  /* what the method can't do with these numbers — said plainly, never rendered as fine */
  function impossibility(state) {
    var p = state.plan, m = state.method, sym = state.settings.currency;
    if (p.income === null || p.fixed === null) return null;
    if (m === '503020' && p.fixed > p.income * 0.5) {
      return { kind: 'split', text: 'Your rent and bills are ' + pct(p.fixed / p.income) + ' of your income, so this split can\'t work as written. Want to try a method that starts from what\'s actually left?', switchTo: 'pyf' };
    }
    var left = leftForVariable(state);
    if (left !== null && left < 0) {
      return { kind: 'short', text: 'After fixed costs, ' + fmt(savingsTarget(state), sym) + ' leaves you ' + fmt(-left, sym) + ' short each month. The number is the problem, not you — try a smaller transfer.', lower: Math.max(0, Math.floor((p.income - p.fixed) / 10) * 10) };
    }
    return null;
  }
  function pct(x) { return (Math.round(x * 1000) / 10).toFixed(x * 100 % 1 ? 1 : 0) + '%'; }

  /* ---------- rhythms ---------- */
  function paydayThisMonth(state, todayIso) {
    var d = state.settings.payday.day; if (!d) return null;
    var t = parseDate(todayIso); var dim = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
    return t.getFullYear() + '-' + NB.store.pad(t.getMonth() + 1) + '-' + NB.store.pad(Math.min(d, dim));
  }
  function paydayDue(state, todayIso) {
    var pd = paydayThisMonth(state, todayIso); if (!pd) return false;
    var diff = daysBetween(pd, todayIso);            /* days since payday */
    if (diff < 0 || diff > 6) return false;          /* open for a week after payday */
    var ym = todayIso.slice(0, 7);
    return !state.paydays.some(function (p) { return p.date.slice(0, 7) === ym; });
  }
  function weekStart(iso, weeklyDay) {  /* the most recent chosen weekday on or before iso */
    var d = parseDate(iso); var back = (d.getDay() - weeklyDay + 7) % 7; d.setDate(d.getDate() - back);
    return d.getFullYear() + '-' + NB.store.pad(d.getMonth() + 1) + '-' + NB.store.pad(d.getDate());
  }
  function weeklyDue(state, todayIso) {
    var ws = weekStart(todayIso, state.settings.weeklyDay);
    return !state.checks.some(function (c) { return c.date >= ws; });
  }
  function nwDue(state, todayIso) {
    if (!state.readings.length) return true;
    var last = state.readings[state.readings.length - 1].date;
    return daysBetween(last, todayIso) >= 28;
  }
  function rematchDue(state, todayIso) {
    return !!(state.rematch.due && todayIso >= state.rematch.due && !state.rematch.seen && state.readings.length);
  }

  /* ---------- next action: one sentence, one button ---------- */
  function nextAction(state, todayIso) {
    var sym = state.settings.currency, p = state.plan;
    if (!state.readings.length) return { kind: 'first', text: 'No reading yet. The first one takes two minutes and puts the first point on the line.', label: 'Take the first reading', route: '#/networth?first=1' };
    if (rematchDue(state, todayIso)) return { kind: 'rematch', text: 'Six months since your first reading. Time for the rematch.', label: 'See then vs now', route: '#/rematch' };
    if (paydayDue(state, todayIso)) {
      var amt = savingsTarget(state);
      return { kind: 'payday', text: amt ? 'Payday. Move ' + fmt(amt, sym) + ' to savings?' : 'Payday. Did money move to savings?', label: 'Answer', route: '#/payday' };
    }
    if (weeklyDue(state, todayIso)) return { kind: 'check', text: 'Your weekly check is due. Three numbers, one minute.', label: 'Do the check', route: '#/check' };
    if (nwDue(state, todayIso) && state.readings.length) return { kind: 'networth', text: 'A month since your last reading. Update the line?', label: 'Update net worth', route: '#/networth' };
    if (!p.transferAmount && state.method !== '503020') return { kind: 'transfer', text: 'Set up your first transfer — an amount and the day after payday.', label: 'Set it up', route: '#/plan' };
    var step = currentStep(state);
    if (step !== null && step <= 7) {
      var s = STEPS[step];
      return { kind: 'step', text: "You're on step " + s.n + ' — ' + s.short + '. ' + s.action, label: 'Open the plan', route: '#/plan' };
    }
    return { kind: 'none', text: 'Nothing to do right now.', label: null, route: null };
  }
  function currentStep(state) {
    if (state.plan.step !== null && state.plan.step !== undefined && state.plan.step !== '') return parseInt(state.plan.step, 10);
    if (state.focus && FOCUS_STEP[state.focus] !== undefined) return FOCUS_STEP[state.focus];
    return null;
  }

  /* ---------- method fit detection: observation, then an offer ---------- */
  function fitSignals(state, todayIso) {
    var out = [], sym = state.settings.currency, p = state.plan;
    var imp = impossibility(state);
    if (imp) out.push({ text: imp.text, action: imp.kind === 'split' ? { label: 'Switch method?', type: 'switch', to: imp.switchTo } : { label: 'Try ' + fmt(imp.lower, sym) + '?', type: 'lower', amount: imp.lower } });
    /* pay-yourself-first, skipped 2 months running */
    var recent = state.paydays.slice(-2);
    if (state.method === 'pyf' && recent.length === 2 && recent.every(function (x) { return x.status === 'skipped'; }) && p.transferAmount) {
      var lower = Math.max(10, Math.round(p.transferAmount / 2 / 5) * 5);
      out.push({ text: fmt(p.transferAmount, sym) + ' might be too much right now.', action: { label: 'Try ' + fmt(lower, sym) + '?', type: 'lower', amount: lower } });
    }
    /* zero-based, no update in 3 weeks */
    if (state.method === 'zero' && state.checks.length) {
      var last = state.checks[state.checks.length - 1].date;
      if (daysBetween(last, todayIso) >= 21) out.push({ text: "This one needs regular upkeep and it looks like that's not happening — which is normal. Something lighter?", action: { label: 'Try pay yourself first', type: 'switch', to: 'pyf' } });
    }
    /* 3+ consecutive missed weekly checks, any method */
    if (state.checks.length && missedWeeks(state, todayIso) >= 3) {
      out.push({ text: 'Three weeks without a check. The lightest version: one number — what\'s left — and nothing else.', action: { label: 'Do the light check', type: 'route', route: '#/check?light=1' } });
    }
    return out.slice(0, 1);   /* one observation per screen, at most */
  }
  function missedWeeks(state, todayIso) {
    var last = state.checks[state.checks.length - 1].date;
    return Math.floor(daysBetween(last, todayIso) / 7);
  }

  /* ---------- weekly observation: pattern, never instruction ---------- */
  function observation(checks, sym) {
    if (checks.length < 4) return null;
    var recent = checks.slice(-3), prior = checks.slice(0, -3).slice(-6);
    if (prior.length < 2) return null;
    var avgOut = prior.reduce(function (a, c) { return a + (c.out || 0); }, 0) / prior.length;
    if (recent.every(function (c) { return c.out > avgOut * 1.1; })) return 'Spending has been higher than usual for three weeks.';
    if (recent.every(function (c) { return c.out < avgOut * 0.9; })) return 'Spending has been lower than usual for three weeks.';
    return null;
  }

  /* ---------- net worth ---------- */
  function readingTotals(assets, liabilities) {
    var a = 0, l = 0;
    Object.keys(assets).forEach(function (k) { a += num(assets[k]) || 0; });
    Object.keys(liabilities).forEach(function (k) { l += num(liabilities[k]) || 0; });
    return { assetsTotal: round2(a), liabilitiesTotal: round2(l), total: round2(a - l) };
  }
  function change(readings) {
    if (readings.length < 2) return null;
    var a = readings[readings.length - 2], b = readings[readings.length - 1];
    return { amount: round2(b.total - a.total), from: a.date, to: b.date };
  }
  function changeText(readings, sym) {
    var c = change(readings); if (!c) return null;
    var word = c.amount > 0 ? 'Up ' : c.amount < 0 ? 'Down ' : 'Level, ';
    var span = daysBetween(c.from, c.to);
    var since = span <= 45 ? 'this month' : 'since ' + shortDate(c.from);
    return { text: c.amount === 0 ? 'Level ' + since + '.' : word + fmt(Math.abs(c.amount), sym) + ' ' + since + '.', dir: c.amount > 0 ? 'up' : c.amount < 0 ? 'down' : 'flat' };
  }
  /* the rationed handwritten line */
  function encouragement(state) {
    var r = state.readings; if (r.length < 2) return null;
    var first = r[0].total, last = r[r.length - 1].total, prev = r[r.length - 2].total;
    if (last < prev && last > first) return 'still ahead of where you started';
    if (last >= prev && last > first && r.length >= 3) return 'direction is the only score';
    if (last < 0 && last > first) return 'less below zero than before — that counts';
    return null;
  }

  /* ---------- emergency fund stages (buffer first) ---------- */
  function efStages(state) {
    var p = state.plan, sym = state.settings.currency, cur = p.efCurrent || 0;
    var ess = p.fixed || null;
    var stages = [{ label: 'buffer', target: 500 }];
    if (ess) { stages.push({ label: 'one month', target: round2(ess) }); stages.push({ label: 'three months', target: round2(ess * 3) }); }
    if (p.efTarget && !stages.some(function (s) { return Math.abs(s.target - p.efTarget) < 1; })) stages.push({ label: 'your target', target: p.efTarget });
    stages.sort(function (a, b) { return a.target - b.target; });
    var next = stages.filter(function (s) { return s.target > cur; })[0] || null;
    return { current: cur, stages: stages, next: next, monthsToNext: next && p.transferAmount ? Math.ceil((next.target - cur) / p.transferAmount) : null };
  }

  /* ---------- debt: speed is the discount ---------- */
  function payoff(balance, rate, payment) {
    var bal = balance, m = 0, interest = 0;
    if (!balance || balance <= 0) return { months: 0, interest: 0 };
    while (bal > 0.005 && m < 600) { m++; var i = bal * rate / 100 / 12; interest += i; bal = bal + i - Math.min(payment, bal + i); }
    return { months: m, interest: round2(interest), finished: bal <= 0.005 };
  }
  function debtSpeed(debt) {
    if (!debt || !debt.balance || debt.min === null || debt.rate === null) return null;
    var base = payoff(debt.balance, debt.rate, debt.min);
    var extra = debt.extra || 0;
    var faster = payoff(debt.balance, debt.rate, debt.min + extra);
    return { base: base, faster: faster, extra: extra, saved: round2(base.interest - faster.interest), monthsSaved: base.months - faster.months };
  }

  /* ---------- explanations: any number can say how it was calculated ---------- */
  function explain(state, key) {
    var p = state.plan, sym = state.settings.currency, f = function (n) { return fmt(n, sym); };
    switch (key) {
      case 'savingsTarget':
        if (state.method === '503020') return { title: 'Savings target', rows: [['method', '50 / 30 / 20'], ['net income', f(p.income)], ['× 20%', f(savingsTarget(state))]], note: 'Twenty percent of net income, computed. Change the income and this moves.' };
        return { title: 'Savings target', rows: [['method', METHODS[state.method]], ['the amount you picked', f(p.transferAmount)]], note: 'A fixed amount that leaves on payday, before anything else. You set it; nothing computes it.' };
      case 'left':
        return { title: 'Left for everything variable', rows: [['net income', f(p.income)], ['− fixed costs', f(p.fixed)], ['− savings target', f(savingsTarget(state))], ['= left', f(leftForVariable(state))]], note: 'Variable spend is observed weekly, not budgeted in advance.' };
      case 'change':
        var c = change(state.readings); return { title: 'Change since last reading', rows: c ? [['reading on ' + shortDate(c.to), f(state.readings[state.readings.length - 1].total)], ['− reading on ' + shortDate(c.from), f(state.readings[state.readings.length - 2].total)], ['= change', f(c.amount)]] : [['readings so far', String(state.readings.length)]], note: 'Direction, not position. Net worth is what you own minus what you owe.' };
      case 'ef':
        var e = efStages(state); return { title: 'Emergency fund stages', rows: e.stages.map(function (s) { return [s.label, f(s.target)]; }).concat([['saved so far', f(e.current)], ['months to the next stage', e.monthsToNext === null ? '—' : String(e.monthsToNext)]]), note: 'The buffer comes first. One month = your fixed costs. Three months = fixed costs × 3. Months = (target − saved) ÷ transfer, rounded up.' };
      case 'debt':
        var d = debtSpeed(p.debt); return d ? { title: 'Interest saved by paying faster', rows: [['balance', f(p.debt.balance)], ['rate', p.debt.rate + '% a year'], ['at the minimum ' + f(p.debt.min), d.base.months + ' months, ' + f(d.base.interest) + ' interest'], ['at ' + f(p.debt.min + d.extra), d.faster.months + ' months, ' + f(d.faster.interest) + ' interest'], ['saved', f(d.saved) + ' and ' + d.monthsSaved + ' months']], note: 'Each month: interest = balance × rate ÷ 12, then the payment comes off. Speed is the discount.' } : null;
      default: return null;
    }
  }

  NB.engine = { STEPS: STEPS, METHODS: METHODS, DAYS: DAYS, FOCUS_STEP: FOCUS_STEP, FOCUS: FOCUS, focusLabel: focusLabel, focusForStep: focusForStep, round2: round2, fmt: fmt, num: num, pct: pct, ordinal: ordinal, daysBetween: daysBetween, addMonths: addMonths, shortDate: shortDate, monthLabel: monthLabel,
    savingsTarget: savingsTarget, leftForVariable: leftForVariable, impossibility: impossibility, paydayDue: paydayDue, weeklyDue: weeklyDue, nwDue: nwDue, rematchDue: rematchDue, nextAction: nextAction, currentStep: currentStep, fitSignals: fitSignals, observation: observation, readingTotals: readingTotals, change: change, changeText: changeText, encouragement: encouragement, efStages: efStages, payoff: payoff, debtSpeed: debtSpeed, explain: explain };
})(window);
