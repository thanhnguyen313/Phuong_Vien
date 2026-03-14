// ============================================================
// 🎂 Happy Birthday Phương Viên - 3D Rotating Heart
// ============================================================

(function () {
    'use strict';

    // ---- CONFIG ----
    const CONFIG = {
        heartParticleCount: 3000,
        heartScale: 8,
        rotationSpeed: 0.006,
        beatSpeed: 0.04,
        beatAmount: 0.04,
        fov: 600,
        colors: [
            [255, 20, 80],   // deep pink-red
            [255, 60, 100],  // hot pink
            [255, 80, 120],  // pink
            [255, 100, 140], // light pink
            [255, 40, 90],   // rose
            [230, 20, 70],   // dark rose
            [255, 110, 160], // soft pink
            [255, 130, 170], // pale pink
            [200, 10, 60],   // deep red
            [255, 150, 180], // very light pink
        ],
        messages: [
            'Phương Viên xinh đẹp',
            'Happy Birthday',
            'Thật xinh đẹp',
            'Mãi bên Viên',
            'Chúc mừng sinh nhật',
            'Phương Viên',
            '8386',
            '67 67 67',
            'Hạnh phúc',
            'Mãi yêu thương',
            'Ngày đặc biệt',
            'Phương Viên là ♥',
            'Forever & Always',
            'Chúc mừng sinh nhật',
            'Thật xinh đẹp',
            'Phương Viên đáng iu',
        ],
        baseTextCount: 60,
        baseRadiusX: 130,
        baseRadiusZ: 130,
        baseY: 110,
        starCount: 200,
    };

    // ---- STATE ----
    const state = {
        canvas: null,
        ctx: null,
        width: 0,
        height: 0,
        heartParticles: [],
        baseTexts: [],
        rotationY: 0,
        time: 0,
        centerX: 0,
        centerY: 0,
        loaded: false,
    };

    // ---- UTILITIES ----
    function rand(min, max) {
        return Math.random() * (max - min) + min;
    }
    function randInt(min, max) {
        return Math.floor(rand(min, max + 1));
    }

    // 3D heart parametric surface
    // x = 16 sin^3(t)
    // y = -(13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t))
    // Then extrude in z for volume
    function heartShape(u, v) {
        // u = angle around heart contour [0, 2PI]
        // v = radius from center to surface [0, 1]
        const x = 16 * Math.pow(Math.sin(u), 3);
        const y = -(13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u));
        // Generate filled heart by scaling from center
        const px = x * v;
        const py = y * v;
        // Add z-depth for 3D volume (spherical distribution)
        const maxZ = Math.sqrt(1 - v * v) * 8 * (1 - Math.abs(y) / 17 * 0.3);
        const pz = rand(-maxZ, maxZ);
        return { x: px, y: py, z: pz };
    }

    // Rotation around Y axis
    function rotateY(x, y, z, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: x * cos + z * sin,
            y: y,
            z: -x * sin + z * cos
        };
    }

    // 3D to 2D projection
    function project(x, y, z) {
        const scale = CONFIG.fov / (CONFIG.fov + z);
        return {
            x: x * scale + state.centerX,
            y: y * scale + state.centerY,
            scale: scale,
            z: z
        };
    }

    // ---- LOADING ----
    function initLoading() {
        const progressBar = document.getElementById('progress-bar');
        let progress = 0;
        const interval = setInterval(() => {
            progress += rand(2, 6);
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                setTimeout(startMainContent, 500);
            }
            progressBar.style.width = progress + '%';
        }, 80);
    }

    function startMainContent() {
        const loading = document.getElementById('loading-screen');
        const main = document.getElementById('main-content');
        loading.classList.add('fade-out');
        main.classList.remove('hidden');
        setTimeout(() => {
            loading.style.display = 'none';
            initApp();
        }, 1000);
    }

    // ---- STARS ----
    function createStars() {
        const container = document.getElementById('stars-container');
        for (let i = 0; i < CONFIG.starCount; i++) {
            const star = document.createElement('div');
            star.classList.add('star');
            if (Math.random() > 0.85) star.classList.add('big');
            star.style.left = rand(0, 100) + '%';
            star.style.top = rand(0, 100) + '%';
            star.style.setProperty('--duration', rand(2, 6) + 's');
            star.style.setProperty('--delay', rand(0, 5) + 's');
            star.style.setProperty('--max-opacity', rand(0.3, 1));
            container.appendChild(star);
        }
    }

    // ---- 3D HEART PARTICLES ----
    class HeartParticle3D {
        constructor() {
            const u = rand(0, Math.PI * 2);
            const v = Math.pow(rand(0, 1), 0.5); // sqrt for uniform area distribution
            const p = heartShape(u, v);
            this.baseX = p.x * CONFIG.heartScale;
            this.baseY = p.y * CONFIG.heartScale;
            this.baseZ = p.z * CONFIG.heartScale;

            const colorIdx = randInt(0, CONFIG.colors.length - 1);
            this.r = CONFIG.colors[colorIdx][0];
            this.g = CONFIG.colors[colorIdx][1];
            this.b = CONFIG.colors[colorIdx][2];

            this.size = rand(1, 2.5);
            this.alpha = rand(0.5, 1);

            // For entrance animation
            this.progress = 0;
            this.speed = rand(0.008, 0.025);
            this.startX = rand(-400, 400);
            this.startY = rand(-400, 400);
            this.startZ = rand(-400, 400);
        }

        getPosition(beat) {
            const scale = 1 + beat;
            let x = this.baseX * scale;
            let y = this.baseY * scale;
            let z = this.baseZ * scale;

            // Entrance animation: fly from random position to heart
            if (this.progress < 1) {
                this.progress = Math.min(1, this.progress + this.speed);
                const t = easeOutCubic(this.progress);
                x = lerp(this.startX, x, t);
                y = lerp(this.startY, y, t);
                z = lerp(this.startZ, z, t);
            }

            return { x, y, z };
        }
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    // ---- BASE TEXT PARTICLES ----
    class BaseText {
        constructor(index, total) {
            this.text = CONFIG.messages[index % CONFIG.messages.length];
            // Distribute in concentric rings
            const ring = Math.floor(index / 8); // ~8 texts per ring
            const angleOffset = (index % 8) / 8 * Math.PI * 2;
            const ringOffset = ring * 0.15;

            this.angle = angleOffset + ringOffset;
            this.radius = 60 + ring * 35 + rand(-10, 10);
            this.y = CONFIG.baseY + rand(-5, 5);
            this.fontSize = rand(11, 16);
            this.alpha = rand(0.5, 0.9);

            // Entrance
            this.progress = 0;
            this.speed = rand(0.005, 0.015);
        }

        getPosition() {
            const x = Math.cos(this.angle) * this.radius;
            const z = Math.sin(this.angle) * this.radius;
            return { x, y: this.y, z };
        }
    }

    // ---- BASE DOT PARTICLES (the grey swirling dots in the base) ----
    const baseDots = [];
    class BaseDot {
        constructor() {
            this.angle = rand(0, Math.PI * 2);
            this.radius = rand(30, 150);
            this.y = CONFIG.baseY + rand(-3, 3);
            this.size = rand(0.5, 2);
            this.alpha = rand(0.15, 0.5);
            this.progress = 0;
            this.speed = rand(0.005, 0.02);
        }

        getPosition() {
            const x = Math.cos(this.angle) * this.radius;
            const z = Math.sin(this.angle) * this.radius;
            return { x, y: this.y, z };
        }
    }


    // ---- INIT ----
    function initApp() {
        state.canvas = document.getElementById('heartCanvas');
        state.ctx = state.canvas.getContext('2d');
        resizeCanvas();
        createStars();
        initHeartParticles();
        initBaseTexts();
        initBaseDots();
        bindEvents();
        animate();
    }

    function resizeCanvas() {
        state.width = window.innerWidth;
        state.height = window.innerHeight;
        state.canvas.width = state.width;
        state.canvas.height = state.height;
        state.centerX = state.width / 2;
        state.centerY = state.height * 0.42;
    }

    function initHeartParticles() {
        state.heartParticles = [];
        for (let i = 0; i < CONFIG.heartParticleCount; i++) {
            state.heartParticles.push(new HeartParticle3D());
        }
    }

    function initBaseTexts() {
        state.baseTexts = [];
        for (let i = 0; i < CONFIG.baseTextCount; i++) {
            state.baseTexts.push(new BaseText(i, CONFIG.baseTextCount));
        }
    }

    function initBaseDots() {
        baseDots.length = 0;
        for (let i = 0; i < 500; i++) {
            baseDots.push(new BaseDot());
        }
    }

    function bindEvents() {
        window.addEventListener('resize', resizeCanvas);
    }

    // ---- RENDER ----
    function animate() {
        const ctx = state.ctx;
        state.time += CONFIG.beatSpeed;
        state.rotationY += CONFIG.rotationSpeed;

        ctx.clearRect(0, 0, state.width, state.height);

        const beat = Math.sin(state.time) * CONFIG.beatAmount
            + Math.sin(state.time * 2) * CONFIG.beatAmount * 0.3;

        // Collect all renderable items for z-sorting
        const renderList = [];

        // ---- Heart particles ----
        for (const p of state.heartParticles) {
            const pos = p.getPosition(beat);
            const rotated = rotateY(pos.x, pos.y, pos.z, state.rotationY);
            const projected = project(rotated.x, rotated.y, rotated.z);

            if (projected.scale > 0) {
                renderList.push({
                    type: 'dot',
                    x: projected.x,
                    y: projected.y,
                    z: rotated.z,
                    size: p.size * projected.scale,
                    r: p.r,
                    g: p.g,
                    b: p.b,
                    alpha: p.alpha * Math.min(1, projected.scale),
                });
            }
        }

        // ---- Base dots ----
        for (const d of baseDots) {
            if (d.progress < 1) {
                d.progress = Math.min(1, d.progress + d.speed);
            }
            const pos = d.getPosition();
            const t = easeOutCubic(d.progress);
            const dx = pos.x * t;
            const dy = pos.y * t;
            const dz = pos.z * t;
            const rotated = rotateY(dx, dy, dz, state.rotationY);
            const projected = project(rotated.x, rotated.y, rotated.z);

            if (projected.scale > 0) {
                renderList.push({
                    type: 'dot',
                    x: projected.x,
                    y: projected.y,
                    z: rotated.z,
                    size: d.size * projected.scale,
                    r: 180,
                    g: 180,
                    b: 180,
                    alpha: d.alpha * Math.min(1, projected.scale),
                });
            }
        }

        // ---- Base texts ----
        for (const bt of state.baseTexts) {
            if (bt.progress < 1) {
                bt.progress = Math.min(1, bt.progress + bt.speed);
            }
            const pos = bt.getPosition();
            const t = easeOutCubic(bt.progress);
            const tx = pos.x * t;
            const ty = pos.y * t;
            const tz = pos.z * t;
            const rotated = rotateY(tx, ty, tz, state.rotationY);
            const projected = project(rotated.x, rotated.y, rotated.z);

            if (projected.scale > 0) {
                renderList.push({
                    type: 'text',
                    x: projected.x,
                    y: projected.y,
                    z: rotated.z,
                    scale: projected.scale,
                    text: bt.text,
                    fontSize: bt.fontSize,
                    alpha: bt.alpha * Math.min(1, projected.scale) * t,
                });
            }
        }

        // Sort by z (far to near) for painter's algorithm
        renderList.sort((a, b) => b.z - a.z);

        // ---- Draw glow beneath heart ----
        drawBaseGlow(ctx);

        // ---- Draw all items ----
        for (const item of renderList) {
            if (item.type === 'dot') {
                ctx.beginPath();
                ctx.arc(item.x, item.y, item.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${item.r},${item.g},${item.b},${item.alpha})`;
                ctx.fill();
            } else if (item.type === 'text') {
                ctx.save();
                ctx.translate(item.x, item.y);
                const s = item.scale;
                ctx.scale(s, s);
                ctx.font = `${item.fontSize}px 'Great Vibes', cursive`;
                ctx.fillStyle = `rgba(255,255,255,${item.alpha})`;
                ctx.shadowColor = 'rgba(255,105,180,0.4)';
                ctx.shadowBlur = 6;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(item.text, 0, 0);
                ctx.restore();
            }
        }

        // ---- Draw heart center glow ----
        drawHeartGlow(ctx);



        requestAnimationFrame(animate);
    }

    function drawBaseGlow(ctx) {
        const grad = ctx.createRadialGradient(
            state.centerX, state.centerY + CONFIG.baseY,
            10,
            state.centerX, state.centerY + CONFIG.baseY,
            180
        );
        grad.addColorStop(0, 'rgba(255,105,180,0.08)');
        grad.addColorStop(0.5, 'rgba(255,20,147,0.03)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.save();
        ctx.translate(state.centerX, state.centerY + CONFIG.baseY);
        ctx.scale(1, 0.3);
        ctx.arc(0, 0, 180, 0, Math.PI * 2);
        ctx.restore();
        ctx.fillStyle = grad;
        ctx.fill();
    }

    function drawHeartGlow(ctx) {
        const grad = ctx.createRadialGradient(
            state.centerX, state.centerY - 20,
            0,
            state.centerX, state.centerY - 20,
            CONFIG.heartScale * 18
        );
        grad.addColorStop(0, 'rgba(255,20,100,0.06)');
        grad.addColorStop(0.4, 'rgba(255,60,120,0.02)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(state.centerX, state.centerY - 20, CONFIG.heartScale * 18, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
    }

    // ---- START ----
    document.addEventListener('DOMContentLoaded', initLoading);
})();
