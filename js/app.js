/* Verdrahtung der Oberfläche. */
(function () {
  'use strict';
  const { Cube, FACES, parseMove, invertMove, randomScramble, COLOR_NAMES } = CubeLib;
  const { solve, validate, PHASES, CHECKS } = Solver;
  const { LESSONS, MASKS, BASES, NOTATION, moveText } = Lessons;

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const SPEEDS = [650, 450, 300, 180, 90];
  const PHASE_BY_ID = Object.fromEntries(PHASES.map((p, i) => [p.id, Object.assign({ index: i }, p)]));

  const state = {
    mode: 'solver',
    view: '3d',
    sol: null, // { start, steps, flat, scramble }
    pos: 0,
    playing: false,
    busy: false,
    scramble: null,
    trainer: null,
    paint: 'W',
    inputFacelets: null,
  };

  const view = new CubeView($('#cube3d'), { size: 54 });

  /* ---------- Tabs ---------- */
  $$('.tab-btn').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
  function showTab(name) {
    $$('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    $$('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + name));
    if (name === 'guide') buildGuide();
    if (name === 'notation') buildNotation();
    window.scrollTo({ top: 0 });
  }

  /* ---------- Darstellung ---------- */
  function speed() { return SPEEDS[Number($('#speed').value)]; }

  function renderNet() {
    const net = $('#net');
    if (net.hidden) return;
    const fl = state.mode === 'input' ? state.inputFacelets : view.cube.facelets();
    const offs = { U: [0, 3], L: [3, 0], F: [3, 3], R: [3, 6], B: [3, 9], D: [6, 3] };
    const label = { U: 'oben', L: 'links', F: 'vorne', R: 'rechts', B: 'hinten', D: 'unten' };
    let html = '';
    for (const f of FACES) {
      const [r0, c0] = offs[f];
      for (let i = 0; i < 9; i++) {
        const r = r0 + Math.floor(i / 3) + 1;
        const c = c0 + (i % 3) + 1;
        const center = i === 4;
        html += `<div class="nst c-${fl[f][i]}${center ? ' center' : ''}" style="grid-row:${r};grid-column:${c}" data-f="${f}" data-i="${i}">${center ? `<span>${f}<small>${label[f]}</small></span>` : ''}</div>`;
      }
    }
    net.innerHTML = html;
    net.classList.toggle('paintable', state.mode === 'input');
  }

  function setView(v) {
    state.view = v;
    $$('#viewSwitch button').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
    $('#cube3d').hidden = v !== '3d';
    $('#net').hidden = v !== '2d';
    $('.drag-hint').hidden = v !== '3d';
    $('#resetView').hidden = v !== '3d';
    renderNet();
  }
  $$('#viewSwitch button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  $('#resetView').addEventListener('click', () => view.setView('front'));

  async function doMove(token, ms = speed()) {
    if (state.view === '3d') await view.animate(token, ms);
    else {
      view.cube.move(token);
      view.render();
      renderNet();
      await sleep(ms * 0.8);
    }
    renderNet();
  }

  function setCube(cube) {
    view.setCube(cube);
    renderNet();
  }

  /* ---------- Modus ---------- */
  $$('#modeSwitch button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  function setMode(mode) {
    stopPlay();
    if (state.mode === 'input' && mode !== 'input') setView(state.prevView || '3d');
    state.mode = mode;
    $$('#modeSwitch button').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
    $('#panel-solver').hidden = mode !== 'solver';
    $('#panel-trainer').hidden = mode !== 'trainer';
    $('#panel-input').hidden = mode !== 'input';
    $('#player').hidden = mode !== 'solver' || !state.sol;
    $('#pad').hidden = mode === 'input';
    view.setFocus(null);
    if (mode === 'input') {
      state.prevView = state.view;
      state.inputFacelets = view.cube.facelets();
      setView('2d');
      $('#viewSwitch').hidden = true;
    } else {
      $('#viewSwitch').hidden = false;
    }
    if (mode === 'trainer' && !state.trainer) newTrainerTask();
    if (mode === 'trainer') updateTrainer();
    if (mode === 'solver') updateSolverUI();
  }

  /* ---------- Dreh-Knöpfe ---------- */
  const PAD = ['U', 'D', 'R', 'L', 'F', 'B', 'y'];
  $('#padGrid').innerHTML = PAD.map((f) => [f, f + "'", f + '2'].map((t) => `<button class="mv" data-m="${t}" title="${moveText(t)}">${t}</button>`).join('')).join('');
  $('#padGrid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]');
    if (b) manualMove(b.dataset.m);
  });

  async function manualMove(token) {
    if (state.mode === 'input' || state.busy) return;
    stopPlay();
    if (state.mode === 'solver' && state.sol) {
      // Folgt der Zug genau der Lösung? Dann einfach mitgehen.
      const next = state.sol.flat[state.pos];
      if (next && next.token === token) return stepMove(1);
      state.sol = null;
      flash('Du hast selbst gedreht – die alte Lösung passt nicht mehr. Drücke „Lösung erklären“ für eine neue.');
    }
    state.busy = true;
    await doMove(token);
    state.busy = false;
    if (state.mode === 'trainer' && state.trainer) {
      state.trainer.moves.push(token);
      $('#hintBox').hidden = true;
      view.setFocus(null);
      updateTrainer();
    }
    if (state.mode === 'solver') updateSolverUI();
  }

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!$('#tab-workspace').classList.contains('active')) return;
    const k = e.key;
    if (state.mode === 'solver' && state.sol) {
      if (k === 'ArrowRight') { e.preventDefault(); return stepMove(1); }
      if (k === 'ArrowLeft') { e.preventDefault(); return stepMove(-1); }
      if (k === ' ') { e.preventDefault(); return togglePlay(); }
    }
    const f = k.toUpperCase();
    if ('UDRLFBY'.includes(f) && f.length === 1) {
      e.preventDefault();
      const face = f === 'Y' ? 'y' : f;
      manualMove(face + (e.shiftKey ? "'" : ''));
    }
  });

  let flashTimer = null;
  function flash(msg) {
    let el = $('#flash');
    if (!el) {
      el = document.createElement('div');
      el.id = 'flash';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => el.classList.remove('show'), 3800);
  }

  /* ---------- Löser ---------- */
  $('#btnScramble').addEventListener('click', async () => {
    if (state.busy) return;
    stopPlay();
    const scr = randomScramble(22);
    state.scramble = scr;
    state.sol = null;
    const c = new Cube().apply(scr);
    setCube(c);
    $('#scrambleText').innerHTML = `<b>Mischung:</b> <code>${scr.join(' ')}</code><br><span class="muted">Mische deinen echten Würfel genauso (Gelb oben, Grün vorne), dann kannst du mitdrehen.</span>`;
    updateSolverUI();
  });

  $('#btnReset').addEventListener('click', () => {
    if (state.busy) return;
    stopPlay();
    state.sol = null;
    state.scramble = null;
    setCube(new Cube());
    $('#scrambleText').textContent = 'Würfel ist gelöst. Mische ihn oder gib deinen eigenen ein.';
    updateSolverUI();
  });

  $('#btnSolve').addEventListener('click', () => {
    if (state.busy) return;
    if (view.cube.isSolved()) { flash('Der Würfel ist schon gelöst – erst mischen!'); return; }
    startSolution();
  });

  function startSolution() {
    stopPlay();
    let res;
    try { res = solve(view.cube); } catch (e) { flash(e.message); return; }
    if (!res.solved) { flash('Dieser Würfel lässt sich nicht lösen – ist die Eingabe korrekt?'); return; }
    const flat = [];
    res.steps.forEach((s, si) => s.moves.forEach((t, mi) => flat.push({ si, mi, token: t })));
    state.sol = { start: view.cube.clone(), steps: res.steps, flat };
    state.pos = 0;
    buildStepList();
    $('#stepListWrap').open = false;
    updateSolverUI();
  }

  function curStepIndex() {
    const s = state.sol;
    if (!s) return -1;
    if (state.pos >= s.flat.length) return s.steps.length;
    return s.flat[state.pos].si;
  }

  function stepBounds(si) {
    const f = state.sol.flat;
    const a = f.findIndex((m) => m.si === si);
    let b = a;
    while (b < f.length && f[b].si === si) b++;
    return [a, b];
  }

  async function stepMove(dir) {
    const s = state.sol;
    if (!s || state.busy) return;
    if (dir > 0 && state.pos >= s.flat.length) return;
    if (dir < 0 && state.pos <= 0) return;
    state.busy = true;
    if (dir > 0) {
      const t = s.flat[state.pos].token;
      state.pos++;
      updateSolverUI(true);
      await doMove(t);
    } else {
      state.pos--;
      updateSolverUI(true);
      await doMove(invertMove(s.flat[state.pos].token));
    }
    state.busy = false;
    updateSolverUI();
  }

  function jumpTo(p) {
    const s = state.sol;
    if (!s || state.busy) return;
    stopPlay();
    state.pos = Math.max(0, Math.min(s.flat.length, p));
    setCube(s.start.clone().apply(s.flat.slice(0, state.pos).map((m) => m.token)));
    updateSolverUI();
  }

  async function runStep() {
    const s = state.sol;
    if (!s || state.busy || state.pos >= s.flat.length) return;
    const si = s.flat[state.pos].si;
    state.playing = true;
    updatePlayBtn();
    while (state.playing && state.pos < s.flat.length && s.flat[state.pos].si === si) await stepMove(1);
    stopPlay();
  }

  async function togglePlay() {
    if (state.playing) return stopPlay();
    const s = state.sol;
    if (!s || state.pos >= s.flat.length) return;
    state.playing = true;
    updatePlayBtn();
    const pause = $('#pauseStep').checked;
    let si = s.flat[state.pos].si;
    while (state.playing && state.pos < s.flat.length) {
      if (pause && s.flat[state.pos].si !== si) break;
      si = s.flat[state.pos].si;
      await stepMove(1);
    }
    stopPlay();
  }

  function stopPlay() {
    state.playing = false;
    updatePlayBtn();
  }
  function updatePlayBtn() {
    $('#pPlay').textContent = state.playing ? '⏸' : '▶';
  }

  $('#pPlay').addEventListener('click', togglePlay);
  $('#pFwd').addEventListener('click', () => { stopPlay(); stepMove(1); });
  $('#pBack').addEventListener('click', () => { stopPlay(); stepMove(-1); });
  $('#pFirst').addEventListener('click', () => jumpTo(0));
  $('#pLast').addEventListener('click', () => jumpTo(Infinity));
  $('#pStepFwd').addEventListener('click', () => { if (!state.playing) runStep(); });
  $('#pStepBack').addEventListener('click', () => {
    const s = state.sol;
    if (!s) return;
    // erst zum Anfang des aktuellen Schritts, dann zum vorherigen
    const si = Math.min(curStepIndex(), s.steps.length - 1);
    const [a] = stepBounds(si);
    if (state.pos > a) jumpTo(a);
    else if (si > 0) jumpTo(stepBounds(si - 1)[0]);
  });

  function phaseList(activeId) {
    const s = state.sol;
    const used = s ? new Set(s.steps.map((x) => x.phase)) : null;
    const cube = view.cube;
    const curIdx = activeId ? PHASE_BY_ID[activeId].index : -1;
    return PHASES.filter((p) => p.id !== 'orient' && p.id !== 'auf').map((p) => {
      let cls = '';
      const idx = PHASE_BY_ID[p.id].index;
      if (s) {
        if (idx < curIdx || curIdx === -1 && state.pos >= s.flat.length) cls = 'done';
        else if (idx === curIdx) cls = 'current';
        if (!used.has(p.id) && idx < curIdx) cls = 'done';
      } else if (p.id !== 'daisy' && CHECKS[p.id](cube)) cls = 'done';
      return `<li class="${cls}" data-phase="${p.id}"><span class="dot"></span>${p.short}</li>`;
    }).join('');
  }

  function chips(moves, doneUpTo, extraClass = '') {
    return moves.map((t, i) => `<span class="chip ${extraClass}${i < doneUpTo ? ' done' : ''}${i === doneUpTo ? ' next' : ''}" title="${moveText(t)}">${t}</span>`).join('');
  }

  function updateSolverUI(soft) {
    const s = state.sol;
    $('#player').hidden = state.mode !== 'solver' || !s;
    const card = $('#stepCard');
    if (!s) {
      $('#phases').innerHTML = phaseList(null);
      view.setFocus(null);
      if (!card.querySelector('.empty')) {
        card.innerHTML = `<div class="empty"><h3>Bereit</h3><p>Drücke <b>„Lösung erklären“</b>, um Schritt für Schritt durch die Lösung geführt zu werden.</p></div>`;
      }
      return;
    }
    const si = curStepIndex();
    const total = s.flat.length;
    if (si >= s.steps.length) {
      $('#phases').innerHTML = phaseList(null);
      view.setFocus(null);
      card.innerHTML = `<div class="done-card"><div class="big">🎉</div><h3>Gelöst!</h3><p>${total} Züge (inklusive Würfeldrehungen). Profis brauchen mit anderen Methoden rund 50–60 – aber diese Methode ist die, die du dir am leichtesten merken kannst.</p><p><b>Tipp:</b> Mische neu und versuche, die Schritte zuerst selbst im <b>Trainer</b> zu machen.</p></div>`;
      highlightList(si);
      return;
    }
    const step = s.steps[si];
    const [a] = stepBounds(si);
    const done = state.pos - a;
    const ph = PHASE_BY_ID[step.phase];
    $('#phases').innerHTML = phaseList(step.phase);
    const nextTok = step.moves[done];
    const algInfo = step.repeat ? `<div class="alg-line">Algorithmus: <code>${step.alg}</code> × ${step.repeat}</div>` : step.alg ? `<div class="alg-line">Algorithmus: <code>${step.alg}</code></div>` : '';
    card.innerHTML = `
      <div class="step-head"><span class="phase-tag">${ph.title}</span><span class="muted">Schritt ${si + 1} / ${s.steps.length} · Zug ${state.pos} / ${total}</span></div>
      <h3>${step.title}</h3>
      <p class="step-text">${step.text}</p>
      ${algInfo}
      <div class="chips">${chips(step.moves, done)}</div>
      <div class="move-explain">${nextTok ? `<b>Nächster Zug: <span class="tok">${nextTok}</span></b> – ${moveText(nextTok)}` : ''}</div>
      ${step.note ? `<div class="note">${step.note}</div>` : ''}
      <div class="progress"><div style="width:${(100 * state.pos) / total}%"></div></div>`;
    view.setFocus(step.focus);
    if (!soft) highlightList(si);
  }

  function buildStepList() {
    const s = state.sol;
    let html = '';
    let last = null;
    s.steps.forEach((st, i) => {
      if (st.phase !== last) {
        html += `<div class="sl-phase">${PHASE_BY_ID[st.phase].title}</div>`;
        last = st.phase;
      }
      html += `<button class="sl-item" data-si="${i}"><span class="n">${i + 1}</span><span class="t">${st.title}</span><code>${st.moves.join(' ')}</code></button>`;
    });
    $('#stepList').innerHTML = html;
  }
  $('#stepList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-si]');
    if (b) jumpTo(stepBounds(Number(b.dataset.si))[0]);
  });
  function highlightList(si) {
    $$('#stepList .sl-item').forEach((b) => {
      const i = Number(b.dataset.si);
      b.classList.toggle('done', i < si);
      b.classList.toggle('cur', i === si);
    });
  }

  /* ---------- Trainer ---------- */
  const TRAIN_PHASES = ['daisy', 'cross', 'corners', 'middle', 'ycross', 'yedges', 'ycorners', 'yorient', 'full'];
  const TRAIN_GOALS = {
    daisy: 'Bringe alle vier <b>weißen Kanten</b> nach oben um die gelbe Mitte – Weiß zeigt nach oben.',
    cross: 'Klappe die Blütenblätter nach unten, sodass ein <b>weißes Kreuz</b> entsteht, bei dem die Seitenfarben zu den Mitten passen.',
    corners: 'Setze die vier <b>weißen Ecken</b> ein, sodass die ganze weiße Ebene fertig ist.',
    middle: 'Setze die vier Kanten der <b>mittleren Ebene</b> ein (die Kanten ohne Gelb).',
    ycross: 'Mache oben ein <b>gelbes Kreuz</b> (Ecken sind noch egal).',
    yedges: 'Richte die <b>gelben Kanten</b> so aus, dass ihre Seitenfarben zu den Mitten passen.',
    ycorners: 'Bringe alle <b>gelben Ecken an ihren Platz</b> (sie dürfen noch verdreht sein).',
    yorient: 'Drehe die <b>gelben Ecken</b>, bis der Würfel gelöst ist.',
    full: 'Löse den <b>ganzen Würfel</b> selbst. Hol dir Tipps, wenn du nicht weiterkommst.',
  };
  $('#trainerPhase').innerHTML = TRAIN_PHASES.map((p, i) => `<option value="${p}">${i + 1}. ${p === 'full' ? 'Ganzer Würfel' : PHASE_BY_ID[p].title}</option>`).join('');
  $('#btnTrainNew').addEventListener('click', () => newTrainerTask());
  $('#trainerPhase').addEventListener('change', () => newTrainerTask());
  $('#btnTrainRestart').addEventListener('click', () => {
    if (!state.trainer || state.busy) return;
    state.trainer.moves = [];
    setCube(state.trainer.start.clone());
    $('#hintBox').hidden = true;
    view.setFocus(null);
    updateTrainer();
  });
  $('#btnUndo').addEventListener('click', async () => {
    const t = state.trainer;
    if (!t || !t.moves.length || state.busy) return;
    state.busy = true;
    await doMove(invertMove(t.moves.pop()));
    state.busy = false;
    updateTrainer();
  });

  function trainerGoalReached(phase, cube) {
    if (phase === 'full') return cube.isSolved();
    const auf = ['yedges', 'ycorners', 'yorient'].includes(phase);
    if (!auf) return CHECKS[phase](cube);
    return ['', 'U', 'U2', "U'"].some((u) => CHECKS[phase](cube.clone().apply(u)));
  }

  function newTrainerTask(phase) {
    if (state.busy) return;
    phase = phase || $('#trainerPhase').value;
    $('#trainerPhase').value = phase;
    let start = null;
    for (let tries = 0; tries < 60 && !start; tries++) {
      const c = new Cube().apply(randomScramble(22));
      if (phase === 'full') { start = c; break; }
      const res = solve(c);
      const idx = res.steps.findIndex((s) => s.phase === phase);
      if (idx < 0) continue;
      const pre = res.steps.slice(0, idx).flatMap((s) => s.moves);
      const sc = c.clone().apply(pre);
      if (!trainerGoalReached(phase, sc)) start = sc;
    }
    state.trainer = { phase, start, moves: [], solvedAt: null };
    setCube(start.clone());
    $('#hintBox').hidden = true;
    view.setFocus(null);
    updateTrainer();
  }

  function updateTrainer() {
    const t = state.trainer;
    if (!t) return;
    const title = t.phase === 'full' ? 'Ganzer Würfel' : PHASE_BY_ID[t.phase].title;
    const lesson = LESSONS.find((l) => l.phase === t.phase);
    $('#trainerGoal').innerHTML = `<div class="phase-tag">${title}</div><p><b>Ziel:</b> ${TRAIN_GOALS[t.phase]}</p>${lesson ? `<button class="link" data-lesson="${lesson.id}">→ Erklärung zu diesem Schritt lesen</button>` : ''}`;
    const ok = trainerGoalReached(t.phase, view.cube);
    const st = $('#trainerStatus');
    if (ok && t.moves.length) {
      st.className = 'status ok';
      st.innerHTML = `✅ <b>Geschafft!</b> Du hast ${t.moves.length} Züge gebraucht. <button class="link" id="trainNext">Nächste Aufgabe →</button>`;
      $('#trainNext').onclick = () => newTrainerTask();
    } else if (ok) {
      st.className = 'status';
      st.textContent = 'Dieser Schritt ist schon fertig.';
    } else {
      st.className = 'status';
      st.innerHTML = `Dein Zug ist dran. Bisher <b>${t.moves.length}</b> Züge. ${t.moves.length ? `<span class="muted">Zuletzt: ${t.moves.slice(-6).join(' ')}</span>` : ''}`;
    }
  }
  $('#trainerGoal').addEventListener('click', (e) => {
    const b = e.target.closest('[data-lesson]');
    if (b) { showTab('guide'); setTimeout(() => document.getElementById('lesson-' + b.dataset.lesson).scrollIntoView({ behavior: 'smooth' }), 50); }
  });

  function currentHint() {
    const t = state.trainer;
    if (!t || trainerGoalReached(t.phase, view.cube)) return null;
    const res = solve(view.cube);
    const step = res.steps[0];
    if (!step) return null;
    const target = t.phase === 'full' ? -1 : PHASE_BY_ID[t.phase].index;
    const warn = target >= 0 && PHASE_BY_ID[step.phase].index < target
      ? `<div class="warn">⚠️ Ein früherer Schritt (<b>${PHASE_BY_ID[step.phase].title}</b>) ist nicht mehr fertig – vermutlich hat ein Zug ihn kaputt gemacht. Du kannst „Zug zurück“ drücken oder ihn reparieren:</div>` : '';
    return { step, warn };
  }

  $('#btnHint').addEventListener('click', () => {
    const h = currentHint();
    const box = $('#hintBox');
    box.hidden = false;
    if (!h) { box.innerHTML = 'Hier gibt es nichts mehr zu tun – Ziel erreicht!'; return; }
    const { step, warn } = h;
    box.innerHTML = `${warn}<h4>${step.title}</h4><p>${step.text}</p><div class="chips">${chips(step.moves, -1)}</div>`;
    view.setFocus(step.focus);
  });

  $('#btnHintDo').addEventListener('click', async () => {
    if (state.busy) return;
    const h = currentHint();
    if (!h) return;
    $('#btnHint').click();
    state.busy = true;
    const chipsEl = $$('#hintBox .chip');
    for (let i = 0; i < h.step.moves.length; i++) {
      chipsEl.forEach((c, j) => { c.classList.toggle('done', j < i); c.classList.toggle('next', j === i); });
      await doMove(h.step.moves[i]);
      state.trainer.moves.push(h.step.moves[i]);
    }
    chipsEl.forEach((c) => { c.classList.add('done'); c.classList.remove('next'); });
    state.busy = false;
    updateTrainer();
  });

  /* ---------- Eingabe ---------- */
  const PAL = ['W', 'Y', 'G', 'B', 'O', 'R'];
  $('#palette').innerHTML = PAL.map((c) => `<button class="sw c-${c}${c === state.paint ? ' active' : ''}" data-c="${c}" title="${COLOR_NAMES[c]}"></button>`).join('');
  $('#palette').addEventListener('click', (e) => {
    const b = e.target.closest('[data-c]');
    if (!b) return;
    state.paint = b.dataset.c;
    $$('#palette .sw').forEach((x) => x.classList.toggle('active', x === b));
  });
  $('#net').addEventListener('click', (e) => {
    if (state.mode !== 'input') return;
    const cell = e.target.closest('.nst');
    if (!cell) return;
    if (cell.classList.contains('center')) { flash('Die Mitten sind fest – halte den Würfel mit Gelb oben und Grün vorne.'); return; }
    const f = cell.dataset.f;
    const i = Number(cell.dataset.i);
    state.inputFacelets[f][i] = state.paint;
    renderNet();
  });
  $('#btnClear').addEventListener('click', () => {
    const fl = new Cube().facelets();
    for (const f of FACES) for (let i = 0; i < 9; i++) if (i !== 4) fl[f][i] = 'X';
    state.inputFacelets = fl;
    renderNet();
  });
  $('#btnTakeCurrent').addEventListener('click', () => {
    state.inputFacelets = view.cube.facelets();
    renderNet();
  });
  $('#btnInputSolve').addEventListener('click', () => {
    const msg = $('#inputMsg');
    const fl = state.inputFacelets;
    const missing = FACES.reduce((n, f) => n + fl[f].filter((c) => c === 'X').length, 0);
    msg.hidden = false;
    msg.className = 'msg err';
    if (missing) { msg.textContent = `Es fehlen noch ${missing} Felder.`; return; }
    const cube = Cube.fromFacelets(fl);
    let err;
    try { err = validate(cube); } catch (e) { err = e.message; }
    if (err) { msg.textContent = err; return; }
    msg.hidden = true;
    state.scramble = null;
    setMode('solver');
    setCube(cube);
    $('#scrambleText').innerHTML = 'Dein eingegebener Würfel. Halte ihn mit <b>Gelb oben</b> und <b>Grün vorne</b> und dreh mit!';
    startSolution();
  });

  /* ---------- Anleitung ---------- */
  let guideBuilt = false;
  function buildGuide() {
    if (guideBuilt) return;
    guideBuilt = true;
    const toc = $('#toc');
    toc.innerHTML = '<h4>Inhalt</h4>' + LESSONS.map((l) => `<a href="#lesson-${l.id}">${l.title}</a>`).join('');
    const wrap = $('#lessons');
    wrap.innerHTML = LESSONS.map((l) => `
      <article class="lesson card" id="lesson-${l.id}">
        <h2>${l.title}</h2>
        <div class="lesson-body">${l.html}</div>
        ${l.cases && l.cases.length ? `<div class="cases">${l.cases.map((c, i) => `
          <div class="case" data-l="${l.id}" data-c="${i}">
            <div class="mini"></div>
            <h4>${c.title}</h4>
            <p>${c.text}</p>
            <div class="chips mini-chips"></div>
            <div class="btn-row"><button class="small accent play">▶ Vorführen</button><button class="small reset">↺</button></div>
          </div>`).join('')}</div>` : ''}
        ${l.phase ? `<div class="btn-row"><button class="primary" data-train="${l.phase}">Diesen Schritt im Trainer üben</button></div>` : ''}
      </article>`).join('');
    $$('.case', wrap).forEach(initCase);
    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-train]');
      if (!b) return;
      showTab('workspace');
      $('#trainerPhase').value = b.dataset.train;
      state.trainer = null;
      setMode('trainer');
    });
    toc.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      e.preventDefault();
      document.querySelector(a.getAttribute('href')).scrollIntoView({ behavior: 'smooth' });
    });
  }

  function initCase(el) {
    const lesson = LESSONS.find((l) => l.id === el.dataset.l);
    const c = lesson.cases[Number(el.dataset.c)];
    const startCube = () => new Cube().apply(BASES[c.base]).apply(c.setup);
    const v = new CubeView($('.mini', el), { size: 28, mask: MASKS[c.mask], view: c.view || 'front', cube: startCube() });
    let demo = c.demo;
    if (demo === 'auto') {
      demo = solve(startCube()).steps.filter((s) => s.phase === lesson.phase).flatMap((s) => s.moves);
    }
    const moves = CubeLib.parseSeq(demo);
    const chipBox = $('.mini-chips', el);
    chipBox.innerHTML = chips(moves, -1, 'sm');
    let running = false;
    let token = 0;
    $('.play', el).addEventListener('click', async () => {
      if (running) return;
      running = true;
      const my = ++token;
      v.setCube(startCube());
      const cs = $$('.chip', chipBox);
      for (let i = 0; i < moves.length && my === token; i++) {
        cs.forEach((ch, j) => { ch.classList.toggle('done', j < i); ch.classList.toggle('next', j === i); });
        await v.animate(moves[i], moves.length > 12 ? 220 : 380);
      }
      cs.forEach((ch) => { ch.classList.toggle('done', my === token); ch.classList.remove('next'); });
      running = false;
    });
    $('.reset', el).addEventListener('click', () => {
      token++;
      v.queue.then(() => {
        v.setCube(startCube());
        $$('.chip', chipBox).forEach((ch) => ch.classList.remove('done', 'next'));
        running = false;
      });
    });
  }

  /* ---------- Notation ---------- */
  let notationBuilt = false;
  function buildNotation() {
    if (notationBuilt) return;
    notationBuilt = true;
    const grid = $('#notationGrid');
    grid.innerHTML = NOTATION.map(([t, d]) => `<div class="card nota" data-m="${t}"><div class="mini"></div><div><div class="tok big-tok">${t}</div><p>${d}</p></div></div>`).join('');
    $$('.nota', grid).forEach((el) => {
      const t = el.dataset.m;
      const v = new CubeView($('.mini', el), { size: 24, drag: false, view: t[0] === 'B' ? 'back' : t[0] === 'D' ? 'low' : 'front' });
      let busy = false;
      el.addEventListener('click', async () => {
        if (busy) return;
        busy = true;
        v.setCube(new Cube());
        await v.animate(t, 550);
        await sleep(700);
        v.setCube(new Cube());
        busy = false;
      });
    });
  }

  /* ---------- Start ---------- */
  setView('3d');
  updateSolverUI();
})();
