/* Verdrahtung der Oberfläche. */
(function () {
  'use strict';
  const { Cube, FACES, invertMove, randomScramble, COLOR_NAMES } = CubeLib;
  const { solve, validate, PHASES, CHECKS } = Solver;
  const { LESSONS, MASKS, BASES, NOTATION, moveText } = Lessons;

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const SPEEDS = [650, 450, 300, 180, 90];
  const PHASE_BY_ID = Object.fromEntries(PHASES.map((p, i) => [p.id, Object.assign({ index: i }, p)]));
  const STRIP_PHASES = PHASES.filter((p) => p.id !== 'orient' && p.id !== 'auf');

  const state = {
    screen: 'solve',
    view: '3d',
    sol: null, // { start, steps, flat }
    pos: 0,
    playing: false,
    busy: false,
    trainer: null,
    hint: null,
    paint: 'W',
    inputFacelets: null,
    scrambled: false,
  };

  const view = new CubeView($('#cube3d'), { size: 54 });

  /* ---------- Größe an den Platz anpassen ---------- */
  function fit() {
    const st = $('#stage');
    const w = st.clientWidth;
    const h = st.clientHeight;
    if (!w || !h) return;
    view.setSize(Math.max(20, Math.min(96, Math.floor(Math.min(w, h) / 5.3))));
    $('#net').style.setProperty('--n', Math.max(14, Math.min(40, Math.floor(Math.min((w - 8) / 12.4, (h - 8) / 9.4)))) + 'px');
  }
  new ResizeObserver(fit).observe($('#stage'));

  /* ---------- Bildschirme ---------- */
  $$('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));

  function go(screen) {
    stopPlay();
    closeSheets();
    const wasInput = state.screen === 'input';
    state.screen = screen;
    $$('[data-go]').forEach((b) => b.classList.toggle('active', b.dataset.go === screen));
    $('#ws').hidden = screen === 'learn' || screen === 'help';
    $('#learn').hidden = screen !== 'learn';
    $('#help').hidden = screen !== 'help';
    $('#dock-solve').hidden = screen !== 'solve';
    $('#dock-train').hidden = screen !== 'train';
    $('#dock-input').hidden = screen !== 'input';
    view.setFocus(null);
    if (screen === 'learn') { buildGuide(); return; }
    if (screen === 'help') { renderHelp(); return; }
    if (screen === 'input') {
      if (!wasInput) state.inputFacelets = view.cube.facelets();
      showNet(true);
    } else {
      showNet(state.view === '2d');
    }
    if (screen === 'train') {
      if (!state.trainer) newTrainerTask();
      else updateTrainer();
    }
    if (screen === 'solve') updateSolveUI();
    renderStrip();
    requestAnimationFrame(fit);
  }

  /* ---------- Darstellung ---------- */
  function speed() { return SPEEDS[Number($('#speed').value)]; }

  function showNet(on) {
    $('#cube3d').hidden = on;
    $('#net').hidden = !on;
    renderNet();
  }

  function renderNet() {
    const net = $('#net');
    if (net.hidden) return;
    const fl = state.screen === 'input' ? state.inputFacelets : view.cube.facelets();
    const offs = { U: [0, 3], L: [3, 0], F: [3, 3], R: [3, 6], B: [3, 9], D: [6, 3] };
    const label = { U: 'oben', L: 'links', F: 'vorne', R: 'rechts', B: 'hinten', D: 'unten' };
    let html = '';
    for (const f of FACES) {
      const [r0, c0] = offs[f];
      for (let i = 0; i < 9; i++) {
        const r = r0 + Math.floor(i / 3) + 1;
        const c = c0 + (i % 3) + 1;
        const center = i === 4;
        html += `<div class="nst c-${fl[f][i]}${center ? ' center' : ''}" style="grid-row:${r};grid-column:${c}" data-f="${f}" data-i="${i}">${center ? `<span>${label[f]}</span>` : ''}</div>`;
      }
    }
    net.innerHTML = html;
    net.classList.toggle('paintable', state.screen === 'input');
  }

  function setView(v) {
    state.view = v;
    $$('#viewSwitch button').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
    if (state.screen !== 'input') showNet(v === '2d');
  }
  $$('#viewSwitch button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  $('#resetView').addEventListener('click', () => view.setView('front'));

  async function doMove(token, ms = speed()) {
    if ($('#net').hidden) await view.animate(token, ms);
    else {
      view.cube.move(token);
      view.render();
      await sleep(ms * 0.8);
    }
    renderNet();
  }

  function setCube(cube) {
    view.setCube(cube);
    renderNet();
  }

  /* Fortschrittsleiste oben */
  function renderStrip() {
    const strip = $('#strip');
    if (state.screen === 'input') {
      strip.innerHTML = '<span class="strip-label">Male die Felder deines Würfels an</span>';
      return;
    }
    if (state.screen === 'train') {
      const t = state.trainer;
      strip.innerHTML = t ? `<span class="strip-label">Übung: <b>${t.phase === 'full' ? 'Ganzer Würfel' : PHASE_BY_ID[t.phase].title}</b></span>` : '';
      return;
    }
    let cur = -1;
    const s = state.sol;
    if (s) {
      const si = curStepIndex();
      cur = si >= s.steps.length ? 99 : PHASE_BY_ID[s.steps[si].phase].index;
    }
    const cube = view.cube;
    strip.innerHTML = '<ol class="segs">' + STRIP_PHASES.map((p) => {
      const idx = PHASE_BY_ID[p.id].index;
      let cls = '';
      if (s) cls = idx < cur ? 'done' : idx === cur ? 'current' : '';
      else if (p.id !== 'daisy' && CHECKS[p.id](cube)) cls = 'done';
      return `<li class="${cls}" title="${p.title}"><span></span></li>`;
    }).join('') + '</ol>' + `<span class="strip-label">${stripLabel(cur)}</span>`;
  }
  function stripLabel(cur) {
    if (!state.sol) return state.scrambled ? 'Gemischt – bereit zum Lösen' : '8 Schritte bis zum gelösten Würfel';
    if (cur === 99) return 'Gelöst!';
    const p = PHASES[cur];
    const n = STRIP_PHASES.findIndex((x) => x.id === p.id);
    return n >= 0 ? `Schritt ${n + 1} von 8: <b>${p.short}</b>` : `<b>${p.title}</b>`;
  }

  /* ---------- Dreh-Knöpfe ---------- */
  const PAD = ['U', 'D', 'R', 'L', 'F', 'B', 'y'];
  const padHtml = PAD.map((f) => [f, f + "'", f + '2'].map((t) => `<button class="mv" data-m="${t}" title="${moveText(t)}">${t}</button>`).join('')).join('');
  $('#padTrain').innerHTML = padHtml;
  $('#padOpt').innerHTML = padHtml;
  [$('#padTrain'), $('#padOpt')].forEach((pad) => pad.addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]');
    if (b) manualMove(b.dataset.m);
  }));

  async function manualMove(token) {
    if (state.screen === 'input' || state.screen === 'learn' || state.busy) return;
    stopPlay();
    if (state.screen === 'solve' && state.sol) {
      const next = state.sol.flat[state.pos];
      if (next && next.token === token) return stepMove(1);
      state.sol = null;
      flash('Du hast selbst gedreht – die Lösung wird neu berechnet, wenn du „Lösung starten“ drückst.');
    }
    flash(`${token}: ${moveText(token)}`);
    state.busy = true;
    await doMove(token);
    state.busy = false;
    if (state.screen === 'train' && state.trainer) {
      state.trainer.moves.push(token);
      hideHint();
      updateTrainer();
    }
    if (state.screen === 'solve') {
      state.scrambled = !view.cube.isSolved();
      updateSolveUI();
    }
  }

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape') { closeSheets(); return; }
    if (state.screen === 'learn' || openSheet()) return;
    const k = e.key;
    if (state.screen === 'solve' && state.sol) {
      if (k === 'ArrowRight') { e.preventDefault(); return stepMove(1); }
      if (k === 'ArrowLeft') { e.preventDefault(); return stepMove(-1); }
      if (k === ' ') { e.preventDefault(); return runStep(); }
    }
    const f = k.toUpperCase();
    if (f.length === 1 && 'UDRLFBY'.includes(f)) {
      e.preventDefault();
      manualMove((f === 'Y' ? 'y' : f) + (e.shiftKey ? "'" : ''));
    }
  });

  let flashTimer = null;
  function flash(msg) {
    let el = $('#flash');
    if (!el) {
      el = document.createElement('div');
      el.id = 'flash';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  /* ---------- Sheets ---------- */
  function openSheet() { return $$('.sheet').find((s) => !s.hidden); }
  function showSheet(id) {
    closeSheets();
    $(id).hidden = false;
    const c = $('[data-close]', $(id));
    if (c) c.focus();
  }
  function closeSheets() {
    $$('.sheet').forEach((s) => { s.hidden = true; });
    sheetLoop++;
  }
  document.addEventListener('click', (e) => {
    if (e.target.matches('.sheet') || e.target.closest('[data-close]')) closeSheets();
  });
  $('#btnMenu').addEventListener('click', () => showSheet('#optSheet'));
  $('#btnSteps').addEventListener('click', () => {
    showSheet('#stepsSheet');
    const cur = $('#stepList .cur');
    if (cur) cur.scrollIntoView({ block: 'center' });
  });
  $('#btnInputHelp').addEventListener('click', () => showSheet('#inputHelp'));

  /* ---------- Lösen ---------- */
  function scramble() {
    if (state.busy) return;
    stopPlay();
    const scr = randomScramble(22);
    state.sol = null;
    state.scrambled = true;
    setCube(new Cube().apply(scr));
    $('#scrambleText').innerHTML = `Mische deinen echten Würfel genauso (Gelb oben, Grün vorne):<br><code>${scr.join(' ')}</code>`;
    $('#scrambleText').hidden = false;
    updateSolveUI();
  }
  $('#btnScramble').addEventListener('click', scramble);
  $('#btnAgain').addEventListener('click', scramble);
  $('#btnInputGo').addEventListener('click', () => go('input'));
  $('#btnTrainGo').addEventListener('click', () => go('train'));

  $('#btnReset').addEventListener('click', () => {
    if (state.busy) return;
    stopPlay();
    state.sol = null;
    state.scrambled = false;
    $('#scrambleText').hidden = true;
    setCube(new Cube());
    closeSheets();
    if (state.screen === 'solve') updateSolveUI();
    if (state.screen === 'train') updateTrainer();
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
    updateSolveUI();
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
      updateSolveUI();
      await doMove(t);
    } else {
      state.pos--;
      updateSolveUI();
      await doMove(invertMove(s.flat[state.pos].token));
    }
    state.busy = false;
    updateSolveUI();
  }

  function jumpTo(p) {
    const s = state.sol;
    if (!s || state.busy) return;
    stopPlay();
    state.pos = Math.max(0, Math.min(s.flat.length, p));
    setCube(s.start.clone().apply(s.flat.slice(0, state.pos).map((m) => m.token)));
    updateSolveUI();
  }

  /** Zeigt den aktuellen Schritt ganz (oder alles bis zum Ende, wenn nicht angehalten wird). */
  async function runStep() {
    const s = state.sol;
    if (!s) return;
    if (state.playing) return stopPlay();
    if (state.busy || state.pos >= s.flat.length) return;
    const pause = $('#pauseStep').checked;
    const si = s.flat[state.pos].si;
    state.playing = true;
    updatePlayBtn();
    while (state.playing && state.pos < s.flat.length && (!pause || s.flat[state.pos].si === si)) await stepMove(1);
    stopPlay();
  }

  function stopPlay() {
    state.playing = false;
    updatePlayBtn();
  }
  function updatePlayBtn() {
    const b = $('#pStepFwd');
    b.textContent = state.playing ? '⏸' : '⏩';
    b.setAttribute('aria-label', state.playing ? 'Anhalten' : 'Ganzen Schritt zeigen');
  }

  $('#pFwd').addEventListener('click', () => { stopPlay(); stepMove(1); });
  $('#pBack').addEventListener('click', () => { stopPlay(); stepMove(-1); });
  $('#pStepFwd').addEventListener('click', runStep);

  function chips(moves, doneUpTo, extraClass = '') {
    return moves.map((t, i) => `<button type="button" class="chip ${extraClass}${i < doneUpTo ? ' done' : ''}${i === doneUpTo ? ' next' : ''}" data-m="${t}" data-i="${i}" title="${moveText(t)} – antippen für Erklärung">${t}</button>`).join('');
  }

  function updateSolveUI() {
    const s = state.sol;
    renderStrip();
    const start = $('#solveStart');
    const coach = $('#coach');
    const solved = $('#solved');
    if (!s) {
      start.hidden = false;
      coach.hidden = true;
      solved.hidden = true;
      view.setFocus(null);
      const canSolve = !view.cube.isSolved();
      $('#btnSolve').hidden = !canSolve;
      $('#btnScramble').textContent = canSolve ? '🔀 Neu mischen' : '🔀 Mischen';
      if (!canSolve) $('#scrambleText').hidden = true;
      return;
    }
    const si = curStepIndex();
    const total = s.flat.length;
    if (si >= s.steps.length) {
      start.hidden = true;
      coach.hidden = true;
      solved.hidden = false;
      view.setFocus(null);
      $('#solvedText').innerHTML = `${total} Züge. Mische neu oder übe die Schritte im Trainer selbst. <button class="link" id="btnBackLast">Letzten Zug zurück</button>`;
      $('#btnBackLast').onclick = () => stepMove(-1);
      highlightList(si);
      return;
    }
    start.hidden = true;
    solved.hidden = true;
    coach.hidden = false;
    const step = s.steps[si];
    const [a] = stepBounds(si);
    const done = state.pos - a;
    coach.dataset.si = si;
    $('#cPhase').textContent = PHASE_BY_ID[step.phase].title;
    $('#cCount').textContent = `${si + 1}/${s.steps.length}`;
    $('#cTitle').textContent = step.title;
    $('#cText').innerHTML = step.text + (step.note ? ` <span class="note">${step.note}</span>` : '');
    $('#cChips').innerHTML = chips(step.moves, done);
    const nextChip = $('#cChips .chip.next');
    if (nextChip) nextChip.scrollIntoView({ block: 'nearest', inline: 'center' });
    const tok = step.moves[done];
    $('#cNextTok').textContent = tok || '';
    $('#cNextDesc').textContent = tok ? moveText(tok) : '';
    $('#pBack').disabled = state.pos === 0;
    $('#cProgress').style.width = `${(100 * state.pos) / total}%`;
    view.setFocus(step.focus);
    highlightList(si);
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
    if (!b) return;
    closeSheets();
    jumpTo(stepBounds(Number(b.dataset.si))[0]);
  });
  function highlightList(si) {
    $$('#stepList .sl-item').forEach((b) => {
      const i = Number(b.dataset.si);
      b.classList.toggle('done', i < si);
      b.classList.toggle('cur', i === si);
    });
  }

  /* ---------- Üben ---------- */
  const TRAIN_PHASES = ['daisy', 'cross', 'corners', 'middle', 'ycross', 'yedges', 'ycorners', 'yorient', 'full'];
  const TRAIN_GOALS = {
    daisy: 'Alle vier <b>weißen Kanten</b> nach oben um die gelbe Mitte – Weiß zeigt nach oben.',
    cross: 'Blütenblätter nach unten klappen: <b>weißes Kreuz</b>, Seitenfarben passen zu den Mitten.',
    corners: 'Die vier <b>weißen Ecken</b> einsetzen – die weiße Ebene ist dann fertig.',
    middle: 'Die vier Kanten der <b>mittleren Ebene</b> einsetzen (Kanten ohne Gelb).',
    ycross: 'Oben ein <b>gelbes Kreuz</b> machen (Ecken sind noch egal).',
    yedges: '<b>Gelbe Kanten</b> so drehen, dass ihre Seitenfarben zu den Mitten passen.',
    ycorners: 'Alle <b>gelben Ecken an ihren Platz</b> bringen (verdreht ist noch okay).',
    yorient: 'Die <b>gelben Ecken drehen</b>, bis der Würfel gelöst ist.',
    full: 'Den <b>ganzen Würfel</b> selbst lösen. Hol dir Tipps, wenn du hängst.',
  };
  $('#trainerPhase').innerHTML = TRAIN_PHASES.map((p, i) => `<option value="${p}">${p === 'full' ? 'Ganzer Würfel' : `${i + 1}. ${PHASE_BY_ID[p].title}`}</option>`).join('');
  $('#btnTrainNew').addEventListener('click', () => newTrainerTask());
  $('#trainerPhase').addEventListener('change', () => newTrainerTask());
  $('#btnTrainRestart').addEventListener('click', () => {
    if (!state.trainer || state.busy) return;
    state.trainer.moves = [];
    setCube(state.trainer.start.clone());
    hideHint();
    updateTrainer();
  });
  $('#btnUndo').addEventListener('click', async () => {
    const t = state.trainer;
    if (!t || !t.moves.length || state.busy) return;
    state.busy = true;
    await doMove(invertMove(t.moves.pop()));
    state.busy = false;
    hideHint();
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
      const sc = c.clone().apply(res.steps.slice(0, idx).flatMap((s) => s.moves));
      if (!trainerGoalReached(phase, sc)) start = sc;
    }
    state.trainer = { phase, start, moves: [] };
    state.sol = null;
    setCube(start.clone());
    hideHint();
    updateTrainer();
  }

  function updateTrainer() {
    const t = state.trainer;
    if (!t) return;
    renderStrip();
    const lesson = LESSONS.find((l) => l.phase === t.phase);
    const ok = trainerGoalReached(t.phase, view.cube);
    const st = $('#trainerStatus');
    if (ok && t.moves.length) {
      st.className = 'status ok';
      st.innerHTML = `✅ <b>Geschafft</b> in ${t.moves.length} Zügen! <button class="link" id="trainNext">Nächste Aufgabe →</button>`;
      $('#trainNext').onclick = () => newTrainerTask();
    } else if (ok) {
      st.className = 'status';
      st.textContent = 'Dieser Schritt ist schon fertig.';
    } else {
      st.className = 'status';
      const more = lesson ? ` <button class="link" data-lesson="${lesson.id}">Wie geht das?</button>` : '';
      const count = t.moves.length ? `<span class="status-sub">${t.moves.length} Züge · zuletzt <code>${t.moves.slice(-5).join(' ')}</code></span>` : '';
      st.innerHTML = `<b>Ziel:</b> ${TRAIN_GOALS[t.phase]}${more}${count}`;
    }
  }
  $('#trainerStatus').addEventListener('click', (e) => {
    const b = e.target.closest('[data-lesson]');
    if (b) openLesson(b.dataset.lesson);
  });

  function currentHint() {
    const t = state.trainer;
    if (!t || trainerGoalReached(t.phase, view.cube)) return null;
    const step = solve(view.cube).steps[0];
    if (!step) return null;
    const target = t.phase === 'full' ? -1 : PHASE_BY_ID[t.phase].index;
    const warn = target >= 0 && PHASE_BY_ID[step.phase].index < target
      ? `<div class="warn">⚠️ <b>${PHASE_BY_ID[step.phase].title}</b> ist nicht mehr fertig. Drücke ↶ oder repariere es so:</div>` : '';
    return { step, warn };
  }

  function showHint() {
    const h = currentHint();
    const box = $('#hintBox');
    box.hidden = false;
    $('#trainerStatus').hidden = true;
    if (!h) { box.textContent = 'Ziel erreicht – hier gibt es nichts mehr zu tun.'; return null; }
    const { step, warn } = h;
    state.hint = { cube: view.cube.clone(), moves: step.moves };
    box.innerHTML = `${warn}<p><b>${step.title}:</b> ${step.text}</p><div class="chips nowrap">${chips(step.moves, -1)}</div>`;
    view.setFocus(step.focus);
    return h;
  }
  function hideHint() {
    $('#hintBox').hidden = true;
    $('#trainerStatus').hidden = false;
    view.setFocus(null);
  }
  $('#btnHint').addEventListener('click', () => ($('#hintBox').hidden ? showHint() : hideHint()));

  $('#btnHintDo').addEventListener('click', async () => {
    if (state.busy) return;
    const h = showHint();
    if (!h) return;
    state.busy = true;
    const cs = $$('#hintBox .chip');
    for (let i = 0; i < h.step.moves.length; i++) {
      cs.forEach((c, j) => { c.classList.toggle('done', j < i); c.classList.toggle('next', j === i); });
      await doMove(h.step.moves[i]);
      state.trainer.moves.push(h.step.moves[i]);
    }
    cs.forEach((c) => { c.classList.add('done'); c.classList.remove('next'); });
    state.busy = false;
    hideHint();
    updateTrainer();
  });

  /* ---------- Eingeben ---------- */
  const PAL = ['W', 'Y', 'G', 'B', 'O', 'R'];
  $('#palette').innerHTML = PAL.map((c) => `<button class="sw c-${c}${c === state.paint ? ' active' : ''}" data-c="${c}" aria-label="${COLOR_NAMES[c]}"></button>`).join('');
  $('#palette').addEventListener('click', (e) => {
    const b = e.target.closest('[data-c]');
    if (!b) return;
    state.paint = b.dataset.c;
    $$('#palette .sw').forEach((x) => x.classList.toggle('active', x === b));
  });
  $('#net').addEventListener('click', (e) => {
    if (state.screen !== 'input') return;
    const cell = e.target.closest('.nst');
    if (!cell) return;
    if (cell.classList.contains('center')) { flash('Die Mitten sind fest – halte den Würfel mit Gelb oben und Grün vorne.'); return; }
    state.inputFacelets[cell.dataset.f][Number(cell.dataset.i)] = state.paint;
    $('#inputMsg').hidden = true;
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
    if (missing) { msg.textContent = `Es fehlen noch ${missing} Felder (grau).`; return; }
    const cube = Cube.fromFacelets(fl);
    let err;
    try { err = validate(cube); } catch (e) { err = e.message; }
    if (err) { msg.textContent = err; return; }
    msg.hidden = true;
    setCube(cube);
    state.scrambled = true;
    $('#scrambleText').innerHTML = 'Dein eingegebener Würfel. Halte ihn mit <b>Gelb oben</b> und <b>Grün vorne</b> und dreh mit!';
    $('#scrambleText').hidden = false;
    go('solve');
    startSolution();
  });

  /* ---------- Lernen ---------- */
  let guideBuilt = false;
  function buildGuide() {
    if (guideBuilt) return;
    guideBuilt = true;
    const items = LESSONS.map((l) => `
      <details class="lesson" id="lesson-${l.id}" data-l="${l.id}">
        <summary><span class="ls-title">${l.title}</span></summary>
        <div class="lesson-body">${l.html}</div>
        ${l.cases && l.cases.length ? `<div class="cases">${l.cases.map((c, i) => `
          <div class="case" data-l="${l.id}" data-c="${i}">
            <div class="mini"></div>
            <h4>${c.title}</h4>
            <p>${c.text}</p>
            <div class="chips mini-chips"></div>
            <div class="case-actions"><button class="btn small accent play">▶ Vorführen</button><button class="btn small icon reset" aria-label="Zurücksetzen">⟲</button></div>
          </div>`).join('')}</div>` : ''}
        ${l.phase ? `<button class="btn primary" data-train="${l.phase}">Diesen Schritt üben</button>` : ''}
      </details>`).join('');
    const nota = `
      <details class="lesson" id="lesson-notation">
        <summary><span class="ls-title">Zug-Sprache: Was bedeuten R, U, F …?</span></summary>
        <div class="lesson-body">
          <p>Jeder Buchstabe ist eine Seite: <b>R</b>echts, <b>L</b>inks, <b>U</b> = oben, <b>D</b> = unten, <b>F</b> = vorne, <b>B</b> = hinten. Allein = <b>im Uhrzeigersinn</b>, wenn du direkt auf die Seite schaust. Mit Strich (<b>R'</b>) = gegen den Uhrzeigersinn, mit 2 (<b>R2</b>) = halbe Drehung. <b>y</b> dreht den ganzen Würfel.</p>
          <p class="muted">Tippe einen Würfel an, um den Zug zu sehen.</p>
        </div>
        <div class="notation-grid">${NOTATION.map(([t, d]) => `<button class="nota" data-m="${t}"><span class="mini"></span><span class="nota-txt"><span class="big-tok">${t}</span>${d}</span></button>`).join('')}</div>
      </details>`;
    $('#lessons').innerHTML = nota.replace('<details', '<details') + items;
    // Reihenfolge: Grundlagen zuerst, dann Zug-Sprache
    const basics = $('#lesson-basics');
    basics.after($('#lesson-notation'));
    $$('#lessons details').forEach((d) => d.addEventListener('toggle', () => {
      if (!d.open) return;
      $$('#lessons details').forEach((o) => { if (o !== d) o.open = false; });
      initLesson(d);
      d.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }));
    $('#lessons').addEventListener('click', (e) => {
      const b = e.target.closest('[data-train]');
      if (!b) return;
      $('#trainerPhase').value = b.dataset.train;
      state.trainer = null;
      go('train');
    });
  }

  function openLesson(id) {
    go('learn');
    const d = document.getElementById('lesson-' + id);
    if (d) d.open = true;
  }

  function initLesson(d) {
    if (d.dataset.ready) return;
    d.dataset.ready = '1';
    $$('.case', d).forEach(initCase);
    $$('.nota', d).forEach(initNota);
  }

  function initCase(el) {
    const lesson = LESSONS.find((l) => l.id === el.dataset.l);
    initDemo(el, lesson.cases[Number(el.dataset.c)], lesson.phase);
  }

  /** Mini-Würfel mit Vorführung in einem .case-Element. */
  function initDemo(el, c, phase) {
    const startCube = () => new Cube().apply(BASES[c.base]).apply(c.setup);
    const v = new CubeView($('.mini', el), { size: 26, mask: MASKS[c.mask], view: c.view || 'front', cube: startCube() });
    let demo = c.demo;
    if (demo === 'auto') demo = solve(startCube()).steps.filter((s) => s.phase === phase).flatMap((s) => s.moves);
    const moves = CubeLib.parseSeq(demo);
    const chipBox = $('.mini-chips', el);
    chipBox.innerHTML = chips(moves, -1, 'sm');
    el._moveCtx = { start: startCube, moves };
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

  function initNota(el) {
    const t = el.dataset.m;
    const v = new CubeView($('.mini', el), { size: 20, drag: false, view: t[0] === 'B' ? 'back' : t[0] === 'D' ? 'low' : 'front' });
    let busy = false;
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (busy) return;
      busy = true;
      v.setCube(new Cube());
      await v.animate(t, 550);
      await sleep(700);
      v.setCube(new Cube());
      busy = false;
    });
  }

  /* ---------- Hilfe-Assistent ---------- */
  const { NODES } = Helper;
  const ENTRY = { daisy: 'daisy', cross: 'cross', corners: 'corners', middle: 'middle', ycross: 'ycross', yedges: 'yedges', ycorners: 'ycorners', yorient: 'yorient', auf: 'start' };
  const helpState = { node: 'start', history: [] };

  function helpGo(id, push = true) {
    if (push && id !== helpState.node) helpState.history.push(helpState.node);
    helpState.node = id;
    renderHelp();
    $('#help').scrollTop = 0;
  }

  function demoSpec(d) {
    if (!d) return null;
    if (Array.isArray(d)) {
      const l = LESSONS.find((x) => x.id === d[0]);
      return Object.assign({ phase: l.phase }, l.cases[d[1]]);
    }
    return d;
  }

  function renderHelp() {
    const n = NODES[helpState.node];
    const stepNo = n.phase ? STRIP_PHASES.findIndex((p) => p.id === n.phase) : -1;
    const where = stepNo >= 0 ? `Schritt ${stepNo + 1} von 8: <b>${PHASE_BY_ID[n.phase].title}</b>` : 'Wo stehst du gerade?';
    const nav = `<div class="help-nav">
        ${helpState.history.length ? '<button class="btn small" data-hback>← Zurück</button>' : ''}
        ${helpState.node !== 'start' ? '<button class="btn small" data-hstart>Von vorne</button>' : ''}
      </div>`;
    let body;
    if (n.options) {
      body = `<h2 class="help-q-title">Frage</h2><p class="help-q">${n.q}</p>
        <div class="help-opts">${n.options.map(([label, next]) => `<button class="btn help-opt" data-hnext="${next}">${label}<span aria-hidden="true">›</span></button>`).join('')}</div>`;
    } else {
      const d = demoSpec(n.demo);
      body = `<h2 class="help-q-title">${n.title}</h2>
        <ol class="help-steps">${n.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
        ${d ? `<div class="case help-demo"><div class="mini"></div><h4>${d.title}</h4><div class="chips mini-chips"></div>
          <div class="case-actions"><button class="btn small accent play">▶ Vorführen</button><button class="btn small icon reset" aria-label="Zurücksetzen">⟲</button></div></div>` : ''}
        <div class="help-done">
          <button class="btn primary" data-hnext="${ENTRY[n.phase] || 'start'}">✓ Gemacht – wie geht’s weiter?</button>
        </div>`;
    }
    $('#helpCard').innerHTML = `<div class="help-where">${where}</div>${body}${nav}`;
    const demoEl = $('#helpCard .help-demo');
    if (demoEl) initDemo(demoEl, demoSpec(n.demo), demoSpec(n.demo).phase || n.phase);
  }

  $('#help').addEventListener('click', (e) => {
    const next = e.target.closest('[data-hnext]');
    if (next) return helpGo(next.dataset.hnext);
    if (e.target.closest('[data-hback]')) {
      helpState.node = helpState.history.pop() || 'start';
      return renderHelp();
    }
    if (e.target.closest('[data-hstart]')) {
      helpState.history = [];
      helpState.node = 'start';
      return renderHelp();
    }
    if (e.target.closest('[data-hinput]')) go('input');
  });

  /* ---------- Zug-Erklärung beim Antippen eines Zugs ---------- */
  const sheet = document.createElement('div');
  sheet.id = 'moveSheet';
  sheet.className = 'sheet';
  sheet.hidden = true;
  sheet.innerHTML = `
    <div class="sheet-card ms-card" role="dialog" aria-modal="true" aria-labelledby="msTok">
      <button type="button" class="sheet-close" data-close aria-label="Schließen">×</button>
      <div class="ms-mini"></div>
      <div class="ms-body">
        <div class="ms-tok" id="msTok"></div>
        <p class="ms-text" id="msText"></p>
        <p class="ms-ctx" id="msCtx"></p>
        <div class="case-actions">
          <button type="button" class="btn small" id="msReplay">↻ Nochmal</button>
          <button type="button" class="btn small primary" id="msDo" hidden>Jetzt ausführen</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(sheet);
  const sheetView = new CubeView($('.ms-mini', sheet), { size: 30 });
  let sheetLoop = 0;
  let sheetCtx = null;

  async function loopDemo() {
    const my = ++sheetLoop;
    while (my === sheetLoop && !sheet.hidden) {
      sheetView.setCube(sheetCtx.base.clone());
      await sleep(500);
      if (my !== sheetLoop || sheet.hidden) break;
      await sheetView.animate(sheetCtx.token, 750);
      await sleep(1100);
    }
  }

  function openMoveSheet(ctx) {
    sheetCtx = ctx;
    $('#msTok').textContent = ctx.token;
    $('#msText').textContent = moveText(ctx.token);
    $('#msCtx').textContent = ctx.info || '';
    $('#msDo').hidden = !ctx.canDo;
    showSheet('#moveSheet');
    loopDemo();
  }
  $('#msReplay').addEventListener('click', () => loopDemo());
  $('#msDo').addEventListener('click', () => {
    closeSheets();
    stopPlay();
    stepMove(1);
  });

  document.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip[data-m]');
    if (!chip) return;
    const token = chip.dataset.m;
    const i = Number(chip.dataset.i);
    const caseEl = chip.closest('.case');
    const ctx = { token, base: new Cube(), info: '', canDo: false };
    if (chip.closest('#coach') && state.sol) {
      const si = Number($('#coach').dataset.si);
      const [a] = stepBounds(si);
      const n = state.sol.steps[si].moves.length;
      const p = a + i;
      ctx.base = state.sol.start.clone().apply(state.sol.flat.slice(0, p).map((m) => m.token));
      ctx.info = `Zug ${i + 1} von ${n} in diesem Schritt` + (p < state.pos ? ' – schon erledigt.' : p === state.pos ? ' – das ist der nächste Zug.' : '.');
      ctx.canDo = p === state.pos && !state.busy;
    } else if (chip.closest('#hintBox') && state.hint) {
      ctx.base = state.hint.cube.clone().apply(state.hint.moves.slice(0, i));
      ctx.info = `Zug ${i + 1} von ${state.hint.moves.length} in diesem Tipp.`;
    } else if (caseEl && caseEl._moveCtx) {
      ctx.base = caseEl._moveCtx.start().apply(caseEl._moveCtx.moves.slice(0, i));
      ctx.info = `Zug ${i + 1} von ${caseEl._moveCtx.moves.length} in diesem Beispiel.`;
    }
    openMoveSheet(ctx);
  });

  /* ---------- Start ---------- */
  go('solve');
  fit();
})();
