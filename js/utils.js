// ============================================================
// utils.js — Math and helper functions
// ============================================================

NP.TAU = Math.PI * 2;

NP.rand    = (a, b) => a + Math.random() * (b - a);
NP.randInt = (a, b) => Math.floor(NP.rand(a, b + 1));
NP.lerp    = (a, b, t) => a + (b - a) * t;
NP.dist    = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
NP.angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);

NP.clamp = (v, min, max) => Math.max(min, Math.min(max, v));
