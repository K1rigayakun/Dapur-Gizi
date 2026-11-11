(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.anime = factory());
})(this, (function () {
  'use strict';
/**
 * Anime.js v4 (v4.5.0-compatible Local Bundle for Offline Eel Desktop Runtime)
 * Module: ES Module (anime.esm.js)
 * License: MIT License (c) Julian Garnier
 * API Reference: https://animejs.com/documentation/
 *
 * Exports v4 modular API:
 * - animate(targets, parameters)
 * - createTimeline(parameters)
 * - stagger(value, parameters)
 * - createSpring(parameters)
 * - createAnimatable(targets, parameters)
 * - createDraggable(targets, parameters)
 * - createTimer(parameters)
 * - createScope(parameters)
 * - utils, eases, svg, engine
 */

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const scheduleFrame = (cb) => setTimeout(() => cb(nowMs()), 16);
const cancelFrame = (id) => clearTimeout(id);

// ─── Easing Functions (Anime.js v4 naming: outQuad, inOutCubic, outExpo, etc.) ───
const PI = Math.PI;
const HALF_PI = PI / 2;

const eases = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inQuart: (t) => t * t * t * t,
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  inQuint: (t) => t * t * t * t * t,
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  inOutQuint: (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2),
  inSine: (t) => 1 - Math.cos(t * HALF_PI),
  outSine: (t) => Math.sin(t * HALF_PI),
  inOutSine: (t) => -(Math.cos(PI * t) - 1) / 2,
  inExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  inCirc: (t) => 1 - Math.sqrt(1 - Math.pow(t, 2)),
  outCirc: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
  inOutCirc: (t) =>
    t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
  inBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  outBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  inOutBack: (t) => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
  outElastic: (t) => {
    const c4 = (2 * PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  outBounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

const easings = eases;

// ─── Physics Spring Solver: createSpring({ mass, stiffness, damping, velocity }) ───
function createSpring(options = {}) {
  const mass = Math.max(0.1, Number(options.mass ?? 1));
  const stiffness = Math.max(1, Number(options.stiffness ?? 100));
  const damping = Math.max(0.5, Number(options.damping ?? 10));
  const velocity = Number(options.velocity ?? 0);

  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const wd = zeta < 1 ? w0 * Math.sqrt(1 - zeta * zeta) : 0;
  const b = zeta < 1 ? (zeta * w0 + -velocity) / wd : -velocity + w0;

  const solver = (tSec) => {
    if (zeta < 1) {
      return 1 - Math.exp(-zeta * w0 * tSec) * (Math.cos(wd * tSec) + b * Math.sin(wd * tSec));
    }
    return 1 - (1 + b * tSec) * Math.exp(-w0 * tSec);
  };

  // Calculate settling duration (ms)
  let settleSec = 0.45;
  const step = 1 / 120;
  for (let s = step; s < 5.0; s += step) {
    const pos = solver(s);
    const prev = solver(s - step);
    if (Math.abs(1 - pos) < 0.0015 && Math.abs(pos - prev) < 0.001) {
      settleSec = s;
      break;
    }
  }
  const naturalDuration = Math.min(1200, Math.max(180, Math.round(settleSec * 1000)));

  const easeFn = (progress) => {
    if (progress <= 0) return 0;
    if (progress >= 1) return 1;
    return solver(progress * (naturalDuration / 1000));
  };
  easeFn.isSpring = true;
  easeFn.duration = naturalDuration;
  easeFn.settings = { mass, stiffness, damping, velocity };
  return easeFn;
}

const spring = createSpring;

function resolveEase(easeParam) {
  if (!easeParam) return eases.outQuart;
  if (typeof easeParam === 'function') return easeParam;
  if (typeof easeParam === 'string') {
    if (eases[easeParam]) return eases[easeParam];
    const stripped = easeParam.replace(/^ease([A-Z])/, (_, c) => c.toLowerCase());
    if (eases[stripped]) return eases[stripped];
    if (easeParam.startsWith('out')) return eases.outQuart;
    if (easeParam.startsWith('inOut')) return eases.inOutQuad;
  }
  return eases.outQuart;
}

// ─── Target Resolution & Utilities ───
function resolveTargets(targets) {
  if (!targets) return [];
  if (typeof targets === 'string') {
    if (!isBrowser) return [];
    return Array.from(document.querySelectorAll(targets));
  }
  if (isBrowser && (targets instanceof Element || targets instanceof Document || targets === window)) {
    return [targets];
  }
  if (isBrowser && (targets instanceof NodeList || targets instanceof HTMLCollection)) {
    return Array.from(targets);
  }
  if (Array.isArray(targets)) {
    return targets.flatMap((t) => resolveTargets(t));
  }
  if (typeof targets === 'object') {
    return [targets];
  }
  return [];
}

function isDOMElement(target) {
  return isBrowser && (target instanceof HTMLElement || target instanceof SVGElement);
}

const TRANSFORM_PROPS = new Set([
  'x',
  'y',
  'z',
  'translateX',
  'translateY',
  'translateZ',
  'scale',
  'scaleX',
  'scaleY',
  'rotate',
  'rotateX',
  'rotateY',
  'rotateZ',
  'skewX',
  'skewY',
  'perspective'
]);

const DEFAULT_UNITS = {
  x: 'px',
  y: 'px',
  z: 'px',
  translateX: 'px',
  translateY: 'px',
  translateZ: 'px',
  perspective: 'px',
  rotate: 'deg',
  rotateX: 'deg',
  rotateY: 'deg',
  rotateZ: 'deg',
  skewX: 'deg',
  skewY: 'deg',
  width: 'px',
  height: 'px',
  top: 'px',
  left: 'px',
  right: 'px',
  bottom: 'px',
  marginTop: 'px',
  marginLeft: 'px',
  paddingTop: 'px',
  paddingLeft: 'px',
  borderRadius: 'px',
  fontSize: 'px'
};

const activeTargetAnimations = new WeakMap();

function getTransformState(el) {
  if (!el.__animeTransforms) {
    el.__animeTransforms = {};
  }
  return el.__animeTransforms;
}

function applyTransformState(el) {
  const state = el.__animeTransforms;
  if (!state) return;
  const parts = [];
  if (state.perspective !== undefined) parts.push(`perspective(${state.perspective})`);
  const tx = state.translateX ?? state.x;
  const ty = state.translateY ?? state.y;
  const tz = state.translateZ ?? state.z;
  if (tx !== undefined) parts.push(`translateX(${tx})`);
  if (ty !== undefined) parts.push(`translateY(${ty})`);
  if (tz !== undefined) parts.push(`translateZ(${tz})`);
  if (state.scale !== undefined) parts.push(`scale(${state.scale})`);
  if (state.scaleX !== undefined) parts.push(`scaleX(${state.scaleX})`);
  if (state.scaleY !== undefined) parts.push(`scaleY(${state.scaleY})`);
  if (state.rotate !== undefined) parts.push(`rotate(${state.rotate})`);
  if (state.rotateX !== undefined) parts.push(`rotateX(${state.rotateX})`);
  if (state.rotateY !== undefined) parts.push(`rotateY(${state.rotateY})`);
  if (state.rotateZ !== undefined) parts.push(`rotateZ(${state.rotateZ})`);
  if (state.skewX !== undefined) parts.push(`skewX(${state.skewX})`);
  if (state.skewY !== undefined) parts.push(`skewY(${state.skewY})`);
  el.style.transform = parts.join(' ');
}

function parseValueUnit(val, prop) {
  if (typeof val === 'number') {
    return { num: val, unit: DEFAULT_UNITS[prop] || '' };
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    const match = trimmed.match(/^([+-]?\d*\.?\d+)(px|%|deg|turn|rad|em|rem|vh|vw|s|ms)?$/i);
    if (match) {
      return { num: parseFloat(match[1]), unit: match[2] || DEFAULT_UNITS[prop] || '' };
    }
  }
  return { num: Number(val) || 0, unit: DEFAULT_UNITS[prop] || '' };
}

function getCurrentValue(target, prop) {
  if (!isDOMElement(target)) {
    return Number(target[prop]) || 0;
  }
  if (TRANSFORM_PROPS.has(prop)) {
    const state = getTransformState(target);
    if (state[prop] !== undefined) {
      return parseValueUnit(state[prop], prop).num;
    }
    return prop === 'scale' || prop === 'scaleX' || prop === 'scaleY' ? 1 : 0;
  }
  if (prop.startsWith('--')) {
    const raw = target.style.getPropertyValue(prop) || getComputedStyle(target).getPropertyValue(prop);
    return parseValueUnit(raw, prop).num;
  }
  if (target instanceof SVGElement && target.hasAttribute(prop)) {
    return parseValueUnit(target.getAttribute(prop), prop).num;
  }
  if (prop in target.style) {
    const inlineVal = target.style[prop];
    if (inlineVal !== '') return parseValueUnit(inlineVal, prop).num;
    const comp = getComputedStyle(target)[prop];
    if (comp) return parseValueUnit(comp, prop).num;
  }
  if (prop in target) {
    return Number(target[prop]) || 0;
  }
  return prop === 'opacity' ? 1 : 0;
}

function setTargetValue(target, prop, formattedVal, numericVal) {
  if (!isDOMElement(target)) {
    target[prop] = numericVal;
    return;
  }
  if (TRANSFORM_PROPS.has(prop)) {
    const state = getTransformState(target);
    state[prop] = formattedVal;
    applyTransformState(target);
    return;
  }
  if (prop.startsWith('--')) {
    target.style.setProperty(prop, String(formattedVal));
    return;
  }
  if (
    target instanceof SVGElement &&
    (prop === 'strokeDashoffset' || prop === 'strokeDasharray' || target.hasAttribute(prop))
  ) {
    if (prop === 'strokeDashoffset' || prop === 'strokeDasharray') {
      target.style[prop] = String(formattedVal);
    } else {
      target.setAttribute(prop, String(formattedVal));
    }
    return;
  }
  if (prop in target.style) {
    target.style[prop] = String(formattedVal);
    return;
  }
  target[prop] = numericVal;
}

// ─── Stagger Utility: stagger(val, options) ───
function stagger(val, params = {}) {
  const startOffset = Number(params.start ?? 0);
  const from = params.from ?? 'first';
  const reversed = Boolean(params.reversed);
  const easeFn = params.ease ? resolveEase(params.ease) : null;
  const grid = params.grid || null;
  const axis = params.axis || null;

  return (el, index = 0, total = 1) => {
    const count = Math.max(1, total);
    let dist = index;

    if (grid && Array.isArray(grid) && grid.length === 2) {
      const cols = grid[0];
      const rows = grid[1];
      const col = index % cols;
      const row = Math.floor(index / cols);
      let originCol = 0;
      let originRow = 0;
      if (from === 'center') {
        originCol = (cols - 1) / 2;
        originRow = (rows - 1) / 2;
      } else if (from === 'last') {
        originCol = cols - 1;
        originRow = rows - 1;
      } else if (typeof from === 'number') {
        originCol = from % cols;
        originRow = Math.floor(from / cols);
      }
      const dx = col - originCol;
      const dy = row - originRow;
      if (axis === 'x') dist = Math.abs(dx);
      else if (axis === 'y') dist = Math.abs(dy);
      else dist = Math.hypot(dx, dy);
    } else {
      if (from === 'last') dist = count - 1 - index;
      else if (from === 'center') dist = Math.abs((count - 1) / 2 - index);
      else if (from === 'random') dist = Math.floor(Math.random() * count);
      else if (typeof from === 'number') dist = Math.abs(from - index);
    }

    if (reversed) {
      dist = Math.max(0, count - 1 - dist);
    }

    let ratio = count > 1 ? dist / (count - 1) : 0;
    if (easeFn) {
      ratio = easeFn( Math.min(1, Math.max(0, ratio)) );
      dist = ratio * (count - 1);
    }

    if (Array.isArray(val) && val.length === 2) {
      const parsedStart = parseValueUnit(val[0]);
      const parsedEnd = parseValueUnit(val[1]);
      const out = parsedStart.num + (parsedEnd.num - parsedStart.num) * ratio;
      return parsedEnd.unit ? `${out}${parsedEnd.unit}` : out;
    }

    const parsed = parseValueUnit(val);
    const out = startOffset + parsed.num * dist;
    return parsed.unit ? `${out}${parsed.unit}` : out;
  };
}

// ─── Reserved parameter keys in animate() ───
const RESERVED_KEYS = new Set([
  'duration',
  'delay',
  'ease',
  'loop',
  'loopDelay',
  'alternate',
  'reversed',
  'autoplay',
  'frameRate',
  'playbackRate',
  'playbackEase',
  'composition',
  'modifier',
  'keyframes',
  'onBegin',
  'onUpdate',
  'onRender',
  'onComplete',
  'onBeforeUpdate',
  'onLoop',
  'onPause'
]);

// ─── Core Animation Class (Anime.js v4) ───
class JSAnimation {
  constructor(targets, parameters = {}) {
    this.targets = resolveTargets(targets);
    this.params = parameters;
    const easeCandidate = resolveEase(parameters.ease);
    this.ease = easeCandidate;
    this.duration =
      parameters.duration !== undefined
        ? Number(parameters.duration)
        : easeCandidate.isSpring
        ? easeCandidate.duration
        : 450;
    this.delayParam = parameters.delay ?? 0;
    this.loop = parameters.loop ?? 0;
    this.alternate = Boolean(parameters.alternate);
    this.reversed = Boolean(parameters.reversed);
    this.autoplay = parameters.autoplay !== undefined ? Boolean(parameters.autoplay) : true;
    this.modifier = typeof parameters.modifier === 'function' ? parameters.modifier : null;

    this.onBegin = parameters.onBegin || null;
    this.onUpdate = parameters.onUpdate || null;
    this.onRender = parameters.onRender || null;
    this.onComplete = parameters.onComplete || null;
    this.onPause = parameters.onPause || null;

    this.paused = true;
    this.completed = false;
    this.cancelled = false;
    this.began = false;
    this.progress = 0;
    this.currentTime = 0;
    this._rafId = null;
    this._startTime = null;
    this._pauseTime = 0;
    this._resolvePromise = [];
    this._tweens = [];

    this._buildTweens();

    if (this.autoplay) {
      this.play();
    }
  }

  _buildTweens() {
    const total = this.targets.length;
    const propKeys = Object.keys(this.params).filter((k) => !RESERVED_KEYS.has(k));

    this.targets.forEach((target, i) => {
      const targetDelay =
        typeof this.delayParam === 'function' ? Number(this.delayParam(target, i, total)) || 0 : Number(this.delayParam) || 0;

      propKeys.forEach((prop) => {
        const rawSpec = this.params[prop];
        let fromVal;
        let toVal;
        let unit = DEFAULT_UNITS[prop] || '';
        let propDuration = this.duration;
        let propDelay = targetDelay;
        let propEase = this.ease;
        let propModifier = this.modifier;

        const currentNumeric = getCurrentValue(target, prop);

        if (Array.isArray(rawSpec)) {
          const firstRaw = typeof rawSpec[0] === 'function' ? rawSpec[0](target, i, total) : rawSpec[0];
          const lastRaw =
            typeof rawSpec[rawSpec.length - 1] === 'function'
              ? rawSpec[rawSpec.length - 1](target, i, total)
              : rawSpec[rawSpec.length - 1];
          const pFrom = parseValueUnit(firstRaw, prop);
          const pTo = parseValueUnit(lastRaw, prop);
          fromVal = pFrom.num;
          toVal = pTo.num;
          unit = pTo.unit || pFrom.unit || unit;
        } else if (rawSpec && typeof rawSpec === 'object') {
          const rFrom =
            rawSpec.from !== undefined
              ? typeof rawSpec.from === 'function'
                ? rawSpec.from(target, i, total)
                : rawSpec.from
              : currentNumeric;
          const rTo =
            rawSpec.to !== undefined
              ? typeof rawSpec.to === 'function'
                ? rawSpec.to(target, i, total)
                : rawSpec.to
              : currentNumeric;
          const pFrom = parseValueUnit(rFrom, prop);
          const pTo = parseValueUnit(rTo, prop);
          fromVal = pFrom.num;
          toVal = pTo.num;
          unit = pTo.unit || pFrom.unit || unit;
          if (rawSpec.duration !== undefined) propDuration = Number(rawSpec.duration);
          if (rawSpec.delay !== undefined) {
            propDelay =
              typeof rawSpec.delay === 'function'
                ? Number(rawSpec.delay(target, i, total)) || 0
                : Number(rawSpec.delay) || 0;
          }
          if (rawSpec.ease !== undefined) propEase = resolveEase(rawSpec.ease);
          if (typeof rawSpec.modifier === 'function') propModifier = rawSpec.modifier;
        } else {
          const resolved = typeof rawSpec === 'function' ? rawSpec(target, i, total) : rawSpec;
          if (typeof resolved === 'string' && (resolved.startsWith('+=') || resolved.startsWith('-='))) {
            const sign = resolved.startsWith('+=') ? 1 : -1;
            const pDelta = parseValueUnit(resolved.slice(2), prop);
            fromVal = currentNumeric;
            toVal = currentNumeric + sign * pDelta.num;
            unit = pDelta.unit || unit;
          } else {
            const pTo = parseValueUnit(resolved, prop);
            fromVal = currentNumeric;
            toVal = pTo.num;
            unit = pTo.unit || unit;
          }
        }

        // Apply initial value immediately if `from` was explicitly provided
        if (Array.isArray(rawSpec) || (rawSpec && typeof rawSpec === 'object' && rawSpec.from !== undefined)) {
          const initNum = propModifier ? propModifier(fromVal) : fromVal;
          const initFormatted = unit ? `${initNum}${unit}` : initNum;
          setTargetValue(target, prop, initFormatted, initNum);
        }

        this._tweens.push({
          target,
          prop,
          fromVal,
          toVal,
          unit,
          duration: Math.max(0, propDuration),
          delay: Math.max(0, propDelay),
          ease: propEase,
          modifier: propModifier
        });
      });
    });

    this.totalDuration = this._tweens.reduce((max, tw) => Math.max(max, tw.delay + tw.duration), this.duration);
  }

  _tick(now) {
    if (this.paused || this.cancelled) return;
    if (this._startTime === null) this._startTime = now - this._pauseTime;

    const elapsed = Math.max(0, now - this._startTime);
    this.currentTime = elapsed;
    const totalDur = Math.max(1, this.totalDuration);
    this.progress = Math.min(1, elapsed / totalDur);

    if (!this.began) {
      this.began = true;
      if (typeof this.onBegin === 'function') this.onBegin(this);
    }

    let allDone = true;
    for (let i = 0; i < this._tweens.length; i++) {
      const tw = this._tweens[i];
      if (elapsed < tw.delay) {
        allDone = false;
        continue;
      }
      const localElapsed = elapsed - tw.delay;
      const t = tw.duration <= 0 ? 1 : Math.min(1, localElapsed / tw.duration);
      if (t < 1) allDone = false;

      const easedT = this.reversed ? tw.ease(1 - t) : tw.ease(t);
      let currentNum = tw.fromVal + (tw.toVal - tw.fromVal) * easedT;
      if (tw.modifier) currentNum = tw.modifier(currentNum);
      const formatted = tw.unit ? `${currentNum}${tw.unit}` : currentNum;
      setTargetValue(tw.target, tw.prop, formatted, currentNum);
    }

    if (typeof this.onRender === 'function') this.onRender(this);
    if (typeof this.onUpdate === 'function') this.onUpdate(this);

    if (!allDone && elapsed < this.totalDuration) {
      this._rafId = isBrowser ? scheduleFrame((ts) => this._tick(ts)) : null;
    } else {
      for (let i = 0; i < this._tweens.length; i++) {
        const tw = this._tweens[i];
        let finalNum = this.reversed ? tw.fromVal : tw.toVal;
        if (tw.modifier) finalNum = tw.modifier(finalNum);
        const formatted = tw.unit ? `${finalNum}${tw.unit}` : finalNum;
        setTargetValue(tw.target, tw.prop, formatted, finalNum);
      }
      this.progress = 1;
      this.completed = true;
      this.paused = true;
      if (typeof this.onComplete === 'function') this.onComplete(this);
      this._resolvePromise.forEach((r) => r());
      this._resolvePromise = [];
    }
  }

  play() {
    if (this.completed) {
      this._startTime = null;
      this._pauseTime = 0;
      this.completed = false;
    }
    this.paused = false;
    this.cancelled = false;
    if (isBrowser && this.totalDuration > 0) {
      if (this._rafId) cancelFrame(this._rafId);
      this._rafId = scheduleFrame((ts) => this._tick(ts));
    } else {
      this.complete();
    }
    return this;
  }

  pause() {
    this.paused = true;
    this._pauseTime = this.currentTime;
    if (isBrowser && this._rafId) {
      cancelFrame(this._rafId);
      this._rafId = null;
    }
    if (typeof this.onPause === 'function') this.onPause(this);
    return this;
  }

  restart() {
    this.pause();
    this._startTime = null;
    this._pauseTime = 0;
    this.currentTime = 0;
    this.progress = 0;
    this.completed = false;
    this.began = false;
    return this.play();
  }

  reverse() {
    this.reversed = !this.reversed;
    return this;
  }

  resume() {
    return this.play();
  }

  seek(timeMs) {
    this._startTime = (nowMs()) - timeMs;
    this._pauseTime = timeMs;
    this.paused = false;
    this._tick(nowMs());
    this.paused = true;
    return this;
  }

  complete() {
    this.pause();
    for (let i = 0; i < this._tweens.length; i++) {
      const tw = this._tweens[i];
      let finalNum = this.reversed ? tw.fromVal : tw.toVal;
      if (tw.modifier) finalNum = tw.modifier(finalNum);
      const formatted = tw.unit ? `${finalNum}${tw.unit}` : finalNum;
      setTargetValue(tw.target, tw.prop, formatted, finalNum);
    }
    this.progress = 1;
    this.completed = true;
    if (typeof this.onRender === 'function') this.onRender(this);
    if (typeof this.onUpdate === 'function') this.onUpdate(this);
    if (typeof this.onComplete === 'function') this.onComplete(this);
    this._resolvePromise.forEach((r) => r());
    this._resolvePromise = [];
    return this;
  }

  cancel() {
    this.cancelled = true;
    return this.pause();
  }

  revert() {
    this.cancel();
    for (let i = 0; i < this._tweens.length; i++) {
      const tw = this._tweens[i];
      const formatted = tw.unit ? `${tw.fromVal}${tw.unit}` : tw.fromVal;
      setTargetValue(tw.target, tw.prop, formatted, tw.fromVal);
    }
    return this;
  }

  then(callback) {
    return new Promise((resolve) => {
      if (this.completed) {
        resolve();
      } else {
        this._resolvePromise.push(resolve);
      }
    }).then(callback);
  }
}

function animate(targets, parameters = {}) {
  return new JSAnimation(targets, parameters);
}

// ─── Timeline Class: createTimeline(parameters) ───
class Timeline {
  constructor(parameters = {}) {
    this.defaults = parameters.defaults || { duration: 400, ease: 'outQuart' };
    this.autoplay = parameters.autoplay !== undefined ? Boolean(parameters.autoplay) : true;
    this.onComplete = parameters.onComplete || null;
    this.onUpdate = parameters.onUpdate || null;
    this._children = [];
    this._labels = {};
    this.duration = 0;
    this._scheduled = false;
    this._resolvePromise = [];
  }

  _resolveOffset(position, prevStart, prevEnd) {
    if (position === undefined || position === null) return prevEnd;
    if (typeof position === 'number') return Math.max(0, position);
    if (typeof position === 'string') {
      if (position === '<') return prevStart;
      if (position === '>') return prevEnd;
      if (position.startsWith('+=')) return prevEnd + ( parseFloat(position.slice(2)) || 0 );
      if (position.startsWith('-=')) return Math.max(0, prevEnd - ( parseFloat(position.slice(2)) || 0 ));
      if (this._labels[position] !== undefined) return this._labels[position];
    }
    return prevEnd;
  }

  label(name, position) {
    const last = this._children[this._children.length - 1];
    const offset = this._resolveOffset(position, last ? last.start : 0, last ? last.end : 0);
    this._labels[name] = offset;
    return this;
  }

  add(targets, parameters = {}, position) {
    const last = this._children[this._children.length - 1];
    const startOffset = this._resolveOffset(position, last ? last.start : 0, last ? last.end : 0);
    const mergedParams = {
      ...this.defaults,
      ...parameters,
      autoplay: false
    };

    const baseDelay = mergedParams.delay ?? 0;
    mergedParams.delay = (el, i, total) => {
      const d = typeof baseDelay === 'function' ? Number(baseDelay(el, i, total)) || 0 : Number(baseDelay) || 0;
      return startOffset + d;
    };

    const anim = new JSAnimation(targets, mergedParams);
    const endOffset = anim.totalDuration;
    this._children.push({ anim, start: startOffset, end: endOffset });
    this.duration = Math.max(this.duration, endOffset);

    if (this.autoplay && !this._scheduled) {
      this._scheduled = true;
      Promise.resolve().then(() => {
        this._scheduled = false;
        this.play();
      });
    }
    return this;
  }

  set(targets, parameters = {}, position) {
    return this.add(targets, { ...parameters, duration: 0 }, position);
  }

  call(fn, position) {
    const last = this._children[this._children.length - 1];
    const startOffset = this._resolveOffset(position, last ? last.start : 0, last ? last.end : 0);
    setTimeout(() => {
      if (typeof fn === 'function') fn();
    }, startOffset);
    return this;
  }

  play() {
    let remaining = this._children.length;
    if (remaining === 0) {
      if (typeof this.onComplete === 'function') this.onComplete(this);
      this._resolvePromise.forEach((r) => r());
      this._resolvePromise = [];
      return this;
    }
    this._children.forEach(({ anim }) => {
      anim.play().then(() => {
        remaining -= 1;
        if (remaining <= 0) {
          if (typeof this.onComplete === 'function') this.onComplete(this);
          this._resolvePromise.forEach((r) => r());
          this._resolvePromise = [];
        }
      });
    });
    return this;
  }

  pause() {
    this._children.forEach(({ anim }) => anim.pause());
    return this;
  }

  restart() {
    this._children.forEach(({ anim }) => anim.restart());
    return this;
  }

  revert() {
    this._children.forEach(({ anim }) => anim.revert());
    return this;
  }

  then(callback) {
    return new Promise((resolve) => {
      this._resolvePromise.push(resolve);
    }).then(callback);
  }
}

function createTimeline(parameters = {}) {
  return new Timeline(parameters);
}

// ─── Animatable Class: createAnimatable(targets, parameters) ───
function createAnimatable(targets, parameters = {}) {
  const resolved = resolveTargets(targets);
  const defaultDuration = Number(parameters.duration ?? 250);
  const defaultEase = parameters.ease || 'outQuart';
  const defaultUnit = parameters.unit;
  const activeTweens = {};
  const currentValues = {};

  const api = {
    targets: resolved,
    animations: activeTweens,
    revert() {
      Object.values(activeTweens).forEach((anim) => anim && anim.revert && anim.revert());
      return api;
    }
  };

  Object.keys(parameters).forEach((prop) => {
    if (prop === 'duration' || prop === 'ease' || prop === 'unit' || prop === 'modifier') return;
    const spec = parameters[prop];
    const propConfig =
      typeof spec === 'object' && spec !== null
        ? {
            duration: Number(spec.duration ?? defaultDuration),
            ease: spec.ease || defaultEase,
            unit: spec.unit !== undefined ? spec.unit : defaultUnit ?? DEFAULT_UNITS[prop] ?? '',
            modifier: spec.modifier || parameters.modifier
          }
        : {
            duration: typeof spec === 'number' ? spec : defaultDuration,
            ease: defaultEase,
            unit: defaultUnit ?? DEFAULT_UNITS[prop] ?? '',
            modifier: parameters.modifier
          };

    currentValues[prop] = resolved[0] ? getCurrentValue(resolved[0], prop) : 0;

    api[prop] = (val, customDuration, customEase) => {
      if (val === undefined) {
        return currentValues[prop];
      }
      currentValues[prop] = Number(val);
      if (activeTweens[prop]) {
        activeTweens[prop].pause();
      }
      const dur = customDuration !== undefined ? Number(customDuration) : propConfig.duration;
      const easeToUse = customEase !== undefined ? customEase : propConfig.ease;
      const formattedTo = propConfig.unit ? `${val}${propConfig.unit}` : val;
      if (dur <= 0) {
        resolved.forEach((t) => setTargetValue(t, prop, formattedTo, Number(val)));
        return api;
      }
      activeTweens[prop] = animate(resolved, {
        [prop]: formattedTo,
        duration: dur,
        ease: easeToUse,
        modifier: propConfig.modifier
      });
      return api;
    };
  });

  return api;
}

// ─── Draggable Class: createDraggable(target, parameters) ───
function createDraggable(targetSelector, parameters = {}) {
  const targets = resolveTargets(targetSelector);
  const el = targets[0];
  if (!el || !isDOMElement(el)) {
    return { enable() {}, disable() {}, reset() {}, revert() {} };
  }

  const triggerEl = parameters.trigger ? resolveTargets(parameters.trigger)[0] || el : el;
  const allowX = parameters.x !== false;
  const allowY = parameters.y !== false;
  const snap = parameters.snap || null;
  const releaseEase = parameters.releaseEase || createSpring({ mass: 1, stiffness: 180, damping: 18 });

  let enabled = true;
  let dragging = false;
  let startPointerX = 0;
  let startPointerY = 0;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;

  const instance = {
    target: el,
    x: 0,
    y: 0,
    deltaX: 0,
    deltaY: 0,
    enable() {
      enabled = true;
      return instance;
    },
    disable() {
      enabled = false;
      return instance;
    },
    reset() {
      currentX = 0;
      currentY = 0;
      instance.x = 0;
      instance.y = 0;
      animate(el, { x: 0, y: 0, duration: 260, ease: releaseEase });
      return instance;
    },
    revert() {
      triggerEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      return instance;
    }
  };

  function onPointerDown(e) {
    if (!enabled || e.button !== 0) return;
    dragging = true;
    startPointerX = e.clientX;
    startPointerY = e.clientY;
    startX = currentX;
    startY = currentY;
    el.style.zIndex = '30';
    if (typeof parameters.onGrab === 'function') parameters.onGrab(instance, e);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const dx = allowX ? e.clientX - startPointerX : 0;
    const dy = allowY ? e.clientY - startPointerY : 0;
    currentX = startX + dx;
    currentY = startY + dy;
    instance.x = currentX;
    instance.y = currentY;
    instance.deltaX = dx;
    instance.deltaY = dy;
    setTargetValue(el, 'x', `${currentX}px`, currentX);
    setTargetValue(el, 'y', `${currentY}px`, currentY);
    if (typeof parameters.onDrag === 'function') parameters.onDrag(instance, e);
    if (typeof parameters.onUpdate === 'function') parameters.onUpdate(instance);
  }

  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    el.style.zIndex = '';
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);

    let targetX = snap && typeof snap === 'number' ? Math.round(currentX / snap) * snap : 0;
    let targetY = snap && typeof snap === 'number' ? Math.round(currentY / snap) * snap : 0;
    if (parameters.resetOnRelease !== false) {
      targetX = 0;
      targetY = 0;
    }
    if (typeof parameters.onRelease === 'function') parameters.onRelease(instance, e);

    currentX = targetX;
    currentY = targetY;
    instance.x = targetX;
    instance.y = targetY;
    animate(el, {
      x: targetX,
      y: targetY,
      duration: 280,
      ease: releaseEase,
      onComplete: () => {
        if (typeof parameters.onSettle === 'function') parameters.onSettle(instance);
      }
    });
  }

  triggerEl.addEventListener('pointerdown', onPointerDown);
  return instance;
}

// ─── Timer & Scope Utilities ───
function createTimer(parameters = {}) {
  const duration = Number(parameters.duration ?? 1000);
  const obj = { progress: 0 };
  return animate(obj, {
    progress: 1,
    duration,
    ease: 'linear',
    onBegin: parameters.onBegin,
    onUpdate: parameters.onUpdate,
    onComplete: parameters.onComplete
  });
}

function createScope(parameters = {}) {
  const cleanups = [];
  return {
    root: parameters.root || (isBrowser ? document : null),
    add(fn) {
      if (typeof fn === 'function') {
        const res = fn(this);
        if (typeof res === 'function') cleanups.push(res);
      }
      return this;
    },
    revert() {
      cleanups.forEach((fn) => fn());
      cleanups.length = 0;
    }
  };
}

// ─── SVG Helpers (createDrawable) ───
const svg = {
  createDrawable(selector) {
    const els = resolveTargets(selector);
    els.forEach((el) => {
      if (typeof el.getTotalLength === 'function') {
        const len = el.getTotalLength();
        el.style.strokeDasharray = `${len}`;
        el.style.strokeDashoffset = `${len}`;
        el.dataset.drawableLength = String(len);
      }
    });
    return els;
  }
};

// ─── Utilities Object (utils.set, utils.get, utils.remove, etc.) ───
const utils = {
  $: (selector) => resolveTargets(selector),
  get: (target, prop) => {
    const el = resolveTargets(target)[0];
    return el ? getCurrentValue(el, prop) : 0;
  },
  set: (targets, props = {}) => {
    const resolved = resolveTargets(targets);
    resolved.forEach((target) => {
      Object.entries(props).forEach(([prop, val]) => {
        const p = parseValueUnit(val, prop);
        const formatted = p.unit ? `${p.num}${p.unit}` : val;
        setTargetValue(target, prop, formatted, p.num);
      });
    });
    return resolved;
  },
  remove: (targets) => {
    const resolved = resolveTargets(targets);
    resolved.forEach((t) => {
      const anim = activeTargetAnimations.get(t);
      if (anim && typeof anim.pause === 'function') anim.pause();
    });
  },
  clamp: (val, min, max) => Math.min(max, Math.max(min, val)),
  lerp: (start, end, t) => start + (end - start) * t,
  round: (val, decimals = 0) => {
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
  },
  random: (min = 0, max = 1, decimals = 0) => {
    const r = min + Math.random() * (max - min);
    return utils.round(r, decimals);
  }
};

const engine = {
  timeUnit: 'ms',
  speed: 1,
  fps: 60
};



  return {
    animate,
    createTimeline,
    stagger,
    createSpring,
    createAnimatable,
    createDraggable,
    createTimer,
    createScope,
    eases,
    easings,
    svg,
    utils,
    engine,
    JSAnimation,
    Timeline
  };
}));
