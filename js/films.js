/* Filme: Schritt-für-Schritt-Vorführungen mit Untertiteln und Draufsicht.
 * Jede Szene kann haben: say (Text oder Funktion(cube)), moves (langsam mit Zug-Untertitel),
 * fast (Züge ohne Einzel-Untertitel), focus (Funktion(cube) -> Steine), set (neuer Würfel),
 * wait (ms). Texte, die vom Würfel abhängen, werden live berechnet. */
(function (root) {
  'use strict';
  const { Cube, invertSeq, vecFace, COLOR_NAMES } = root.CubeLib;
  const { ALG } = root.Solver;
  const inv = (s) => invertSeq(s).join(' ');
  const FACE_DE = { F: 'vorne', B: 'hinten', L: 'links', R: 'rechts' };

  /** Gelbe Kanten oben, deren Seitenfarbe zur Mitte darunter passt. */
  function yMatches(c) {
    return c.cubies
      .filter((q) => q.st.length === 2 && q.st.some((s) => s.c === 'Y'))
      .filter((q) => q.st.every((s) => c.center(vecFace(s.d)) === s.c))
      .map((q) => ({ key: q.st.map((s) => s.c).sort().join(''), face: vecFace([q.pos[0], 0, q.pos[2]]), color: q.st.find((s) => s.c !== 'Y').c }));
  }
  const yEdges = (c) => c.cubies.filter((q) => q.st.length === 2 && q.st.some((s) => s.c === 'Y')).map((q) => q.st.map((s) => s.c).sort().join(''));
  const names = (list) => list.map((m) => `<b>${COLOR_NAMES[m.color]}</b> (${FACE_DE[m.face]})`).join(' und ');
  const countText = (c) => {
    const m = yMatches(c);
    if (!m.length) return 'Es passt <b>keine</b> Kante.';
    if (m.length === 1) return `Es passt nur <b>eine</b>: ${names(m)}.`;
    if (m.length === 4) return 'Es passen <b>alle vier</b>!';
    const opp = (m[0].face === 'F' && m[1].face === 'B') || (m[0].face === 'B' && m[1].face === 'F') || (m[0].face === 'L' && m[1].face === 'R') || (m[0].face === 'R' && m[1].face === 'L');
    return `Es passen <b>zwei</b>: ${names(m)} – sie liegen <b>${opp ? 'gegenüber' : 'nebeneinander'}</b>.`;
  };

  const FILMS = {
    yedges: {
      title: 'Schritt 6: Gelbe Kanten ausrichten',
      topview: true,
      start: () => new Cube().apply(`${inv(ALG.sune)} y2 U2`),
      scenes: [
        { say: 'Gelb ist oben, <b>Blau vorne</b>. Das gelbe Kreuz ist schon fertig.', focus: yEdges, wait: 3500 },
        { say: 'Jede gelbe Kante hat noch eine <b>zweite Farbe an der Seite</b>. Die soll zur <b>Mitte darunter</b> passen.', focus: yEdges, wait: 4000 },
        { say: 'Rechts in der <b>Draufsicht</b> siehst du es für alle vier Seiten: ✓ = passt, ✗ = passt nicht.', wait: 4500 },
        { say: (c) => `Jetzt: ${countText(c)} Also drehen wir <b>nur die obere Ebene</b> und zählen neu.`, focus: (c) => yMatches(c).map((m) => m.key), wait: 4000 },
        { moves: 'U', after: (c) => `Nach einem U: ${countText(c)} Noch nicht genug – weiter drehen.`, focus: (c) => yMatches(c).map((m) => m.key), wait: 4000 },
        { moves: 'U', after: (c) => `Nach noch einem U: ${countText(c)}`, focus: (c) => yMatches(c).map((m) => m.key), wait: 4500 },
        { say: 'Die zwei passenden Kanten müssen <b>hinten und rechts</b> liegen. Gerade sind sie vorne und links.', focus: (c) => yMatches(c).map((m) => m.key), wait: 4500 },
        { say: 'Also den <b>ganzen Würfel</b> eine halbe Drehung drehen (y2). Gelb bleibt oben.', fast: 'y2', focus: (c) => yMatches(c).map((m) => m.key), wait: 1500 },
        { say: (c) => `Jetzt passt es: ${names(yMatches(c))}. Grün ist vorne.`, focus: (c) => yMatches(c).map((m) => m.key), wait: 4000 },
        { say: 'Jetzt kommt der Algorithmus, ganz langsam: <b>R U R\' U R U2 R\' U</b>', wait: 3500 },
        { moves: ALG.sune },
        { say: (c) => `Fertig! ${countText(c)} Schritt 6 ist geschafft.`, focus: yEdges, wait: 4500 },

        { set: () => new Cube().apply("U' R U2 R' U' R U' R' U y U' R U2 R' U' R U' R' y'"), say: 'Jetzt der <b>andere Fall</b>: Grün ist vorne.', focus: (c) => yMatches(c).map((m) => m.key), wait: 3500 },
        { say: (c) => `${countText(c)} Das ist der Fall „gegenüber“.`, focus: (c) => yMatches(c).map((m) => m.key), wait: 5000 },
        { say: 'Bei „gegenüber“ machst du den Algorithmus <b>einmal</b> – egal, wie du den Würfel hältst.', wait: 4000 },
        { fast: ALG.sune, say: 'R U R\' U R U2 R\' U …', wait: 800 },
        { say: (c) => `Danach: ${countText(c)} Wieder die obere Ebene drehen und zählen.`, wait: 4000 },
        { moves: 'U', after: (c) => `Nach einem U: ${countText(c)}`, focus: (c) => yMatches(c).map((m) => m.key), wait: 4500 },
        { say: 'Jetzt ist es der Fall „nebeneinander“. Die zwei nach <b>hinten und rechts</b> drehen …', fast: 'y', focus: (c) => yMatches(c).map((m) => m.key), wait: 2500 },
        { say: '… und den Algorithmus noch einmal.', wait: 2000 },
        { fast: ALG.sune, say: 'R U R\' U R U2 R\' U …', wait: 800 },
        { say: (c) => `${countText(c)} Weiter geht es mit Schritt 7: den gelben Ecken.`, focus: yEdges, wait: 5000 },
      ],
    },
  };

  root.Films = { FILMS, yMatches };
})(window);
