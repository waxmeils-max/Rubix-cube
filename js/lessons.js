/* Inhalte der Anleitung. Jeder Fall hat eine Ausgangslage (base + setup),
 * eine Maske (welche Farben sichtbar sind) und eine Vorführung (demo). */
(function (root) {
  'use strict';
  const { invertSeq } = root.CubeLib;
  const { ALG } = root.Solver;
  const inv = (s) => invertSeq(s).join(' ');
  const rep = (s, n) => Array(n).fill(s).join(' ');

  const MASKS = {
    daisy: (key, c) => key.length === 1 || (key.length === 2 && key.includes('W')),
    corners: (key) => key.length === 1 || key.includes('W'),
    middle: (key) => key.length === 1 || !key.includes('Y'),
    ytop: (key, c) => key.length === 1 || !key.includes('Y') || c === 'Y',
    all: () => true,
  };
  const BASES = {
    solved: '',
    daisy: 'F2 R2 B2 L2',
  };

  const LESSONS = [
    {
      id: 'basics',
      title: 'Grundlagen: So ist der Würfel aufgebaut',
      html: `
        <p>Bevor es losgeht, drei Dinge, die alles viel leichter machen:</p>
        <ul>
          <li><b>Mittelsteine</b> (die Mitte jeder Seite) bewegen sich nie gegeneinander. Die gelbe Mitte ist immer gegenüber der weißen, grün gegenüber blau, rot gegenüber orange. <b>Die Mitte bestimmt die Farbe ihrer Seite.</b></li>
          <li><b>Kanten</b> haben 2 Farben, <b>Ecken</b> haben 3. Es gibt also nicht „ein weißes Feld“, das man verschiebt – man bewegt immer ganze Steine. Eine weiß-rote Kante gehört zwischen die weiße und die rote Mitte.</li>
          <li>Wir lösen <b>Schicht für Schicht</b>: erst die weiße Ebene (unten), dann die mittlere Ebene, dann die gelbe Ebene (oben).</li>
        </ul>
        <p><b>So hältst du den Würfel bei dieser Anleitung:</b> Gelb oben, Weiß unten. Die Vorderseite wechselt – die Erklärungen sagen dir immer, welche Seite vorne sein soll. Die Zug-Buchstaben (R, U, F …) erklärt der Reiter <b>Notation</b>.</p>`,
      cases: [
        { title: 'Gelöster Würfel', text: 'Gelb oben, Grün vorne, Orange rechts. Zieh mit der Maus/dem Finger, um ihn von allen Seiten anzusehen.', base: 'solved', setup: '', mask: 'all', demo: "y y y y" },
      ],
    },
    {
      id: 'daisy',
      phase: 'daisy',
      title: 'Schritt 1: Das Gänseblümchen',
      html: `
        <p><b>Ziel:</b> Die vier weißen Kanten kommen nach <b>oben um die gelbe Mitte</b>, mit Weiß nach oben. Das sieht aus wie eine Blume mit gelber Mitte und vier weißen Blütenblättern.</p>
        <p>Warum nicht gleich das weiße Kreuz unten? Weil man oben sieht, was man tut, und dabei kaum etwas kaputt machen kann. Im nächsten Schritt klappen wir die Blütenblätter einfach nach unten.</p>
        <p><b>Goldene Regel:</b> Bevor du eine Kante nach oben drehst, schau, ob an dem Platz oben schon ein weißes Blütenblatt sitzt. Wenn ja, drehe vorher die <b>obere Ebene (U)</b>, damit dort Platz ist – die Blütenblätter oben bleiben dabei Blütenblätter.</p>`,
      cases: [
        { title: 'Kante in der Mitte, Weiß zeigt nach vorne', text: 'Die Kante steckt vorne rechts, Weiß schaut dich an. Die <b>rechte Seite hochdrehen (R)</b> – fertig.', base: 'daisy', setup: "R'", mask: 'daisy', demo: 'R' },
        { title: 'Kante in der Mitte, Weiß zeigt zur Seite', text: 'Weiß zeigt nach rechts. Dann die <b>Vorderseite</b> so drehen, dass die Kante nach oben klappt: <b>F\'</b>.', base: 'daisy', setup: 'F', mask: 'daisy', demo: "F'" },
        { title: 'Kante unten, Weiß zeigt nach unten', text: 'Liegt eine weiße Kante unten mit Weiß nach unten, holt sie eine halbe Drehung (<b>F2</b>) direkt nach oben.', base: 'daisy', setup: 'F2', mask: 'daisy', demo: 'F2' },
        { title: 'Kante unten, Weiß zeigt nach außen', text: 'Die Kante ist „verkehrt herum“. Erst <b>F</b> – jetzt steckt sie in der mittleren Ebene links. Platz oben links freimachen (<b>U</b>) und mit <b>L\'</b> hochholen.', base: 'daisy', setup: inv("F U L'"), mask: 'daisy', demo: "F U L'" },
        { title: 'Kante oben, aber gekippt', text: 'Die Kante ist schon oben, nur zeigt Weiß zur Seite. <b>F</b> dreht sie in die Mitte, <b>U\'</b> macht rechts Platz, <b>R</b> holt sie richtig herum hoch.', base: 'daisy', setup: inv("F U' R"), mask: 'daisy', demo: "F U' R" },
        { title: 'Platz besetzt? Erst oben drehen!', text: 'Hier würde R ein fertiges Blütenblatt rechts oben herausschlagen. Also zuerst <b>U\'</b>, bis oben rechts frei ist, dann <b>R</b>.', base: 'daisy', setup: inv("U' R"), mask: 'daisy', demo: "U' R" },
      ],
    },
    {
      id: 'cross',
      phase: 'cross',
      title: 'Schritt 2: Das weiße Kreuz',
      html: `
        <p><b>Ziel:</b> Unten ein weißes Kreuz, bei dem auch die <b>Seitenfarben</b> jeder Kante zu ihrer Mitte passen (weiß-rote Kante über der roten Mitte usw.).</p>
        <ol>
          <li>Schau dir ein Blütenblatt an: Es hat außer Weiß eine zweite Farbe an der Seite.</li>
          <li>Drehe die <b>obere Ebene</b>, bis diese Seitenfarbe genau über der <b>gleichfarbigen Mitte</b> steht.</li>
          <li>Diese Seite nach vorne nehmen und <b>F2</b> – die Kante klappt nach unten, Weiß zeigt nach unten.</li>
          <li>Wiederholen für alle vier Blütenblätter.</li>
        </ol>
        <p class="tip"><b>Häufiger Fehler:</b> Ein weißes Kreuz, bei dem die Seitenfarben <b>nicht</b> passen, ist falsch – damit geht der nächste Schritt nicht. Darum der Umweg übers Gänseblümchen: Dort richtest du jede Kante einzeln an ihrer Mitte aus.</p>`,
      cases: [
        { title: 'Ausrichten und runterklappen', text: 'Die grüne Seite des Blütenblatts steht noch nicht über Grün. Erst <b>U\'</b> zum Ausrichten, dann <b>F2</b>.', base: 'daisy', setup: 'U', mask: 'daisy', demo: "U' F2" },
        { title: 'Fertiges weißes Kreuz (von unten)', text: 'So sieht es richtig aus: Weiß unten als Kreuz, und jede Kante passt seitlich zu ihrer Mitte.', base: 'solved', setup: '', mask: 'daisy', demo: 'x2 x2', view: 'low' },
      ],
    },
    {
      id: 'corners',
      phase: 'corners',
      title: 'Schritt 3: Die weißen Ecken (erste Ebene)',
      html: `
        <p><b>Ziel:</b> Die ganze weiße Seite unten ist fertig und die erste Reihe jeder Seite passt zur Mitte.</p>
        <p>Für jede weiße Ecke (Weiß + zwei andere Farben):</p>
        <ol>
          <li>Finde den <b>Zielplatz</b>: unten, zwischen den beiden Mitten mit ihren anderen Farben. Die weiß-grün-orange Ecke gehört z. B. zwischen Grün und Orange.</li>
          <li>Halte den Würfel so, dass dieser Platz <b>vorne rechts unten</b> ist.</li>
          <li>Drehe die obere Ebene, bis die Ecke <b>genau darüber</b> steht.</li>
          <li>Wiederhole <b>R U R' U'</b>, bis die Ecke richtig sitzt. Je nach Lage 1×, 3× oder 5×.</li>
        </ol>
        <p><b>R U R' U'</b> ist der wichtigste Zug-Ablauf überhaupt – rechts hoch, oben nach links, rechts runter, oben zurück.</p>`,
      cases: [
        { title: 'Ecke oben, Weiß zeigt nach rechts → 1×', text: 'Einmal R U R\' U\' und die Ecke sitzt.', base: 'solved', setup: inv(ALG.sexy), mask: 'corners', demo: ALG.sexy },
        { title: 'Ecke oben, Weiß zeigt nach oben → 3×', text: 'Die Ecke liegt „auf dem Rücken“. Dreimal R U R\' U\'.', base: 'solved', setup: inv(rep(ALG.sexy, 3)), mask: 'corners', demo: rep(ALG.sexy, 3) },
        { title: 'Ecke oben, Weiß zeigt nach vorne → 5×', text: 'Fünfmal R U R\' U\'. (Profis haben hier Abkürzungen – aber 5× funktioniert immer.)', base: 'solved', setup: inv(rep(ALG.sexy, 5)), mask: 'corners', demo: rep(ALG.sexy, 5) },
        { title: 'Ecke unten, Weiß zeigt nach vorne → 4×', text: 'Die Ecke sitzt schon am richtigen Platz (vorne rechts unten), aber Weiß schaut dich an statt nach unten. Gelb oben halten und <b>4× R U R\' U\'</b>.', base: 'solved', setup: inv(rep(ALG.sexy, 4)), mask: 'corners', demo: rep(ALG.sexy, 4) },
        { title: 'Ecke unten, Weiß zeigt nach rechts → 2×', text: 'Richtiger Platz, aber Weiß zeigt nach rechts. Hier reichen <b>2× R U R\' U\'</b>.', base: 'solved', setup: inv(rep(ALG.sexy, 2)), mask: 'corners', demo: rep(ALG.sexy, 2) },
        { title: 'Ecke steckt am falschen Platz unten', text: 'Vorne rechts unten steckt die weiß-grün-rote Ecke – sie gehört aber nach links, und die weiß-grün-orange sitzt dafür links. Halte sie vorne rechts unten und mache <b>einmal R U R\' U\'</b> – das hebelt sie nach oben. Dann wie oben: über ihren Platz drehen und einsetzen.', base: 'solved', setup: "R U R' L' U' L R U R'", mask: 'corners', demo: 'auto' },
      ],
    },
    {
      id: 'middle',
      phase: 'middle',
      title: 'Schritt 4: Die zweite Ebene',
      html: `
        <p><b>Ziel:</b> Die vier Kanten der mittleren Ebene einsetzen. Das sind die Kanten <b>ohne Gelb</b> (z. B. grün-orange).</p>
        <ol>
          <li>Suche oben eine Kante ohne Gelb.</li>
          <li>Drehe die obere Ebene, bis ihre <b>Seitenfarbe über der gleichen Mitte</b> steht – das sieht aus wie ein umgedrehtes „T“. Diese Seite nach vorne nehmen.</li>
          <li>Schau auf die <b>obere Farbe</b> der Kante: Passt sie zur rechten Mitte, muss sie nach rechts, sonst nach links.</li>
        </ol>
        <div class="alg-box"><span>Nach rechts:</span> <code>U R U' R' U' F' U F</code></div>
        <div class="alg-box"><span>Nach links:</span> <code>U' L' U L U F U' F'</code></div>
        <p class="tip"><b>Keine passende Kante oben?</b> Dann steckt eine Kante schon unten in der mittleren Ebene – am falschen Platz oder <b>verdreht</b>. Halte sie vorne rechts und führe den Rechts-Algorithmus mit irgendeiner Kante aus. Dadurch kommt sie nach oben und du kannst sie richtig einsetzen.</p>`,
      cases: [
        { title: 'Kante muss nach rechts', text: 'Grün steht über Grün, oben ist Orange – Orange ist rechts. Also Rechts-Algorithmus.', base: 'solved', setup: inv(ALG.right), mask: 'middle', demo: ALG.right },
        { title: 'Kante muss nach links', text: 'Oben ist Rot – Rot ist links. Also Links-Algorithmus.', base: 'solved', setup: inv(ALG.left), mask: 'middle', demo: ALG.left },
        { title: 'Kante richtig, aber verdreht', text: 'Grün-Orange sitzt vorne rechts, aber die Farben sind vertauscht. Rechts-Algorithmus holt sie raus, dann neu einsetzen.', base: 'solved', setup: `${ALG.right} U2 ${ALG.right}`, mask: 'middle', demo: 'auto' },
      ],
    },
    {
      id: 'ycross',
      phase: 'ycross',
      title: 'Schritt 5: Das gelbe Kreuz',
      html: `
        <p><b>Ziel:</b> Oben ein gelbes Kreuz. Die Ecken sind noch egal, und die Seitenfarben auch.</p>
        <div class="alg-box"><span>Algorithmus:</span> <code>F R U R' U' F'</code></div>
        <p>Schau nur auf die gelben <b>Kanten</b> oben. Es gibt vier Bilder:</p>
        <ul>
          <li><b>Punkt</b> (nur die Mitte ist gelb): Algorithmus einmal → du bekommst einen Winkel.</li>
          <li><b>Winkel</b> (L-Form): so drehen, dass er <b>hinten links</b> liegt, Algorithmus → Linie.</li>
          <li><b>Linie</b>: <b>waagerecht</b> legen, Algorithmus → Kreuz.</li>
          <li><b>Kreuz</b>: fertig!</li>
        </ul>
        <p class="tip"><b>Du siehst genau drei gelbe Kanten oben (T-Form) oder eine Kante ohne Gelb oben?</b> Dann ist die zweite Ebene noch nicht fertig: Eine Mittelkante liegt noch oben, und dafür steckt eine gelbe Kante unten in der mittleren Ebene. Setze zuerst die Kante ohne Gelb wie in Schritt 4 ein. Danach siehst du Punkt, Winkel, Linie oder Kreuz.</p>`,
      cases: [
        { title: 'Punkt', text: 'Kein Kantenstein oben ist gelb. Algorithmus aus beliebiger Richtung, dann weiter wie beim Winkel.', base: 'solved', setup: `${inv(ALG.ycross + ' ' + ALG.ycross)} U2 ${inv(ALG.ycross)}`, mask: 'ytop', demo: 'auto', view: 'top' },
        { title: 'Winkel (hinten links)', text: 'Der Winkel zeigt nach hinten links: F R U R\' U\' F\' macht eine Linie daraus, nochmal → Kreuz.', base: 'solved', setup: inv(ALG.ycross + ' ' + ALG.ycross), mask: 'ytop', demo: 'auto', view: 'top' },
        { title: 'Linie (waagerecht)', text: 'Die Linie liegt von links nach rechts: einmal F R U R\' U\' F\' und das Kreuz ist da.', base: 'solved', setup: inv(ALG.ycross), mask: 'ytop', demo: ALG.ycross, view: 'top' },
      ],
    },
    {
      id: 'yedges',
      phase: 'yedges',
      title: 'Schritt 6: Gelbe Kanten ausrichten',
      html: `
        <p><b>Ziel:</b> Die Seitenfarben der gelben Kanten sollen zu ihren Mitten passen.</p>
        <ol>
          <li>Drehe die obere Ebene, bis mindestens <b>zwei</b> Kanten passen.</li>
          <li>Liegen die zwei passenden <b>nebeneinander</b>: Würfel so halten, dass sie <b>hinten und rechts</b> sind, dann Algorithmus.</li>
          <li>Liegen sie <b>gegenüber</b>: Algorithmus einmal von irgendwo, dann sind zwei nebeneinander → wie oben.</li>
        </ol>
        <div class="alg-box"><span>Algorithmus:</span> <code>R U R' U R U2 R' U</code></div>`,
      cases: [
        { title: 'Zwei passen nebeneinander', text: 'Hinten (blau) und rechts (orange) passen, vorne und links sind vertauscht.', base: 'solved', setup: inv(ALG.sune), mask: 'all', demo: ALG.sune },
        { title: 'Zwei passen gegenüber', text: 'Erst einmal den Algorithmus, dann liegt der Fall „nebeneinander“ vor.', base: 'solved', setup: `${inv(ALG.sune)} U' ${inv(ALG.sune)}`, mask: 'all', demo: 'auto' },
      ],
    },
    {
      id: 'ycorners',
      phase: 'ycorners',
      title: 'Schritt 7: Gelbe Ecken an ihren Platz',
      html: `
        <p><b>Ziel:</b> Jede gelbe Ecke steht an ihrem richtigen Platz – <b>gedreht sein darf sie noch</b>. Eine Ecke ist am richtigen Platz, wenn ihre drei Farben zu den drei Mitten drumherum passen (die Reihenfolge ist egal).</p>
        <ol>
          <li>Suche eine Ecke, die schon am richtigen Platz ist, und halte sie <b>vorne rechts oben</b>.</li>
          <li>Algorithmus ausführen – die anderen drei Ecken wandern im Kreis. Eventuell ein zweites Mal.</li>
          <li>Ist keine Ecke richtig: Algorithmus einmal von irgendwo, dann gibt es eine.</li>
        </ol>
        <div class="alg-box"><span>Algorithmus:</span> <code>U R U' L' U R' U' L</code></div>`,
      cases: [
        { title: 'Eine Ecke passt (vorne rechts)', text: 'Die Ecke vorne rechts ist richtig, die anderen drei wandern einmal im Kreis.', base: 'solved', setup: inv(ALG.niklas), mask: 'all', demo: ALG.niklas },
      ],
    },
    {
      id: 'yorient',
      phase: 'yorient',
      title: 'Schritt 8: Gelbe Ecken drehen',
      html: `
        <p><b>Ziel:</b> Alle Ecken zeigen Gelb nach oben – dann ist der Würfel gelöst.</p>
        <ol>
          <li>Halte eine verdrehte Ecke <b>vorne rechts oben</b>. Ab jetzt den ganzen Würfel <b>nicht mehr drehen!</b></li>
          <li>Wiederhole <b>R' D' R D</b>, bis Gelb dieser Ecke oben ist (2× oder 4×).</li>
          <li>Drehe nur die <b>obere Ebene (U)</b>, bis die nächste verdrehte Ecke vorne rechts ist. Wieder R' D' R D …</li>
          <li>Am Ende die obere Ebene ausrichten – fertig!</li>
        </ol>
        <p class="tip"><b>Keine Panik:</b> Während dieses Schritts sehen die unteren Ebenen völlig zerstört aus. Das ist normal! Sie reparieren sich von selbst, sobald die letzte Ecke gedreht ist. Der häufigste Fehler ist, hier den ganzen Würfel zu drehen oder mittendrin aufzuhören.</p>`,
      cases: [
        { title: 'Zwei Ecken verdreht', text: 'Vorne rechts: 2× R\' D\' R D. Dann U, die nächste Ecke: 4× R\' D\' R D. Zum Schluss U\'.', base: 'solved', setup: inv(`${rep(ALG.twist, 2)} U ${rep(ALG.twist, 4)} U'`), mask: 'all', demo: `${rep(ALG.twist, 2)} U ${rep(ALG.twist, 4)} U'` },
      ],
    },
    {
      id: 'trouble',
      title: 'Hilfe: Steine liegen komisch – was tun?',
      html: `
        <p>Die meisten „Ich hänge fest“-Momente sind einer dieser Fälle. Die Regel dahinter ist immer gleich: <b>Liegt ein Stein an einer Stelle, an der der normale Algorithmus nicht greift, holst du ihn zuerst mit genau diesem Algorithmus heraus</b> – und setzt ihn dann richtig ein.</p>
        <table class="trouble">
          <thead><tr><th>Situation</th><th>Lösung</th></tr></thead>
          <tbody>
            <tr><td>Gänseblümchen: Weiße Kante unten, Weiß zeigt nach außen</td><td>Kante nach vorne nehmen, <code>F</code> (jetzt in der Mitte), Platz oben links frei drehen, <code>L'</code>.</td></tr>
            <tr><td>Gänseblümchen: Kante ist oben, aber Weiß zeigt zur Seite</td><td>Nach vorne nehmen, <code>F</code>, oben rechts Platz machen, <code>R</code>.</td></tr>
            <tr><td>Gänseblümchen: Ich würde ein fertiges Blütenblatt rausdrehen</td><td>Vorher die obere Ebene <code>U</code> drehen, bis der Platz frei ist.</td></tr>
            <tr><td>Weißes Kreuz fertig, aber Seitenfarben passen nicht</td><td>Zurück zum Gänseblümchen: Falsche Kante mit <code>F2</code> nach oben holen, richtig ausrichten, wieder <code>F2</code>.</td></tr>
            <tr><td>Weiße Ecke sitzt unten am falschen Platz</td><td>Vorne rechts halten, einmal <code>R U R' U'</code> – jetzt ist sie oben. Über ihren Platz drehen und einsetzen.</td></tr>
            <tr><td>Weiße Ecke ist unten am richtigen Platz, aber verdreht</td><td>Gelb oben halten, Ecke vorne rechts unten. Weiß zeigt nach vorne: <code>R U R' U'</code> 4×. Weiß zeigt nach rechts: 2×.</td></tr>
            <tr><td>Zweite Ebene: Keine Kante ohne Gelb ist oben</td><td>Eine Kante steckt falsch in der Mitte. Vorne rechts halten, Rechts-Algorithmus <code>U R U' R' U' F' U F</code> → sie kommt nach oben.</td></tr>
            <tr><td>Zweite Ebene: Kante ist am richtigen Platz, aber verdreht</td><td>Genau so: mit dem Rechts-Algorithmus herausholen, dann neu einsetzen.</td></tr>
            <tr><td>Gelbes Kreuz: Ich bekomme immer nur Linie/Winkel</td><td>Achte auf die Lage: Winkel <b>hinten links</b>, Linie <b>waagerecht</b>. Die Ecken sind dabei egal.</td></tr>
            <tr><td>Gelbes Kreuz: Oben zeigen genau drei gelbe Kanten nach oben</td><td>Das geht nur, wenn die zweite Ebene noch nicht fertig ist. Die Kante oben ohne Gelb gehört in die mittlere Ebene: mit dem Rechts- oder Links-Algorithmus einsetzen. Sieht die zweite Ebene wirklich komplett aus, ist eine Kante falsch herum eingebaut.</td></tr>
            <tr><td>Gelbe Kanten: Es passen nie zwei nebeneinander</td><td>Wenn zwei gegenüber passen: einmal <code>R U R' U R U2 R' U</code> von irgendeiner Seite, dann nochmal suchen.</td></tr>
            <tr><td>Gelbe Ecken drehen: Alles unten ist kaputt!</td><td>Normal! Würfel nicht drehen, nur <code>U</code> zwischen den Ecken. Nach der letzten Ecke ist alles wieder heil.</td></tr>
            <tr><td>Am Ende ist genau eine Ecke verdreht oder eine Kante gekippt</td><td>Das geht mit legalen Zügen nicht – der Würfel wurde einmal falsch zusammengebaut (oder ein Sticker umgeklebt). Stein herausnehmen und richtig einsetzen.</td></tr>
          </tbody>
        </table>
        <p class="tip"><b>Sauber arbeiten:</b> Drehe Algorithmen langsam und laut mitsprechend („R hoch, U links, R runter, U zurück“). Halte den Würfel während eines Algorithmus fest und verdrehe ihn nicht in der Hand. Wenn etwas schiefgeht: Im <b>Trainer</b> zeigt dir „Tipp“ jederzeit, welcher Schritt kaputt ist und wie du ihn reparierst.</p>`,
      cases: [],
    },
  ];

  const NOTATION = [
    ['R', 'Rechte Seite im Uhrzeigersinn – vorne geht nach oben'],
    ["R'", 'Rechte Seite gegen den Uhrzeigersinn – vorne geht nach unten'],
    ['L', 'Linke Seite im Uhrzeigersinn – vorne geht nach unten'],
    ["L'", 'Linke Seite gegen den Uhrzeigersinn – vorne geht nach oben'],
    ['U', 'Obere Ebene im Uhrzeigersinn – vorne geht nach links'],
    ["U'", 'Obere Ebene gegen den Uhrzeigersinn – vorne geht nach rechts'],
    ['D', 'Untere Ebene im Uhrzeigersinn – vorne geht nach rechts'],
    ["D'", 'Untere Ebene gegen den Uhrzeigersinn – vorne geht nach links'],
    ['F', 'Vorderseite im Uhrzeigersinn – oben geht nach rechts'],
    ["F'", 'Vorderseite gegen den Uhrzeigersinn – oben geht nach links'],
    ['B', 'Hinterseite im Uhrzeigersinn (von hinten gesehen) – oben geht nach links'],
    ["B'", 'Hinterseite gegen den Uhrzeigersinn – oben geht nach rechts'],
    ['y', 'Ganzen Würfel drehen wie U – die rechte Seite kommt nach vorne'],
    ["y'", 'Ganzen Würfel drehen wie U\' – die linke Seite kommt nach vorne'],
  ];

  function moveText(token) {
    const base = token.replace('2', '');
    const hit = NOTATION.find((n) => n[0] === base);
    if (!hit) {
      if (token === 'x2') return 'Ganzen Würfel auf den Kopf stellen';
      if (token[0] === 'x') return 'Ganzen Würfel kippen wie R';
      if (token[0] === 'z') return 'Ganzen Würfel kippen wie F';
      return token;
    }
    if (token.endsWith('2')) return hit[1].split(' – ')[0].replace(/ im Uhrzeigersinn| \(von hinten gesehen\)/, '') + ' zweimal (halbe Drehung)';
    return hit[1];
  }

  root.Lessons = { LESSONS, MASKS, BASES, NOTATION, moveText };
})(window);
