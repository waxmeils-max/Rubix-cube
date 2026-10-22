/* Hilfe-Assistent „Wo hänge ich?“: Entscheidungsbaum über alle Fälle der Anfängermethode.
 * Knoten mit `options` sind Fragen, Knoten mit `steps` sind Lösungen.
 * `demo` verweist auf ein Beispiel der Anleitung ([Lektion, Fall]) oder beschreibt eines direkt. */
(function (root) {
  'use strict';
  const { invertSeq } = root.CubeLib;
  const { ALG } = root.Solver;
  const inv = (s) => invertSeq(s).join(' ');

  const HOLD = 'Halte den Würfel immer mit <b>Gelb oben</b> und <b>Weiß unten</b>.';

  const NODES = {
    start: {
      phase: null,
      q: `${HOLD} Schau dir die <b>weiße Seite unten</b> an: Ist sie komplett weiß, und passt die <b>unterste Reihe</b> jeder Seite zu ihrer Mitte?`,
      options: [
        ['Ja, die weiße Ebene ist fertig', 'middle'],
        ['Nein', 'cross'],
      ],
    },

    /* ---------- Gänseblümchen + Kreuz ---------- */
    cross: {
      phase: 'cross',
      q: 'Gibt es unten schon ein <b>weißes Kreuz</b> (die vier weißen Kanten zeigen nach unten)?',
      options: [
        ['Ja, und die Seitenfarben passen zu den Mitten', 'corners'],
        ['Ja, aber Seitenfarben passen nicht', 'crossFix'],
        ['Nein', 'daisy'],
      ],
    },
    crossFix: {
      phase: 'cross',
      title: 'Kreuz fertig, aber Seitenfarben falsch',
      steps: [
        'Drehe zuerst nur die <b>untere Ebene (D)</b>. Oft passen dann alle vier oder zumindest zwei Kanten.',
        'Passen alle vier: fertig, weiter mit den Ecken.',
        'Passen nur zwei: Nimm eine falsche Kante nach vorne und hole sie mit <b>F2</b> nach oben. Drehe die obere Ebene (U), bis ihre Seitenfarbe über ihrer Mitte steht, Seite nach vorne, <b>F2</b>. Mit der anderen falschen Kante genauso.',
      ],
      demo: { title: 'Zwei Kanten vertauscht: hoch, tauschen, runter', base: 'solved', setup: 'F2 B2 U2 F2 B2', mask: 'daisy', demo: 'F2 B2 U2 F2 B2', view: 'low' },
    },
    daisy: {
      phase: 'daisy',
      q: 'Sind oben um die gelbe Mitte schon alle <b>vier weißen Kanten</b> mit Weiß nach oben (Gänseblümchen)?',
      options: [
        ['Ja, das Gänseblümchen ist fertig', 'crossAlign'],
        ['Nein, es fehlen noch welche', 'daisyWhere'],
      ],
    },
    crossAlign: {
      phase: 'cross',
      title: 'Blütenblätter nach unten klappen',
      steps: [
        'Schau auf die <b>Seitenfarbe</b> eines Blütenblatts.',
        'Drehe die obere Ebene (U), bis diese Seitenfarbe genau über der <b>gleichfarbigen Mitte</b> steht.',
        'Diese Seite nach vorne nehmen und <b>F2</b>. Die Kante wandert nach unten.',
        'Mit allen vier Blütenblättern wiederholen.',
      ],
      demo: ['cross', 0],
    },
    daisyWhere: {
      phase: 'daisy',
      q: 'Such dir eine weiße Kante, die noch kein Blütenblatt ist. Nimm sie nach vorne (ganzen Würfel drehen). <b>Wo liegt sie, und wohin zeigt Weiß?</b>',
      options: [
        ['Mittlere Ebene, Weiß zeigt nach vorne', 'daisyMidFront'],
        ['Mittlere Ebene, Weiß zeigt zur Seite', 'daisyMidSide'],
        ['Unten, Weiß zeigt nach unten', 'daisyDownDown'],
        ['Unten, Weiß zeigt nach vorne', 'daisyDownFront'],
        ['Oben, aber Weiß zeigt zur Seite', 'daisyTopSide'],
      ],
    },
    daisyMidFront: {
      phase: 'daisy',
      title: 'Kante in der Mitte, Weiß zeigt nach vorne',
      steps: [
        'Halte die Kante <b>vorne rechts</b> (Weiß zeigt zu dir).',
        'Schau, ob oben rechts schon ein Blütenblatt sitzt. Wenn ja: obere Ebene drehen (U), bis dort frei ist.',
        '<b>R</b> – die Kante kommt mit Weiß nach oben.',
        'Liegt sie vorne <b>links</b>: Platz oben links frei machen und <b>L\'</b>.',
      ],
      demo: ['daisy', 0],
    },
    daisyMidSide: {
      phase: 'daisy',
      title: 'Kante in der Mitte, Weiß zeigt zur Seite',
      steps: [
        'Halte die Kante <b>vorne rechts</b>, Weiß zeigt nach rechts.',
        'Platz <b>oben vorne</b> frei machen (U drehen, falls dort ein Blütenblatt sitzt).',
        '<b>F\'</b> – die Kante klappt nach oben, Weiß zeigt nach oben.',
        'Liegt sie vorne <b>links</b> mit Weiß nach links: Platz oben vorne frei machen und <b>F</b>.',
      ],
      demo: ['daisy', 1],
    },
    daisyDownDown: {
      phase: 'daisy',
      title: 'Kante unten, Weiß zeigt nach unten',
      steps: [
        'Halte die Kante <b>unten vorne</b>.',
        'Platz <b>oben vorne</b> frei machen (U drehen, falls besetzt).',
        '<b>F2</b> – die Kante kommt direkt mit Weiß nach oben.',
      ],
      demo: ['daisy', 2],
    },
    daisyDownFront: {
      phase: 'daisy',
      title: 'Kante unten, Weiß zeigt nach vorne',
      steps: [
        'Halte die Kante <b>unten vorne</b>. Platz oben vorne frei machen.',
        '<b>F</b> – jetzt steckt sie in der Mitte vorne links, Weiß zeigt nach vorne.',
        'Platz <b>oben links</b> frei machen (U drehen).',
        '<b>L\'</b> – die Kante kommt mit Weiß nach oben.',
      ],
      demo: ['daisy', 3],
    },
    daisyTopSide: {
      phase: 'daisy',
      title: 'Kante oben, aber gekippt',
      steps: [
        'Halte die Kante <b>oben vorne</b> (Weiß zeigt zu dir).',
        '<b>F</b> – jetzt steckt sie in der Mitte vorne rechts, Weiß zeigt nach vorne.',
        'Platz <b>oben rechts</b> frei machen (U drehen).',
        '<b>R</b> – die Kante kommt richtig herum nach oben.',
      ],
      demo: ['daisy', 4],
    },

    /* ---------- Weiße Ecken ---------- */
    corners: {
      phase: 'corners',
      q: 'Such dir eine <b>weiße Ecke</b>, die noch nicht richtig sitzt. Wo ist sie?',
      options: [
        ['Oben in der gelben Ebene', 'cornerTop'],
        ['Unten am richtigen Platz, aber verdreht', 'cornerTwisted'],
        ['Unten an einem falschen Platz', 'cornerWrong'],
        ['Alle weißen Ecken sitzen schon', 'middle'],
      ],
    },
    cornerTop: {
      phase: 'corners',
      q: 'Halte den <b>Zielplatz</b> der Ecke (zwischen den Mitten ihrer zwei anderen Farben) <b>vorne rechts unten</b>. Drehe die obere Ebene, bis die Ecke <b>genau darüber</b> steht. <b>Wohin zeigt Weiß?</b>',
      options: [
        ['Nach rechts', 'cornerTopR'],
        ['Nach vorne (zu mir)', 'cornerTopF'],
        ['Nach oben', 'cornerTopU'],
      ],
    },
    cornerTopR: { phase: 'corners', title: 'Ecke oben, Weiß zeigt nach rechts', steps: ['Ecke über ihrem Platz (vorne rechts oben).', '<b>1× R U R\' U\'</b> – fertig.'], demo: ['corners', 0] },
    cornerTopU: { phase: 'corners', title: 'Ecke oben, Weiß zeigt nach oben', steps: ['Ecke über ihrem Platz (vorne rechts oben).', '<b>3× R U R\' U\'</b>.'], demo: ['corners', 1] },
    cornerTopF: { phase: 'corners', title: 'Ecke oben, Weiß zeigt nach vorne', steps: ['Ecke über ihrem Platz (vorne rechts oben).', '<b>5× R U R\' U\'</b>.'], demo: ['corners', 2] },
    cornerTwisted: {
      phase: 'corners',
      q: 'Halte die Ecke <b>vorne rechts unten</b>. Wohin zeigt Weiß?',
      options: [
        ['Nach vorne (zu mir)', 'cornerTwF'],
        ['Nach rechts', 'cornerTwR'],
      ],
    },
    cornerTwF: { phase: 'corners', title: 'Ecke unten verdreht, Weiß zeigt nach vorne', steps: ['Ecke vorne rechts unten halten.', '<b>4× R U R\' U\'</b> – dann zeigt Weiß nach unten.'], demo: ['corners', 3] },
    cornerTwR: { phase: 'corners', title: 'Ecke unten verdreht, Weiß zeigt nach rechts', steps: ['Ecke vorne rechts unten halten.', '<b>2× R U R\' U\'</b> – dann zeigt Weiß nach unten.'], demo: ['corners', 4] },
    cornerWrong: {
      phase: 'corners',
      title: 'Ecke steckt unten am falschen Platz',
      steps: [
        'Halte die Ecke <b>vorne rechts unten</b>.',
        '<b>1× R U R\' U\'</b> – damit kommt sie nach oben.',
        'Jetzt ist es der Fall „Ecke oben“: Zielplatz nach vorne rechts, Ecke darüber drehen, R U R\' U\' wiederholen, bis sie sitzt.',
      ],
      demo: ['corners', 5],
    },

    /* ---------- Zweite Ebene ---------- */
    middle: {
      phase: 'middle',
      q: 'Ist die <b>mittlere Ebene</b> fertig – passt auf <b>jeder</b> Seite die ganze mittlere Reihe zur Mitte? (Eine Kante sitzt nur richtig, wenn <b>beide</b> Farben passen.)',
      options: [
        ['Ja', 'ycross'],
        ['Nein', 'midTop'],
      ],
    },
    midTop: {
      phase: 'middle',
      q: 'Gibt es oben eine Kante <b>ohne Gelb</b> (beide Farben nicht gelb)?',
      options: [
        ['Ja', 'midDir'],
        ['Nein, alle oberen Kanten haben Gelb', 'midStuck'],
        ['Ja, aber erst steckt eine falsche Kante in der Mitte', 'midStuck'],
      ],
    },
    midDir: {
      phase: 'middle',
      q: 'Drehe die obere Ebene, bis die <b>Seitenfarbe</b> der Kante über der gleichen Mitte steht (umgedrehtes T). Diese Seite nach vorne. Die <b>obere Farbe</b> der Kante passt zu …',
      options: [
        ['… der rechten Mitte', 'midRight'],
        ['… der linken Mitte', 'midLeft'],
      ],
    },
    midRight: { phase: 'middle', title: 'Kante nach rechts einsetzen', steps: ['Umgedrehtes T vorne, obere Farbe passt nach rechts.', '<b>U R U\' R\' U\' F\' U F</b>'], demo: ['middle', 0], alg: ALG.right },
    midLeft: { phase: 'middle', title: 'Kante nach links einsetzen', steps: ['Umgedrehtes T vorne, obere Farbe passt nach links.', '<b>U\' L\' U L U F U\' F\'</b>'], demo: ['middle', 1], alg: ALG.left },
    midStuck: {
      phase: 'middle',
      title: 'Kante steckt falsch in der Mitte',
      steps: [
        'Eine Kante sitzt in der mittleren Ebene am <b>falschen Platz</b> oder <b>verdreht</b> (Farben vertauscht). Das gilt auch, wenn <b>eine</b> ihrer Farben schon zur Mitte passt, die andere aber nicht.',
        'Steckt sie <b>vorne rechts</b>: einmal <b>U R U\' R\' U\' F\' U F</b>. Steckt sie <b>vorne links</b>: einmal <b>U\' L\' U L U F U\' F\'</b> – egal, was oben liegt. Jetzt ist sie oben.',
        'Dann normal einsetzen: umgedrehtes T bilden, rechts oder links einsetzen.',
      ],
      demo: ['middle', 2],
    },

    /* ---------- Gelbes Kreuz ---------- */
    ycross: {
      phase: 'ycross',
      q: 'Schau oben nur auf die <b>Kanten</b> (nicht die Ecken). Was siehst du in Gelb?',
      options: [
        ['Nur die Mitte (Punkt)', 'ycDot'],
        ['Winkel (L-Form)', 'ycL'],
        ['Linie', 'ycLine'],
        ['Drei gelbe Kanten (T-Form)', 'ycThree'],
        ['Gelbes Kreuz', 'yedges'],
      ],
    },
    ycDot: { phase: 'ycross', title: 'Punkt', steps: ['Von beliebiger Seite: <b>F R U R\' U\' F\'</b>.', 'Danach hast du einen Winkel – weiter wie beim Winkel.'], demo: ['ycross', 0] },
    ycL: { phase: 'ycross', title: 'Winkel', steps: ['Obere Ebene drehen, bis der Winkel <b>hinten links</b> liegt (Kanten hinten und links gelb).', '<b>F R U R\' U\' F\'</b> → Linie.', 'Linie waagerecht legen, nochmal <b>F R U R\' U\' F\'</b> → Kreuz.'], demo: ['ycross', 1] },
    ycLine: { phase: 'ycross', title: 'Linie', steps: ['Obere Ebene drehen, bis die Linie <b>waagerecht</b> liegt (von links nach rechts).', '<b>F R U R\' U\' F\'</b> → Kreuz.'], demo: ['ycross', 2] },
    ycThree: {
      phase: 'middle',
      title: 'Drei gelbe Kanten – das geht eigentlich nicht',
      steps: [
        'Drei gelbe Kanten oben gibt es nur, wenn die <b>zweite Ebene nicht fertig</b> ist.',
        'Die Kante oben <b>ohne Gelb</b> gehört in die mittlere Ebene – setze sie mit dem Rechts- oder Links-Algorithmus ein (Schritt 4).',
        'Steckt eine Kante in der Mitte falsch: vorne rechts halten, einmal <b>U R U\' R\' U\' F\' U F</b>, dann einsetzen.',
        'Sieht die zweite Ebene wirklich komplett richtig aus, wurde eine Kante falsch herum eingebaut. Dann hilft nur Herausnehmen und Umdrehen.',
      ],
      demo: ['middle', 2],
    },

    /* ---------- Gelbe Kanten ---------- */
    yedges: {
      phase: 'yedges',
      q: 'Drehe die obere Ebene (U), bis <b>möglichst viele</b> gelbe Kanten mit ihrer Seitenfarbe zur Mitte darunter passen. Wie viele passen?',
      options: [
        ['Alle vier', 'ycorners'],
        ['Zwei nebeneinander', 'yeAdj'],
        ['Zwei gegenüber', 'yeOpp'],
        ['Nur eine oder keine – egal wie ich drehe', 'yeLess'],
      ],
    },
    yeAdj: { phase: 'yedges', title: 'Zwei passende Kanten nebeneinander', steps: ['Halte den Würfel so, dass die zwei passenden Kanten <b>hinten und rechts</b> sind.', '<b>R U R\' U R U2 R\' U</b>.', 'Danach passen alle vier (eventuell noch oben ausrichten).'], demo: ['yedges', 0] },
    yeOpp: { phase: 'yedges', title: 'Zwei passende Kanten gegenüber', steps: ['Von beliebiger Seite: <b>R U R\' U R U2 R\' U</b>.', 'Obere Ebene drehen, bis zwei nebeneinander passen → dann wie „nebeneinander“.'], demo: ['yedges', 1] },
    yeLess: { phase: 'yedges', title: 'Weniger als zwei passen', steps: ['Drehe die obere Ebene noch einmal langsam einmal ganz herum – bei einer der vier Stellungen passen <b>immer mindestens zwei</b>.', 'Dann je nach Lage „nebeneinander“ oder „gegenüber“.'], demo: ['yedges', 1] },

    /* ---------- Gelbe Ecken ---------- */
    ycorners: {
      phase: 'ycorners',
      q: 'Wie viele gelbe Ecken sind am <b>richtigen Platz</b>? (Ihre drei Farben passen zu den drei Mitten drumherum – <b>wie</b> sie gedreht ist, ist egal.)',
      options: [
        ['Alle vier', 'yorient'],
        ['Genau eine', 'ycoOne'],
        ['Keine', 'ycoNone'],
        ['Zwei oder drei', 'ycoCheck'],
      ],
    },
    ycoOne: { phase: 'ycorners', title: 'Eine Ecke am richtigen Platz', steps: ['Halte die richtige Ecke <b>vorne rechts oben</b>.', '<b>U R U\' L\' U R\' U\' L</b>.', 'Passen noch nicht alle: gleiche Haltung, nochmal.'], demo: ['ycorners', 0] },
    ycoNone: { phase: 'ycorners', title: 'Keine Ecke am richtigen Platz', steps: ['Von beliebiger Seite: <b>U R U\' L\' U R\' U\' L</b>.', 'Jetzt ist genau eine richtig → wie „genau eine“.'], demo: { title: 'Keine Ecke passt', base: 'solved', setup: `${inv(ALG.niklas)} y' ${inv(ALG.niklas)} y`, mask: 'all', demo: 'auto', phase: 'ycorners' } },
    ycoCheck: { phase: 'ycorners', title: 'Zwei oder drei – bitte nochmal prüfen', steps: ['Bei fertigen gelben Kanten sind immer <b>0, 1 oder 4</b> Ecken am richtigen Platz.', 'Achte darauf, ob die drei Farben der Ecke zu den drei <b>Mitten</b> drumherum passen – nicht zu den Nachbarsteinen.', 'Prüfe außerdem, ob die gelben Kanten wirklich alle passen.'] },

    yorient: {
      phase: 'yorient',
      q: 'Zeigt bei <b>allen</b> Ecken Gelb nach oben?',
      options: [
        ['Ja', 'auf'],
        ['Nein', 'yoTwist'],
      ],
    },
    yoTwist: {
      phase: 'yorient',
      title: 'Gelbe Ecken drehen',
      steps: [
        'Halte eine verdrehte Ecke <b>vorne rechts oben</b>. Ab jetzt den Würfel <b>nicht mehr drehen</b>!',
        '<b>R\' D\' R D</b> wiederholen, bis Gelb dieser Ecke oben ist (2× oder 4×).',
        'Nur die obere Ebene <b>U</b> drehen, bis die nächste verdrehte Ecke vorne rechts oben ist. Wieder R\' D\' R D …',
        'Unten sieht es zwischendurch kaputt aus – <b>weitermachen</b>, nach der letzten Ecke ist alles heil.',
      ],
      demo: ['yorient', 0],
    },
    auf: {
      phase: 'auf',
      title: 'Fast geschafft!',
      steps: ['Drehe die obere Ebene, bis alle Seiten passen. Gelöst! 🎉', 'Sind unten noch Steine durcheinander? Dann wurde in Schritt 8 zwischendurch der ganze Würfel gedreht – bei der letzten verdrehten Ecke weitermachen.'],
    },
  };

  root.Helper = { NODES };
})(window);
