/*
 * Anfängermethode (Schicht für Schicht) mit Erklärungen.
 * Gehalten wird immer: Gelb oben, Weiß unten. Die Vorderseite wechselt über
 * ganze Würfeldrehungen (y), damit die Algorithmen immer gleich aussehen.
 */
(function (root) {
  'use strict';
  const Lib = typeof module !== 'undefined' && module.exports ? require('./cube.js') : root.CubeLib;
  const { FACE_VEC, COLOR_NAMES, parseSeq, rotVec, vecFace } = Lib;

  const PHASES = [
    { id: 'orient', title: 'Würfel richtig halten', short: 'Halten' },
    { id: 'daisy', title: 'Gänseblümchen', short: 'Gänseblümchen' },
    { id: 'cross', title: 'Weißes Kreuz', short: 'Weißes Kreuz' },
    { id: 'corners', title: 'Weiße Ecken (erste Ebene)', short: 'Weiße Ecken' },
    { id: 'middle', title: 'Zweite Ebene (Mittelkanten)', short: 'Zweite Ebene' },
    { id: 'ycross', title: 'Gelbes Kreuz', short: 'Gelbes Kreuz' },
    { id: 'yedges', title: 'Gelbe Kanten ausrichten', short: 'Gelbe Kanten' },
    { id: 'ycorners', title: 'Gelbe Ecken an ihren Platz', short: 'Ecken platzieren' },
    { id: 'yorient', title: 'Gelbe Ecken drehen', short: 'Ecken drehen' },
    { id: 'auf', title: 'Letzte Ebene ausrichten', short: 'Fertig' },
  ];

  const ALG = {
    sexy: "R U R' U'",
    right: "U R U' R' U' F' U F",
    left: "U' L' U L U F U' F'",
    ycross: "F R U R' U' F'",
    sune: "R U R' U R U2 R' U",
    niklas: "U R U' L' U R' U' L",
    twist: "R' D' R D",
  };

  const name = (c) => COLOR_NAMES[c] || c;
  const pieceName = (q) => {
    const order = ['W', 'Y', 'G', 'O', 'B', 'R'];
    const cols = q.st.map((s) => s.c).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return cols.map(name).join('-') + (cols.length === 2 ? ' Kante' : ' Ecke');
  };
  const pieceKey = (q) => q.st.map((s) => s.c).sort().join('');
  const eq = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  const add = (...vs) => vs.reduce((a, v) => [a[0] + v[0], a[1] + v[1], a[2] + v[2]], [0, 0, 0]);
  const stickerOf = (q, color) => q.st.find((s) => s.c === color);
  const faceOfSticker = (q, color) => vecFace(stickerOf(q, color).d);
  const turnName = (k, f) => ['', f, f + '2', f + "'"][((k % 4) + 4) % 4];

  const FACE_DE = { U: 'oben', D: 'unten', F: 'vorne', B: 'hinten', R: 'rechts', L: 'links' };

  /* ---------- Prüfungen (auch für den Trainer) ---------- */

  function isEdge(q) { return q.st.length === 2; }
  function isCorner(q) { return q.st.length === 3; }
  function hasColor(q, c) { return q.st.some((s) => s.c === c); }

  /** Stück sitzt richtig: jeder Sticker passt zur Mitte seiner Seite. */
  function pieceSolved(cube, q) {
    return q.st.every((s) => cube.center(vecFace(s.d)) === s.c);
  }

  function whiteEdges(cube) { return cube.cubies.filter((q) => isEdge(q) && hasColor(q, 'W')); }
  function whiteCorners(cube) { return cube.cubies.filter((q) => isCorner(q) && hasColor(q, 'W')); }
  function middleEdges(cube) { return cube.cubies.filter((q) => isEdge(q) && !hasColor(q, 'W') && !hasColor(q, 'Y')); }
  function yellowEdges(cube) { return cube.cubies.filter((q) => isEdge(q) && hasColor(q, 'Y')); }
  function yellowCorners(cube) { return cube.cubies.filter((q) => isCorner(q) && hasColor(q, 'Y')); }

  function isPetal(q) {
    const s = stickerOf(q, 'W');
    return q.pos[1] === 1 && s.d[1] === 1;
  }

  const CHECKS = {
    orient: (c) => c.center('U') === 'Y',
    daisy: (c) => c.center('U') === 'Y' && whiteEdges(c).every(isPetal),
    cross: (c) => c.center('D') === 'W' && whiteEdges(c).every((q) => pieceSolved(c, q)),
    corners: (c) => CHECKS.cross(c) && whiteCorners(c).every((q) => pieceSolved(c, q)),
    middle: (c) => CHECKS.corners(c) && middleEdges(c).every((q) => pieceSolved(c, q)),
    ycross: (c) => CHECKS.middle(c) && yellowEdges(c).every((q) => stickerOf(q, 'Y').d[1] === 1),
    yedges: (c) => CHECKS.middle(c) && yellowEdges(c).every((q) => pieceSolved(c, q)),
    ycorners: (c) => CHECKS.yedges(c) && yellowCorners(c).every((q) => cornerPlaced(c, q)),
    yorient: (c) => c.isSolved(),
    auf: (c) => c.isSolved(),
  };

  function cornerPlaced(cube, q) {
    const want = [0, 1, 2].map((i) => vecFace([i === 0 ? q.pos[0] : 0, i === 1 ? q.pos[1] : 0, i === 2 ? q.pos[2] : 0]));
    const cols = want.map((f) => cube.center(f)).sort().join('');
    return cols === pieceKey(q);
  }

  /* ---------- Löser ---------- */

  function solve(input) {
    const cube = input.clone();
    const steps = [];
    let guard = 0;

    function step(phase, title, text, moves, focus, extra) {
      const seq = parseSeq(moves);
      if (!seq.length) return;
      cube.apply(seq);
      steps.push(Object.assign({ phase, title, text, moves: seq, focus: focus || null }, extra || {}));
      if (++guard > 400) throw new Error('Zu viele Schritte – der Würfel ist vermutlich nicht lösbar.');
    }

    /** y-Drehung, die die Position von q auf target bringt. */
    function yFor(q, target) {
      for (let k = 0; k < 4; k++) {
        if (eq(rotVec(q.pos, 'y', -k), target)) return turnName(k, 'y');
      }
      return null;
    }
    /** y-Drehung, die die Richtung dir nach vorne bringt. */
    function yFaceFront(dir) {
      for (let k = 0; k < 4; k++) if (eq(rotVec(dir, 'y', -k), [0, 0, 1])) return turnName(k, 'y');
      return null;
    }
    function rotText(t) {
      if (!t) return '';
      return t === 'y' ? 'eine Vierteldrehung nach links (y)' : t === "y'" ? 'eine Vierteldrehung nach rechts (y\')' : 'eine halbe Drehung (y2)';
    }

    /* Phase 0: Halten */
    const yFace = cube.faceOfColor('Y');
    const holdMove = { U: '', D: 'x2', F: 'x', B: "x'", R: "z'", L: 'z' }[yFace];
    step('orient', 'Gelb nach oben', 'Halte den Würfel so, dass die <b>gelbe Mitte oben</b> ist. Die Mittelsteine bewegen sich nie gegeneinander – sie bestimmen, welche Farbe auf welche Seite gehört. Weiß ist dann automatisch unten.', holdMove);

    /* Phase 1 + 2: Gänseblümchen und weißes Kreuz */
    if (!CHECKS.cross(cube)) {
      let loops = 0;
      while (++loops < 30) {
        const todo = whiteEdges(cube).filter((q) => !isPetal(q));
        if (!todo.length) break;
        // leichteste Fälle zuerst
        const rank = (q) => {
          if (q.pos[1] === 0) return 0;
          if (q.pos[1] === -1 && stickerOf(q, 'W').d[1] === -1) return 1;
          return q.pos[1] === -1 ? 2 : 3;
        };
        todo.sort((a, b) => rank(a) - rank(b));
        const q = todo[0];
        const key = pieceKey(q);
        const nm = pieceName(q);
        const other = q.st.find((s) => s.c !== 'W').c;

        // freien Platz oben schaffen (U drehen, bis an target kein Blütenblatt ist)
        const freeSlot = (target, why) => {
          for (let k = 0; k < 4; k++) {
            const c2 = cube.clone().apply(turnName(k, 'U'));
            const occ = c2.cubieAt(target);
            if (!(isEdge(occ) && hasColor(occ, 'W') && isPetal(occ))) {
              step('daisy', 'Platz freimachen', `Oben ${why} sitzt schon ein weißes Blütenblatt. Drehe die <b>obere Ebene</b>, damit dort ein freier Platz ist – sonst würden wir ein fertiges Blütenblatt wieder herausschlagen.`, turnName(k, 'U'), key);
              return;
            }
          }
        };

        if (q.pos[1] === 0) {
          const r = yFor(q, [1, 0, 1]);
          step('daisy', 'Kante nach vorne holen', `Die ${nm} steckt in der <b>mittleren Ebene</b>. Drehe den ganzen Würfel ${rotText(r)}, sodass sie <b>vorne rechts</b> sitzt.`, r, key);
          const wf = faceOfSticker(cube.find(key), 'W');
          if (wf === 'F') {
            freeSlot([1, 1, 0], 'rechts');
            step('daisy', 'Kante hochdrehen (R)', `Weiß zeigt nach <b>vorne</b>. Drehe die <b>rechte Seite</b> (R): Die Kante wandert nach oben und Weiß zeigt jetzt zur gelben Mitte.`, 'R', key);
          } else {
            freeSlot([0, 1, 1], 'vorne');
            step('daisy', 'Kante hochdrehen (F\')', `Weiß zeigt nach <b>rechts</b>. Drehe die <b>vordere Seite</b> gegen den Uhrzeigersinn (F'): Die Kante klappt nach oben, Weiß zeigt zur gelben Mitte.`, "F'", key);
          }
        } else if (q.pos[1] === -1) {
          const r = yFor(q, [0, -1, 1]);
          step('daisy', 'Kante nach vorne holen', `Die ${nm} liegt <b>unten</b>. Drehe den Würfel ${rotText(r)}, sodass sie <b>unten vorne</b> liegt.`, r, key);
          if (faceOfSticker(cube.find(key), 'W') === 'D') {
            freeSlot([0, 1, 1], 'vorne');
            step('daisy', 'Kante hochholen (F2)', 'Weiß zeigt <b>nach unten</b>. Mit einer halben Drehung der Vorderseite (F2) kommt die Kante direkt nach oben – Weiß zeigt dann nach oben.', 'F2', key);
          } else {
            freeSlot([0, 1, 1], 'vorne');
            step('daisy', 'Kante in die Mitte drehen (F)', 'Weiß zeigt nach <b>vorne</b> statt nach unten – sie ist „verkehrt herum“. Drehe zuerst die Vorderseite (F): Jetzt steckt die Kante in der mittleren Ebene <b>vorne links</b>, Weiß zeigt nach vorne.', 'F', key);
            freeSlot([-1, 1, 0], 'links');
            step('daisy', 'Kante hochdrehen (L\')', 'Jetzt die <b>linke Seite</b> nach oben drehen (L\'): Die Kante kommt nach oben und Weiß zeigt zur gelben Mitte.', "L'", key);
          }
        } else {
          const r = yFor(q, [0, 1, 1]);
          step('daisy', 'Kante nach vorne holen', `Die ${nm} ist schon oben, aber <b>Weiß zeigt zur Seite</b> (sie ist gekippt). Drehe den Würfel ${rotText(r)}, sodass sie <b>oben vorne</b> ist.`, r, key);
          step('daisy', 'Kante in die Mitte drehen (F)', 'Drehe die Vorderseite (F). Die Kante liegt jetzt in der mittleren Ebene <b>vorne rechts</b>, Weiß zeigt nach vorne – das ist ein Fall, den wir schon kennen.', 'F', key);
          freeSlot([1, 1, 0], 'rechts');
          step('daisy', 'Kante hochdrehen (R)', 'Rechte Seite hoch (R): Die Kante kommt richtig herum nach oben, Weiß zeigt zur gelben Mitte.', 'R', key);
        }
        if (guard > 0) steps[steps.length - 1].note = `Blütenblatt ${4 - whiteEdges(cube).filter((e) => !isPetal(e)).length} von 4 fertig.`;
      }

      // Phase 2: Kreuz
      loops = 0;
      while (++loops < 10) {
        const petals = whiteEdges(cube).filter((q) => isPetal(q));
        if (!petals.length) break;
        // Blütenblatt mit wenigsten U-Drehungen
        let best = null;
        for (const q of petals) {
          const side = q.st.find((s) => s.c !== 'W');
          const dir = [q.pos[0], 0, q.pos[2]];
          for (let k = 0; k < 4; k++) {
            if (cube.center(vecFace(rotVec(dir, 'y', -k))) === side.c) {
              const cost = k === 0 ? 0 : k === 2 ? 2 : 1;
              if (!best || cost < best.cost) best = { q, k, cost, color: side.c };
            }
          }
        }
        const key = pieceKey(best.q);
        const nm = pieceName(best.q);
        step('cross', 'Seitenfarbe ausrichten', `Schau auf die <b>Seitenfarbe</b> der ${nm} (${name(best.color)}). Drehe die <b>obere Ebene</b>, bis sie genau über der <b>${name(best.color)}en Mitte</b> steht.`, turnName(best.k, 'U'), key);
        const qq = cube.find(key);
        const r = yFaceFront([qq.pos[0], 0, qq.pos[2]]);
        step('cross', 'Würfel drehen', `Drehe den Würfel ${rotText(r)}, sodass die ${name(best.color)}e Seite <b>vorne</b> ist.`, r, key);
        step('cross', 'Nach unten klappen (F2)', `Die Seitenfarbe steht über ihrer Mitte. Jetzt die Vorderseite zweimal drehen (F2): Die Kante wandert nach unten, Weiß zeigt nach unten und ${name(best.color)} passt zur Mitte.`, 'F2', key);
      }
    }

    // Falls das Kreuz bei der Eingabe schon fertig war: Weiß muss unten sein (ist durch Gelb oben gesichert).

    /* Phase 3: Weiße Ecken */
    let loops = 0;
    while (++loops < 40) {
      const todo = whiteCorners(cube).filter((q) => !pieceSolved(cube, q));
      if (!todo.length) break;
      todo.sort((a, b) => b.pos[1] - a.pos[1]);
      const q = todo[0];
      const key = pieceKey(q);
      const nm = pieceName(q);
      const sides = q.st.filter((s) => s.c !== 'W').map((s) => s.c);
      const slot = add(FACE_VEC[cube.faceOfColor(sides[0])], FACE_VEC[cube.faceOfColor(sides[1])], [0, -1, 0]);

      if (q.pos[1] === -1) {
        const inOwnSlot = eq(q.pos, slot);
        const r = yFor(q, [1, -1, 1]);
        if (inOwnSlot) {
          step('corners', 'Ecke nach vorne rechts', `Die ${nm} ist an ihrem <b>richtigen Platz, aber verdreht</b> (Weiß zeigt nicht nach unten). Drehe den Würfel ${rotText(r)}, sodass sie <b>vorne rechts unten</b> sitzt.`, r, key);
          let n = 0;
          const c2 = cube.clone();
          while (!pieceSolved(c2, c2.find(key)) && n < 6) { c2.apply(ALG.sexy); n++; }
          step('corners', `${n}× R U R' U'`, `Wiederhole <b>R U R' U'</b>, bis die Ecke richtig sitzt – hier <b>${n}-mal</b>. Keine Sorge: Zwischendurch sieht es kurz chaotisch aus, das Kreuz bleibt aber am Ende heil.`, Array(n).fill(ALG.sexy).join(' '), key, { repeat: n, alg: ALG.sexy });
          continue;
        }
        step('corners', 'Falsche Ecke herausholen', `Die ${nm} steckt unten an einem <b>falschen Platz</b>. Drehe den Würfel ${rotText(r)}, sodass sie <b>vorne rechts unten</b> sitzt.`, r, key);
        step('corners', 'Ecke nach oben holen', 'Einmal <b>R U R\' U\'</b> – damit wird die Ecke nach oben in die obere Ebene „herausgehebelt“. Jetzt können wir sie wie eine normale obere Ecke einsetzen.', ALG.sexy, key);
        continue;
      }
      // Ecke oben: Zielplatz nach vorne rechts drehen, Ecke darüber
      const ry = yFor({ pos: slot }, [1, -1, 1]);
      step('corners', 'Zielplatz nach vorne', `Die ${nm} gehört zwischen <b>${name(sides[0])}</b> und <b>${name(sides[1])}</b>. Drehe den Würfel ${rotText(ry)}, sodass dieser Platz <b>vorne rechts unten</b> ist.`, ry, key);
      const cur = cube.find(key).pos;
      let ku = 0;
      for (let k = 0; k < 4; k++) if (eq(rotVec(cur, 'y', -k), [1, 1, 1])) ku = k;
      step('corners', 'Ecke über den Platz', 'Drehe die <b>obere Ebene</b>, bis die Ecke <b>genau über</b> ihrem Platz steht (oben vorne rechts).', turnName(ku, 'U'), key);
      const wDir = faceOfSticker(cube.find(key), 'W');
      let n = 0;
      const c2 = cube.clone();
      while (!pieceSolved(c2, c2.find(key)) && n < 6) { c2.apply(ALG.sexy); n++; }
      const caseTxt = { R: 'Weiß zeigt nach <b>rechts</b>', F: 'Weiß zeigt nach <b>vorne</b>', U: 'Weiß zeigt nach <b>oben</b> (schwerster Fall)' }[wDir] || '';
      step('corners', `${n}× R U R' U'`, `${caseTxt}. Wiederhole <b>R U R' U'</b>, bis die Ecke mit Weiß nach unten sitzt – hier <b>${n}-mal</b>.`, Array(n).fill(ALG.sexy).join(' '), key, { repeat: n, alg: ALG.sexy });
    }

    /* Phase 4: Zweite Ebene */
    loops = 0;
    while (++loops < 30) {
      const todo = middleEdges(cube).filter((q) => !pieceSolved(cube, q));
      if (!todo.length) break;
      const top = todo.filter((q) => q.pos[1] === 1);
      if (!top.length) {
        const q = todo[0];
        const key = pieceKey(q);
        const r = yFor(q, [1, 0, 1]);
        const placedFlipped = q.st.every((s) => [cube.faceOfColor(s.c)].some((f) => FACE_VEC[f][1] === 0 && (FACE_VEC[f][0] === q.pos[0] || FACE_VEC[f][2] === q.pos[2])));
        step('middle', 'Steckengebliebene Kante', `Die ${pieceName(q)} steckt in der mittleren Ebene, aber ${placedFlipped ? '<b>verdreht</b> (Farben vertauscht)' : 'am <b>falschen Platz</b>'}. Drehe den Würfel ${rotText(r)}, sodass sie <b>vorne rechts</b> steckt.`, r, key);
        step('middle', 'Kante herausholen', 'Führe den <b>Rechts-Algorithmus</b> aus (U R U\' R\' U\' F\' U F) – egal, welche Kante gerade oben vorne liegt. Dadurch wandert die falsche Kante nach oben und wir können sie danach richtig einsetzen.', ALG.right, key);
        continue;
      }
      const q = top[0];
      const key = pieceKey(q);
      const side = q.st.find((s) => s.d[1] === 0);
      const topC = q.st.find((s) => s.d[1] === 1).c;
      let ku = 0;
      for (let k = 0; k < 4; k++) if (cube.center(vecFace(rotVec(side.d, 'y', -k))) === side.c) ku = k;
      step('middle', 'Umgedrehtes T bilden', `Die ${pieceName(q)} liegt oben. Drehe die <b>obere Ebene</b>, bis ihre Seitenfarbe (${name(side.c)}) über der <b>${name(side.c)}en Mitte</b> steht – zusammen bilden sie ein umgedrehtes „T“.`, turnName(ku, 'U'), key);
      const qq = cube.find(key);
      const r = yFaceFront([qq.pos[0], 0, qq.pos[2]]);
      step('middle', 'Würfel drehen', `Drehe den Würfel ${rotText(r)}, sodass die ${name(side.c)}e Seite <b>vorne</b> ist.`, r, key);
      if (cube.center('R') === topC) {
        step('middle', 'Nach rechts einsetzen', `Die obere Farbe der Kante (${name(topC)}) passt zur <b>rechten</b> Mitte. Also: <b>Rechts-Algorithmus</b> U R U' R' U' F' U F. Merkhilfe: „weg drehen, hoch, zurück, runter – dann die Vorderseite nachziehen“.`, ALG.right, key, { alg: ALG.right });
      } else {
        step('middle', 'Nach links einsetzen', `Die obere Farbe der Kante (${name(topC)}) passt zur <b>linken</b> Mitte. Also: <b>Links-Algorithmus</b> U' L' U L U F U' F' – das Spiegelbild des Rechts-Algorithmus.`, ALG.left, key, { alg: ALG.left });
      }
    }

    /* Phase 5: Gelbes Kreuz */
    loops = 0;
    while (++loops < 6) {
      const up = yellowEdges(cube).filter((q) => stickerOf(q, 'Y').d[1] === 1).map((q) => q.pos);
      if (up.length === 4) break;
      const has = (p, list) => list.some((v) => eq(v, p));
      if (up.length === 2 && up[0][0] === -up[1][0] && up[0][2] === -up[1][2]) {
        let k = 0;
        for (; k < 4; k++) {
          const l = up.map((p) => rotVec(p, 'y', -k));
          if (has([1, 1, 0], l)) break;
        }
        step('ycross', 'Linie waagerecht legen', 'Oben siehst du eine gelbe <b>Linie</b>. Drehe die obere Ebene, sodass sie <b>waagerecht</b> (von links nach rechts) liegt.', turnName(k, 'U'));
        step('ycross', 'Linie → Kreuz', '<b>F R U R\' U\' F\'</b> macht aus der waagerechten Linie das gelbe Kreuz.', ALG.ycross, null, { alg: ALG.ycross });
      } else if (up.length === 2) {
        let k = 0;
        for (; k < 4; k++) {
          const l = up.map((p) => rotVec(p, 'y', -k));
          if (has([0, 1, -1], l) && has([-1, 1, 0], l)) break;
        }
        step('ycross', 'Winkel nach hinten links', 'Oben siehst du einen gelben <b>Winkel</b> (wie ein kleines „L“). Drehe die obere Ebene, sodass er <b>hinten links</b> liegt – wie die Zeiger einer Uhr auf „9 Uhr und 12 Uhr“.', turnName(k, 'U'));
        step('ycross', 'Winkel → Linie', '<b>F R U R\' U\' F\'</b> – aus dem Winkel wird eine Linie.', ALG.ycross, null, { alg: ALG.ycross });
      } else {
        step('ycross', 'Punkt → Winkel', 'Oben ist nur der gelbe <b>Punkt</b> (keine gelbe Kante zeigt nach oben). Führe <b>F R U R\' U\' F\'</b> einfach von irgendeiner Seite aus – danach hast du einen Winkel.', ALG.ycross, null, { alg: ALG.ycross });
      }
    }

    /* Phase 6: Gelbe Kanten */
    loops = 0;
    while (++loops < 8) {
      const matches = (c) => yellowEdges(c).filter((q) => pieceSolved(c, q)).length;
      let bestK = 0;
      let bestN = -1;
      for (let k = 0; k < 4; k++) {
        const n = matches(cube.clone().apply(turnName(k, 'U')));
        if (n > bestN) { bestN = n; bestK = k; }
      }
      if (bestN === 4) {
        step('yedges', 'Kanten passen', 'Drehe die obere Ebene, bis <b>alle vier</b> Seitenfarben der gelben Kanten zu ihren Mitten passen.', turnName(bestK, 'U'));
        break;
      }
      step('yedges', 'Passende Kanten suchen', `Drehe die obere Ebene so, dass möglichst viele gelbe Kanten mit ihrer Seitenfarbe zur Mitte passen – hier passen <b>${bestN}</b>.`, turnName(bestK, 'U'));
      const good = yellowEdges(cube).filter((q) => pieceSolved(cube, q)).map((q) => [q.pos[0], 0, q.pos[2]]);
      let adjacent = null;
      if (good.length === 2 && !(good[0][0] === -good[1][0] && good[0][2] === -good[1][2])) {
        // so drehen, dass die beiden hinten und rechts sind
        for (let k = 0; k < 4; k++) {
          const l = good.map((d) => rotVec(d, 'y', -k));
          if (l.some((d) => eq(d, [0, 0, -1])) && l.some((d) => eq(d, [1, 0, 0]))) adjacent = turnName(k, 'y');
        }
      }
      if (adjacent !== null) {
        step('yedges', 'Passende nach hinten & rechts', `Die zwei passenden Kanten liegen <b>nebeneinander</b>. Drehe den Würfel ${rotText(adjacent) || '(ist schon richtig)'}, sodass sie <b>hinten und rechts</b> sind.`, adjacent);
        step('yedges', 'Kanten tauschen', '<b>R U R\' U R U2 R\' U</b> tauscht die beiden Kanten vorne und links – danach passen alle vier.', ALG.sune, null, { alg: ALG.sune });
      } else {
        step('yedges', 'Kanten tauschen', `Die passenden Kanten liegen ${bestN === 2 ? '<b>gegenüber</b>' : 'nicht nebeneinander'}. Führe <b>R U R' U R U2 R' U</b> einmal aus – danach liegen zwei passende Kanten nebeneinander.`, ALG.sune, null, { alg: ALG.sune });
      }
    }

    /* Phase 7: Gelbe Ecken platzieren */
    loops = 0;
    while (++loops < 8) {
      const ok = yellowCorners(cube).filter((q) => cornerPlaced(cube, q));
      if (ok.length === 4) break;
      if (ok.length >= 1) {
        const q = ok[0];
        const key = pieceKey(q);
        const r = yFor(q, [1, 1, 1]);
        step('ycorners', 'Richtige Ecke nach vorne rechts', `Die ${pieceName(q)} ist schon am <b>richtigen Platz</b> (ihre Farben passen zu den drei Mitten drumherum – egal, wie sie gedreht ist). Drehe den Würfel ${rotText(r) || '(passt schon)'}, sodass sie <b>oben vorne rechts</b> ist.`, r, key);
        step('ycorners', 'Drei Ecken tauschen', '<b>U R U\' L\' U R\' U\' L</b> lässt die Ecke vorne rechts stehen und tauscht die anderen drei im Kreis. Eventuell musst du es noch einmal machen.', ALG.niklas, key, { alg: ALG.niklas });
      } else {
        step('ycorners', 'Keine Ecke passt', 'Keine einzige gelbe Ecke ist am richtigen Platz. Führe <b>U R U\' L\' U R\' U\' L</b> einmal von irgendeiner Seite aus – danach ist mindestens eine Ecke richtig.', ALG.niklas, null, { alg: ALG.niklas });
      }
    }

    /* Phase 8: Gelbe Ecken drehen */
    loops = 0;
    let warned = false;
    while (++loops < 12) {
      const bad = yellowCorners(cube).filter((q) => stickerOf(q, 'Y').d[1] !== 1);
      if (!bad.length) break;
      const ufr = cube.cubieAt([1, 1, 1]);
      if (stickerOf(ufr, 'Y').d[1] === 1) {
        let ku = 0;
        for (let k = 1; k < 4; k++) {
          const c2 = cube.clone().apply(turnName(k, 'U'));
          if (stickerOf(c2.cubieAt([1, 1, 1]), 'Y').d[1] !== 1) { ku = k; break; }
        }
        step('yorient', 'Nächste verdrehte Ecke', 'Drehe <b>nur die obere Ebene</b> (U), bis die nächste verdrehte Ecke <b>vorne rechts oben</b> steht. <b>Niemals</b> den ganzen Würfel drehen!', turnName(ku, 'U'), pieceKey(cube.clone().apply(turnName(ku, 'U')).cubieAt([1, 1, 1])));
        continue;
      }
      const key = pieceKey(ufr);
      let n = 0;
      const c2 = cube.clone();
      while (stickerOf(c2.find(key), 'Y').d[1] !== 1 && n < 6) { c2.apply(ALG.twist); n++; }
      const txt = warned
        ? `Wieder <b>R' D' R D</b>, bis Gelb oben ist – hier <b>${n}-mal</b>.`
        : `Halte den Würfel jetzt fest – <b>nicht mehr drehen!</b> Wiederhole <b>R' D' R D</b>, bis Gelb dieser Ecke nach oben zeigt – hier <b>${n}-mal</b>. Die unteren Ebenen sehen danach kaputt aus. <b>Keine Panik</b>, das repariert sich, wenn alle Ecken fertig sind.`;
      warned = true;
      step('yorient', `${n}× R' D' R D`, txt, Array(n).fill(ALG.twist).join(' '), key, { repeat: n, alg: ALG.twist });
    }

    /* Phase 9: Ausrichten */
    for (let k = 0; k < 4; k++) {
      if (cube.clone().apply(turnName(k, 'U')).isSolved()) {
        step('auf', 'Letzte Ebene drehen', 'Drehe die obere Ebene, bis alles passt. <b>Gelöst!</b> 🎉', turnName(k, 'U'));
        break;
      }
    }

    return { steps, solved: cube.isSolved(), final: cube };
  }

  /** Prüft Farbeingabe und gibt eine deutsche Fehlermeldung oder null zurück. */
  function validate(cube) {
    const counts = {};
    for (const q of cube.cubies) for (const s of q.st) counts[s.c] = (counts[s.c] || 0) + 1;
    for (const c of ['W', 'Y', 'G', 'B', 'O', 'R']) {
      if (counts[c] !== 9) return `Die Farbe ${name(c)} kommt ${counts[c] || 0}-mal vor – es müssen genau 9 sein.`;
    }
    const opposite = { W: 'Y', Y: 'W', G: 'B', B: 'G', O: 'R', R: 'O' };
    const seen = new Set();
    for (const q of cube.cubies) {
      if (q.st.length < 2) continue;
      const cols = q.st.map((s) => s.c);
      if (new Set(cols).size !== cols.length) return `Ein Stück hat zweimal dieselbe Farbe (${cols.map(name).join('-')}). Prüfe die Eingabe.`;
      for (let i = 0; i < cols.length; i++) for (let j = i + 1; j < cols.length; j++) {
        if (opposite[cols[i]] === cols[j]) return `Ein Stück hat ${name(cols[i])} und ${name(cols[j])} – die liegen auf einem echten Würfel gegenüber und können nie auf einem Stück sein.`;
      }
      const k = pieceKey(q);
      if (seen.has(k)) return `Das Stück ${cols.map(name).join('-')} kommt doppelt vor.`;
      seen.add(k);
      if (q.st.length === 3) {
        // Ecken müssen die richtige Händigkeit haben
        const ref = new Lib.Cube().find(k);
        const handed = (p) => {
          const byC = {};
          p.st.forEach((s) => { byC[s.c] = s.d; });
          const [a, b, c] = ['W', 'Y', 'G', 'B', 'O', 'R'].filter((x) => byC[x]).map((x) => byC[x]);
          return a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
        };
        if (handed(ref) !== handed(q)) return `Die Ecke ${cols.map(name).join('-')} ist spiegelverkehrt eingegeben – prüfe die Reihenfolge der Farben.`;
      }
    }
    const res = solve(cube);
    if (!res.solved) return 'Diese Farbverteilung ist nicht lösbar – wahrscheinlich ist eine Ecke verdreht oder eine Kante gekippt eingegeben (oder der Würfel wurde mal falsch zusammengebaut).';
    return null;
  }

  const api = { solve, validate, PHASES, CHECKS, ALG, FACE_DE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Solver = api;
})(typeof window !== 'undefined' ? window : globalThis);
