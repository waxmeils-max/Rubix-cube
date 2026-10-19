// Testet den Löser mit vielen zufälligen Verdrehungen: node tests/solver.test.js
const { Cube, randomScramble } = require('../js/cube.js');
const { solve, validate, CHECKS, PHASES } = require('../js/solver.js');

let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

const N = Number(process.argv[2] || 3000);
let total = 0;
let fail = 0;
for (let i = 0; i < N; i++) {
  const scr = randomScramble(25, rnd);
  const c = new Cube().apply(scr);
  // gelegentlich verdreht halten
  if (i % 7 === 0) c.apply(['x', 'z', "x'", 'z2', 'x2'][i % 5]);
  let res;
  try {
    res = solve(c);
  } catch (e) {
    console.log('FEHLER', scr.join(' '), e.message);
    fail++;
    continue;
  }
  if (!res.solved) { console.log('NICHT GELÖST', scr.join(' ')); fail++; continue; }
  // Phasen-Reihenfolge und Zwischenziele prüfen
  const order = PHASES.map((p) => p.id);
  const sim = c.clone();
  let lastIdx = 0;
  for (let s = 0; s < res.steps.length; s++) {
    const st = res.steps[s];
    const idx = order.indexOf(st.phase);
    if (idx < lastIdx) { console.log('Phase rückwärts', scr.join(' ')); fail++; break; }
    if (idx > lastIdx) {
      // vor dem letzten Ausrichten darf die obere Ebene verdreht sein
      const upto = order[idx] === 'auf' ? order.indexOf('ycross') : idx;
      for (let p = 1; p < upto; p++) {
        if (order[p] === 'daisy') continue;
        if (!CHECKS[order[p]](sim)) { console.log('Ziel nicht erreicht:', order[p], scr.join(' ')); fail++; s = 1e9; break; }
      }
    }
    lastIdx = idx;
    sim.apply(st.moves);
  }
  total += res.steps.reduce((a, s) => a + s.moves.length, 0);
}
// Validierung: gekippte Kante
const bad = new Cube();
const e = bad.find('GY');
e.st.forEach((s, i, arr) => { if (i === 0) { const t = arr[0].c; arr[0].c = arr[1].c; arr[1].c = t; } });
const msg = validate(bad);
if (!msg) { console.log('Gekippte Kante nicht erkannt'); fail++; }
if (validate(new Cube().apply("R U F' L2"))) { console.log('Gültiger Würfel abgelehnt'); fail++; }

console.log(`${N} Würfel, ${fail} Fehler, Ø ${(total / N).toFixed(1)} Züge`);
process.exit(fail ? 1 : 0);
