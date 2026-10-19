/*
 * Würfel-Modell (stückbasiert).
 * Koordinaten: x = rechts, y = oben, z = vorne. Jedes Stück (Cubie) hat eine
 * Position und Sticker, die in eine Richtung zeigen.
 * Farbschema beim Halten: Gelb oben, Weiß unten, Grün vorne, Orange rechts,
 * Rot links, Blau hinten.
 */
(function (root) {
  'use strict';

  const FACE_VEC = {
    U: [0, 1, 0], D: [0, -1, 0],
    R: [1, 0, 0], L: [-1, 0, 0],
    F: [0, 0, 1], B: [0, 0, -1],
  };
  const FACES = ['U', 'R', 'F', 'D', 'L', 'B'];
  const SOLVED_SCHEME = { U: 'Y', D: 'W', F: 'G', B: 'B', R: 'O', L: 'R' };

  const COLOR_NAMES = {
    W: 'weiß', Y: 'gelb', G: 'grün', B: 'blau', O: 'orange', R: 'rot', X: 'grau',
  };

  // Achse, Ebene (null = ganzer Würfel), Vierteldrehungen nach Rechte-Hand-Regel
  const MOVE_DEF = {
    R: ['x', 1, -1], L: ['x', -1, 1],
    U: ['y', 1, -1], D: ['y', -1, 1],
    F: ['z', 1, -1], B: ['z', -1, 1],
    M: ['x', 0, 1], E: ['y', 0, 1], S: ['z', 0, -1],
    x: ['x', null, -1], y: ['y', null, -1], z: ['z', null, -1],
  };

  function vecFace(v) {
    for (const f of FACES) {
      const w = FACE_VEC[f];
      if (w[0] === v[0] && w[1] === v[1] && w[2] === v[2]) return f;
    }
    return null;
  }

  function rotVec(v, axis, q) {
    let [x, y, z] = v;
    const n = ((q % 4) + 4) % 4;
    for (let i = 0; i < n; i++) {
      if (axis === 'x') [x, y, z] = [x, -z, y];
      else if (axis === 'y') [x, y, z] = [z, y, -x];
      else [x, y, z] = [-y, x, z];
    }
    return [x, y, z];
  }

  function axisIndex(axis) { return axis === 'x' ? 0 : axis === 'y' ? 1 : 2; }

  function parseMove(token) {
    const m = /^([URFDLBMESxyz])(2|'|’)?$/.exec(token.trim());
    if (!m) throw new Error('Unbekannter Zug: ' + token);
    const amount = m[2] === '2' ? 2 : m[2] ? -1 : 1;
    const [axis, layer, q] = MOVE_DEF[m[1]];
    return { face: m[1], amount, axis, layer, q: q * amount, token: m[1] + (m[2] === '2' ? '2' : m[2] ? "'" : '') };
  }

  function parseSeq(seq) {
    if (Array.isArray(seq)) return seq.slice();
    return seq.split(/\s+/).filter(Boolean).map((t) => parseMove(t).token);
  }

  function invertMove(token) {
    const m = parseMove(token);
    if (m.amount === 2) return m.face + '2';
    return m.amount === 1 ? m.face + "'" : m.face;
  }

  function invertSeq(seq) {
    return parseSeq(seq).reverse().map(invertMove);
  }

  /** Fasst aufeinanderfolgende Züge derselben Seite zusammen (U U -> U2). */
  function simplify(seq) {
    const out = [];
    for (const t of parseSeq(seq)) {
      const m = parseMove(t);
      const last = out.length ? parseMove(out[out.length - 1]) : null;
      if (last && last.face === m.face) {
        out.pop();
        const sum = (((last.amount + m.amount) % 4) + 4) % 4;
        if (sum === 1) out.push(m.face);
        else if (sum === 2) out.push(m.face + '2');
        else if (sum === 3) out.push(m.face + "'");
      } else {
        out.push(m.token);
      }
    }
    return out;
  }

  class Cube {
    constructor(empty) {
      this.cubies = [];
      if (empty) return;
      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          for (let z = -1; z <= 1; z++) {
            if (!x && !y && !z) continue;
            const st = [];
            for (const f of FACES) {
              const v = FACE_VEC[f];
              if ((v[0] && v[0] === x) || (v[1] && v[1] === y) || (v[2] && v[2] === z)) {
                st.push({ d: v.slice(), c: SOLVED_SCHEME[f] });
              }
            }
            this.cubies.push({ pos: [x, y, z], st, home: [x, y, z] });
          }
        }
      }
    }

    clone() {
      const c = new Cube(true);
      c.cubies = this.cubies.map((q) => ({
        pos: q.pos.slice(),
        home: q.home.slice(),
        st: q.st.map((s) => ({ d: s.d.slice(), c: s.c })),
      }));
      return c;
    }

    move(token) {
      const m = parseMove(token);
      const ai = axisIndex(m.axis);
      for (const q of this.cubies) {
        if (m.layer !== null && q.pos[ai] !== m.layer) continue;
        q.pos = rotVec(q.pos, m.axis, m.q);
        for (const s of q.st) s.d = rotVec(s.d, m.axis, m.q);
      }
      return this;
    }

    apply(seq) {
      for (const t of parseSeq(seq)) this.move(t);
      return this;
    }

    cubieAt(pos) {
      return this.cubies.find((q) => q.pos[0] === pos[0] && q.pos[1] === pos[1] && q.pos[2] === pos[2]);
    }

    colorAt(pos, face) {
      const q = this.cubieAt(pos);
      if (!q) return null;
      const v = FACE_VEC[face];
      const s = q.st.find((s) => s.d[0] === v[0] && s.d[1] === v[1] && s.d[2] === v[2]);
      return s ? s.c : null;
    }

    center(face) {
      return this.colorAt(FACE_VEC[face], face);
    }

    /** Seite, auf der die Mitte mit dieser Farbe liegt. */
    faceOfColor(color) {
      return FACES.find((f) => this.center(f) === color);
    }

    /** Findet ein Stück anhand seiner Farben (Reihenfolge egal). */
    find(colors) {
      const key = colors.split('').sort().join('');
      return this.cubies.find((q) => q.st.map((s) => s.c).sort().join('') === key);
    }

    /** Position eines Facelets im Netz (face, Zeile, Spalte) -> Würfelposition. */
    static faceletPos(face, r, c) {
      switch (face) {
        case 'U': return [c - 1, 1, r - 1];
        case 'D': return [c - 1, -1, 1 - r];
        case 'F': return [c - 1, 1 - r, 1];
        case 'B': return [1 - c, 1 - r, -1];
        case 'R': return [1, 1 - r, 1 - c];
        case 'L': return [-1, 1 - r, c - 1];
      }
      return null;
    }

    facelets() {
      const out = {};
      for (const f of FACES) {
        out[f] = [];
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out[f].push(this.colorAt(Cube.faceletPos(f, r, c), f));
      }
      return out;
    }

    /** Baut einen Würfel aus Facelet-Farben {U:[9], ...}. */
    static fromFacelets(fl) {
      const cube = new Cube();
      for (const q of cube.cubies) {
        for (const s of q.st) {
          const f = vecFace(s.d);
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
              const p = Cube.faceletPos(f, r, c);
              if (p[0] === q.pos[0] && p[1] === q.pos[1] && p[2] === q.pos[2]) s.c = fl[f][r * 3 + c];
            }
          }
        }
      }
      return cube;
    }

    isSolved() {
      const fl = this.facelets();
      return FACES.every((f) => fl[f].every((c) => c === fl[f][4]));
    }

    /** Einheitliche Darstellung zum Vergleichen. */
    key() {
      const fl = this.facelets();
      return FACES.map((f) => fl[f].join('')).join('|');
    }
  }

  function randomScramble(n = 22, rnd = Math.random) {
    const faces = ['U', 'D', 'R', 'L', 'F', 'B'];
    const axisOf = { U: 0, D: 0, R: 1, L: 1, F: 2, B: 2 };
    const out = [];
    let last = null;
    let prev = null;
    while (out.length < n) {
      const f = faces[Math.floor(rnd() * 6)];
      if (f === last) continue;
      // keine drei Züge auf derselben Achse hintereinander (z. B. R L R)
      if (prev && axisOf[prev] === axisOf[f] && axisOf[last] === axisOf[f]) continue;
      const suf = ['', "'", '2'][Math.floor(rnd() * 3)];
      out.push(f + suf);
      prev = last;
      last = f;
    }
    return out;
  }

  const api = {
    Cube, FACES, FACE_VEC, SOLVED_SCHEME, COLOR_NAMES, MOVE_DEF,
    parseMove, parseSeq, invertMove, invertSeq, simplify, rotVec, vecFace, randomScramble,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CubeLib = api;
})(typeof window !== 'undefined' ? window : globalThis);
