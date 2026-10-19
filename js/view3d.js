/* 3D-Darstellung mit CSS-Transforms, inklusive Zug-Animation. */
(function (root) {
  'use strict';
  const { Cube, FACES, FACE_VEC, parseMove, vecFace } = root.CubeLib;

  const VIEWS = {
    front: [-26, -36],
    top: [-58, -30],
    low: [-12, -36],
    back: [-26, 144],
  };

  class CubeView {
    /**
     * @param {HTMLElement} el Container
     * @param {object} opts size (px pro Steinchen), view, mask(pieceKey, color) -> bool, drag
     */
    constructor(el, opts = {}) {
      this.el = el;
      this.size = opts.size || 56;
      this.mask = opts.mask || null;
      this.cube = opts.cube || new Cube();
      const v = VIEWS[opts.view || 'front'] || VIEWS.front;
      this.rx = v[0];
      this.ry = v[1];
      this.focus = null;
      this.busy = false;
      this.queue = Promise.resolve();
      this.build();
      if (opts.drag !== false) this.enableDrag();
      this.render();
    }

    build() {
      const s = this.size;
      this.el.classList.add('cv-scene');
      this.el.style.setProperty('--s', s + 'px');
      this.el.innerHTML = '';
      this.root = document.createElement('div');
      this.root.className = 'cv-cube';
      this.el.appendChild(this.root);
      this.slots = new Map();
      for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
        if (!x && !y && !z) continue;
        const cub = document.createElement('div');
        cub.className = 'cv-cubie';
        const faces = {};
        for (const f of FACES) {
          const face = document.createElement('div');
          face.className = 'cv-face cv-' + f;
          const st = document.createElement('div');
          st.className = 'cv-st';
          face.appendChild(st);
          cub.appendChild(face);
          faces[f] = st;
        }
        this.root.appendChild(cub);
        this.slots.set(`${x},${y},${z}`, { el: cub, faces, pos: [x, y, z] });
      }
      this.applyView();
    }

    base(pos) {
      const s = this.size;
      return `translate3d(${pos[0] * s}px, ${-pos[1] * s}px, ${pos[2] * s}px)`;
    }

    applyView() {
      this.root.style.transform = `rotateX(${this.rx}deg) rotateY(${this.ry}deg)`;
    }

    setView(name) {
      const v = VIEWS[name];
      if (v) { this.rx = v[0]; this.ry = v[1]; this.applyView(); }
    }

    /** Größe eines Steinchens in px ändern (z. B. wenn der Platz sich ändert). */
    setSize(size) {
      if (size === this.size) return;
      this.size = size;
      this.el.style.setProperty('--s', size + 'px');
      this.render();
    }

    setCube(cube) {
      this.cube = cube;
      this.render();
    }

    setFocus(key) {
      this.focus = key || null;
      this.render();
    }

    render() {
      const fkey = this.focus;
      this.el.classList.toggle('cv-has-focus', !!fkey);
      for (const slot of this.slots.values()) {
        slot.el.style.transform = this.base(slot.pos);
        for (const f of FACES) slot.faces[f].className = 'cv-st';
        slot.el.classList.remove('cv-focus');
      }
      for (const q of this.cube.cubies) {
        const slot = this.slots.get(q.pos.map((n) => n + 0).join(','));
        if (!slot) continue;
        const key = q.st.map((s) => s.c).sort().join('');
        if (fkey && key === fkey) slot.el.classList.add('cv-focus');
        for (const s of q.st) {
          const f = vecFace(s.d);
          const show = !this.mask || this.mask(key, s.c);
          slot.faces[f].className = 'cv-st on c-' + (show ? s.c : 'X');
        }
      }
    }

    enableDrag() {
      let sx = 0, sy = 0, rx0 = 0, ry0 = 0, down = false;
      this.el.addEventListener('pointerdown', (e) => {
        down = true; sx = e.clientX; sy = e.clientY; rx0 = this.rx; ry0 = this.ry;
        this.el.setPointerCapture(e.pointerId);
        this.el.classList.add('dragging');
      });
      this.el.addEventListener('pointermove', (e) => {
        if (!down) return;
        this.ry = ry0 + (e.clientX - sx) * 0.5;
        this.rx = Math.max(-89, Math.min(89, rx0 - (e.clientY - sy) * 0.5));
        this.applyView();
      });
      const up = () => { down = false; this.el.classList.remove('dragging'); };
      this.el.addEventListener('pointerup', up);
      this.el.addEventListener('pointercancel', up);
    }

    /** Animiert einen Zug und wendet ihn danach auf das Modell an. */
    animate(token, ms = 300) {
      this.queue = this.queue.then(() => this._animate(token, ms));
      return this.queue;
    }

    _animate(token, ms) {
      const m = parseMove(token);
      const ai = m.axis === 'x' ? 0 : m.axis === 'y' ? 1 : 2;
      const fn = m.axis === 'x' ? 'rotateX' : m.axis === 'y' ? 'rotateY' : 'rotateZ';
      const target = (m.axis === 'y' ? 1 : -1) * m.q * 90;
      const moving = [...this.slots.values()].filter((s) => m.layer === null || s.pos[ai] === m.layer);
      if (ms <= 0 || document.hidden) {
        this.cube.move(token);
        this.render();
        return Promise.resolve();
      }
      const dur = ms * (Math.abs(m.amount) === 2 ? 1.5 : 1);
      this.busy = true;
      return new Promise((resolve) => {
        const t0 = performance.now();
        const frame = (now) => {
          const t = Math.min(1, (now - t0) / dur);
          const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          for (const s of moving) s.el.style.transform = `${fn}(${target * e}deg) ${this.base(s.pos)}`;
          if (t < 1) requestAnimationFrame(frame);
          else {
            this.cube.move(token);
            this.render();
            this.busy = false;
            resolve();
          }
        };
        requestAnimationFrame(frame);
      });
    }
  }

  root.CubeView = CubeView;
})(window);
