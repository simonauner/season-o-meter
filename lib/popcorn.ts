/**
 * Popcorn that pops out of an element and rains down over the page, for a
 * perfect 10. Mostly kernels, with some film strip and the odd gold star.
 *
 * Drawn on a canvas above everything, which is removed when the last piece
 * has fallen out of view. Nothing happens for visitors who prefer reduced
 * motion.
 */

const PIECES = 70;
/** Kernels pop one after another rather than all at once, in milliseconds. */
const POPPING = 450;
const GRAVITY = 1500;
const LIFETIME = 3200;

type Kind = 'kernel' | 'film' | 'star';

interface Piece {
    kind: Kind;
    delay: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number;
    spin: number;
    size: number;
    /** The kernel's puffs, as offsets and radii relative to its size. */
    puffs: [number, number, number][];
    butter: string;
}

const BUTTER = ['#fffaf0', '#fff4d6', '#ffecb3', '#fbe3a1'];

function random(min: number, max: number) {
    return min + Math.random() * (max - min);
}

function pickKind(): Kind {
    const roll = Math.random();
    return roll < 0.72 ? 'kernel' : roll < 0.88 ? 'film' : 'star';
}

function makePiece(x: number, y: number): Piece {
    const kind = pickKind();
    // Up and out in a fan, a little wider than straight up.
    const direction = -Math.PI / 2 + random(-0.75, 0.75);
    const speed = random(550, 1050);
    return {
        kind,
        delay: Math.random() ** 1.5 * POPPING,
        x: x + random(-8, 8),
        y,
        vx: Math.cos(direction) * speed,
        vy: Math.sin(direction) * speed,
        angle: random(0, Math.PI * 2),
        spin: random(-9, 9),
        size: kind === 'film' ? random(12, 16) : random(9, 14),
        puffs: Array.from({ length: 5 }, (_, i) => {
            const around = (i / 5) * Math.PI * 2 + random(-0.3, 0.3);
            const reach = random(0.35, 0.6);
            return [
                Math.cos(around) * reach,
                Math.sin(around) * reach,
                random(0.45, 0.65),
            ];
        }),
        butter: BUTTER[Math.floor(Math.random() * BUTTER.length)],
    };
}

function drawKernel(context: CanvasRenderingContext2D, piece: Piece) {
    const { size } = piece;
    // The brown hull peeking out from under the puffs.
    context.fillStyle = '#b4772f';
    context.beginPath();
    context.ellipse(0, size * 0.45, size * 0.28, size * 0.18, 0, 0, Math.PI);
    context.fill();

    context.fillStyle = piece.butter;
    context.strokeStyle = 'rgb(150 105 40 / 45%)';
    context.lineWidth = 1;
    for (const [dx, dy, r] of piece.puffs) {
        context.beginPath();
        context.arc(dx * size, dy * size, r * size, 0, Math.PI * 2);
        context.fill();
        context.stroke();
    }
    // Fill the middle again over the inner outlines, so it reads as one piece.
    context.beginPath();
    context.arc(0, 0, size * 0.5, 0, Math.PI * 2);
    context.fill();
}

function drawFilm(context: CanvasRenderingContext2D, piece: Piece) {
    const width = piece.size * 1.6;
    const height = piece.size;
    context.fillStyle = '#1d1d1f';
    context.fillRect(-width / 2, -height / 2, width, height);
    // The frame, and sprocket holes along both edges.
    context.fillStyle = '#7fb3e6';
    context.fillRect(-width / 2 + 3, -height / 2 + 4, width - 6, height - 8);
    context.fillStyle = '#f5f5f2';
    const holes = 4;
    for (let i = 0; i < holes; i++) {
        const hx = -width / 2 + ((i + 0.5) * width) / holes - 1;
        context.fillRect(hx, -height / 2 + 1, 2, 2);
        context.fillRect(hx, height / 2 - 3, 2, 2);
    }
}

function drawStar(context: CanvasRenderingContext2D, piece: Piece) {
    const outer = piece.size * 0.7;
    const inner = outer * 0.45;
    context.fillStyle = '#f5c518';
    context.beginPath();
    for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        context.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    context.closePath();
    context.fill();
}

const DRAW: Record<Kind, typeof drawKernel> = {
    kernel: drawKernel,
    film: drawFilm,
    star: drawStar,
};

export function popcorn(from: Element | null | undefined) {
    if (
        !from ||
        typeof window === 'undefined' ||
        matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
        return;
    }

    const rect = from.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
        position: 'fixed',
        inset: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: '1000',
    });
    document.body.append(canvas);
    const context = canvas.getContext('2d');
    if (!context) {
        canvas.remove();
        return;
    }

    const resize = () => {
        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.round(window.innerWidth * ratio);
        canvas.height = Math.round(window.innerHeight * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const pieces = Array.from({ length: PIECES }, () =>
        makePiece(originX, originY)
    );
    const start = performance.now();
    let previous = start;

    const frame = (now: number) => {
        const elapsed = now - start;
        // Capped, so a frame after a stall doesn't fling everything away.
        const dt = Math.min(now - previous, 50) / 1000;
        previous = now;

        context.clearRect(0, 0, window.innerWidth, window.innerHeight);
        let falling = false;

        for (const piece of pieces) {
            if (elapsed < piece.delay) {
                falling = true;
                continue;
            }
            piece.vy += GRAVITY * dt;
            // A little air resistance, so pieces drift rather than drop.
            piece.vx *= 1 - 1.2 * dt;
            piece.x += piece.vx * dt;
            piece.y += piece.vy * dt;
            piece.angle += piece.spin * dt;
            if (piece.y - piece.size > window.innerHeight) continue;
            falling = true;

            const age = elapsed - piece.delay;
            // Grows out of the kernel for the first moment, like a pop.
            const scale = Math.min(1, 0.3 + age / 120);
            context.save();
            context.globalAlpha = Math.max(
                0,
                Math.min(1, (LIFETIME - elapsed) / 500)
            );
            context.translate(piece.x, piece.y);
            context.rotate(piece.angle);
            context.scale(scale, scale);
            DRAW[piece.kind](context, piece);
            context.restore();
        }

        if (falling && elapsed < LIFETIME) {
            requestAnimationFrame(frame);
        } else {
            window.removeEventListener('resize', resize);
            canvas.remove();
        }
    };
    requestAnimationFrame(frame);
}
