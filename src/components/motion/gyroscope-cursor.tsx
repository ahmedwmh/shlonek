"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export interface GyroscopeCursorProps {
  color?: string;
  outlineColor?: string;
  size?: number;
  outlineWidth?: number;
  shadow?: number;
  turn?: number;
  turnSpeed?: number;
  overshoot?: number;
  stretch?: number;
  settle?: number;
  restAngle?: number;
  press?: boolean;
  ripple?: boolean;
  hover?: boolean;
  label?: string;
  autoplay?: boolean;
  autoplaySpeed?: number;
  idleDelay?: number;
  interactive?: boolean;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export interface GyroscopeCursorHandle {
  moveTo: (x: number, y: number, duration?: number) => Promise<void>;
  click: () => void;
  wiggle: () => void;
}

type Settings = Required<Omit<GyroscopeCursorProps, "className" | "style" | "children">> & {
  reduced: boolean;
};

interface Parts {
  root: HTMLElement;
  body: HTMLElement;
  arrow: SVGSVGElement;
  path: SVGPathElement;
  tag: HTMLElement;
  rings: HTMLElement[];
}

interface Controller {
  sync: () => void;
  moveTo: (x: number, y: number, duration?: number) => Promise<void>;
  click: () => void;
  wiggle: () => void;
  destroy: () => void;
}

type Mode = "none" | "pointer" | "ghost";

const TAU = Math.PI * 2;
const SUBSTEP = 1 / 240;
const SPAN = 1;
const NOTCH = 0.2;
const RINGS = 4;
const INTERACTIVE =
  'a[href],button:not(:disabled),[role="button"],[role="link"],[role="tab"],[role="menuitem"],[role="option"],[role="switch"],[role="checkbox"],input[type="button"],input[type="submit"],input[type="reset"],input[type="checkbox"],input[type="radio"],input[type="range"],input[type="color"],input[type="file"],label[for],select,summary,[data-cursor="pointer"]';
const TEXTUAL =
  'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]):not([type="image"]):not([type="hidden"]),textarea,[contenteditable]:not([contenteditable="false"]),[data-cursor="native"]';
const TARGETS = "[data-cursor-target]";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const smooth = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

const wrapAngle = (angle: number) => angle - TAU * Math.floor((angle + Math.PI) / TAU);

const nearest = (angle: number, reference: number) => reference + wrapAngle(angle - reference);

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(2 - 2 * t, 3) / 2);

const easeSlope = (t: number) => (t < 0.5 ? 12 * t * t : 3 * Math.pow(2 - 2 * t, 2));

const arrowPath = (length: number) => {
  const half = (length * SPAN) / 2;
  const corners: [number, number, number][] = [
    [0, 0, length * 0.09],
    [-length, -half, length * 0.16],
    [-length * (1 - NOTCH), 0, length * 0.12],
    [-length, half, length * 0.16],
  ];
  let d = "";
  corners.forEach(([x, y, r], i) => {
    const [px, py] = corners[(i + corners.length - 1) % corners.length];
    const [qx, qy] = corners[(i + 1) % corners.length];
    const lp = Math.hypot(px - x, py - y);
    const lq = Math.hypot(qx - x, qy - y);
    const ax = x + ((px - x) / lp) * r;
    const ay = y + ((py - y) / lp) * r;
    const bx = x + ((qx - x) / lq) * r;
    const by = y + ((qy - y) / lq) * r;
    d += `${i === 0 ? "M" : "L"}${ax.toFixed(3)} ${ay.toFixed(3)}Q${x.toFixed(3)} ${y.toFixed(3)} ${bx.toFixed(3)} ${by.toFixed(3)}`;
  });
  return `${d}Z`;
};

const scopeStyles = (scope: string) => {
  const active = `[data-gyroscope-cursor="${scope}"][data-active]`;
  return `${active},${active} *{cursor:none!important}${active} :is(${TEXTUAL}),${active} :is(${TEXTUAL}) *{cursor:auto!important}`;
};

const subscribeToMotion = (notify: () => void) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};

const readMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const spring = new Float64Array(2);

const step = (value: number, velocity: number, target: number, omega: number, zeta: number, dt: number) => {
  let v = velocity;
  let x = value;
  let remaining = dt;
  while (remaining > 1e-6) {
    const h = Math.min(SUBSTEP, remaining);
    remaining -= h;
    v += (omega * omega * (target - x) - 2 * zeta * omega * v) * h;
    x += v * h;
  }
  spring[0] = x;
  spring[1] = v;
};

const createCursor = (parts: Parts, settingsRef: { current: Settings }): Controller => {
  const { root, body, arrow, path, tag, rings } = parts;
  const doc = root.ownerDocument;
  const view = doc.defaultView ?? window;
  const fine = view.matchMedia("(pointer: fine)");
  const now = () => performance.now() / 1000;

  let raf = 0;
  let last = 0;
  let destroyed = false;
  let visible = true;
  let mode: Mode = "none";
  let geometry = "";
  let ringIndex = 0;
  let hovering = false;
  let textual = false;
  let context = "";
  let ghostHover = false;
  let ghostContext = "";
  let shownText = "";
  let flip = 1;

  const pointer = {
    x: 0,
    y: 0,
    clientX: 0,
    clientY: 0,
    vx: 0,
    vy: 0,
    time: 0,
    inside: false,
    seen: false,
    fresh: true,
    leftAt: -1e9,
    heard: 0,
  };
  const pose = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    spin: 0,
    aim: 0,
    lastFast: -1e9,
    stretch: 0,
    press: 0,
    pressV: 0,
    pressed: false,
    hover: 0,
    hoverV: 0,
    presence: 0,
    presenceV: 0,
    wiggleAt: -1e9,
    placed: false,
  };
  const label = { x: 0, y: 0, vx: 0, vy: 0, show: 0, showV: 0 };
  const agent = {
    phase: "idle" as "idle" | "travel" | "dwell",
    t0: 0,
    duration: 1,
    from: { x: 0, y: 0 },
    c1: { x: 0, y: 0 },
    c2: { x: 0, y: 0 },
    to: { x: 0, y: 0 },
    until: 0,
    clickAt: -1,
    releaseAt: -1,
    wiggle: false,
    manualUntil: -1e9,
    last: null as Element | null,
    arrive: [] as (() => void)[],
  };

  const restAngle = () => ((settingsRef.current.restAngle - 90) * Math.PI) / 180;

  const followable = () => {
    const settings = settingsRef.current;
    return settings.interactive && !settings.disabled && fine.matches;
  };

  const applyStyle = () => {
    const settings = settingsRef.current;
    const size = clamp(settings.size, 8, 160);
    const outline = clamp(settings.outlineWidth, 0, size * 0.35);
    const key = `${size}:${outline}`;
    if (key !== geometry) {
      geometry = key;
      const pad = outline + 2;
      const width = size + pad * 2;
      const height = size * SPAN + pad * 2;
      arrow.setAttribute("viewBox", `${-size - pad} ${(-size * SPAN) / 2 - pad} ${width} ${height}`);
      arrow.setAttribute("width", `${width}`);
      arrow.setAttribute("height", `${height}`);
      arrow.style.left = `${-size - pad}px`;
      arrow.style.top = `${(-size * SPAN) / 2 - pad}px`;
      arrow.style.transformOrigin = `${size + pad}px ${(size * SPAN) / 2 + pad}px`;
      path.setAttribute("d", arrowPath(size));
      path.setAttribute("stroke-width", `${outline * 2}`);
      tag.style.fontSize = `${clamp(size * 0.5, 11, 16)}px`;
    }
    path.setAttribute("fill", settings.color);
    path.setAttribute("stroke", outline > 0 ? settings.outlineColor : "none");
    const depth = clamp(settings.shadow, 0, 1);
    body.style.filter =
      depth > 0
        ? `drop-shadow(0 ${0.5 + depth}px ${1 + depth}px rgba(0,0,0,${(0.22 * depth).toFixed(3)})) drop-shadow(0 ${2 + 3 * depth}px ${4 + 6 * depth}px rgba(0,0,0,${(0.16 * depth).toFixed(3)}))`
        : "none";
    tag.style.background = settings.color;
    tag.style.color = settings.outlineColor;
    const ring = outline > 0 ? `0 0 0 ${Math.min(outline * 0.6, 2).toFixed(2)}px ${settings.outlineColor},` : "";
    tag.style.boxShadow = `${ring}0 ${1 + 2 * depth}px ${3 + 6 * depth}px rgba(0,0,0,${(0.22 * depth).toFixed(3)})`;
    for (const item of rings) {
      item.style.borderColor = settings.color;
      item.style.boxShadow =
        outline > 0 ? `0 0 0 1px ${settings.outlineColor}, inset 0 0 0 1px ${settings.outlineColor}` : "none";
    }
  };

  let activeState = false;
  const setActive = (active: boolean) => {
    if (active === activeState) return;
    activeState = active;
    if (active) root.setAttribute("data-active", "");
    else root.removeAttribute("data-active");
  };

  const inspect = (target: EventTarget | null) => {
    const element = target && (target as Node).nodeType === 1 ? (target as Element) : null;
    const text = element?.closest(TEXTUAL);
    textual = !!text && root.contains(text);
    const hit = element?.closest(INTERACTIVE);
    hovering = !!hit && root.contains(hit);
    const tagged = element?.closest("[data-cursor-label]");
    context = tagged && root.contains(tagged) ? (tagged.getAttribute("data-cursor-label") ?? "") : "";
  };

  const ripple = (x: number, y: number) => {
    const settings = settingsRef.current;
    if (!settings.ripple || settings.reduced) return;
    const ring = rings[ringIndex++ % rings.length];
    const radius = clamp(settings.size, 8, 160) * 1.05;
    ring.style.width = `${radius * 2}px`;
    ring.style.height = `${radius * 2}px`;
    ring.style.left = `${-radius}px`;
    ring.style.top = `${-radius}px`;
    for (const animation of ring.getAnimations()) animation.cancel();
    ring.animate(
      [
        { transform: `translate3d(${x}px, ${y}px, 0) scale(0.12)`, opacity: 1 },
        { transform: `translate3d(${x}px, ${y}px, 0) scale(1)`, opacity: 0 },
      ],
      { duration: 560, easing: "cubic-bezier(0.16, 0.84, 0.3, 1)", fill: "forwards" },
    );
  };

  const place = (x: number, y: number) => {
    pose.x = x;
    pose.y = y;
    pose.vx = 0;
    pose.vy = 0;
    pose.spin = 0;
    pose.angle = nearest(restAngle(), pose.angle);
    pose.aim = pose.angle;
    pose.lastFast = -1e9;
    pose.stretch = 0;
    pose.placed = true;
    label.x = x;
    label.y = y;
    label.vx = 0;
    label.vy = 0;
  };

  const bounds = () => {
    const rect = root.getBoundingClientRect();
    return { rect, width: Math.max(1, rect.width), height: Math.max(1, rect.height) };
  };

  const chooseTarget = () => {
    const { rect, width, height } = bounds();
    const tagged = Array.from(root.querySelectorAll(TARGETS));
    const pool = tagged.length ? tagged : Array.from(root.querySelectorAll(INTERACTIVE));
    const options = pool.filter((element) => {
      if (element === agent.last || body.contains(element)) return false;
      const box = element.getBoundingClientRect();
      return (
        box.width > 4 &&
        box.height > 4 &&
        box.left >= rect.left - 1 &&
        box.right <= rect.right + 1 &&
        box.top >= rect.top - 1 &&
        box.bottom <= rect.bottom + 1
      );
    });
    if (options.length && Math.random() < 0.82) {
      const element = options[Math.floor(Math.random() * options.length)];
      const box = element.getBoundingClientRect();
      agent.last = element;
      return {
        x: box.left - rect.left + box.width * (0.35 + Math.random() * 0.3),
        y: box.top - rect.top + box.height * (0.4 + Math.random() * 0.25),
        click: true,
      };
    }
    agent.last = null;
    const pad = Math.min(0.16, 60 / Math.min(width, height));
    return {
      x: width * (pad + (1 - 2 * pad) * Math.random()),
      y: height * (pad + (1 - 2 * pad) * Math.random()),
      click: Math.random() < 0.3,
    };
  };

  const travel = (x: number, y: number, duration: number | null, click: boolean) => {
    const time = now();
    const dx = x - pose.x;
    const dy = y - pose.y;
    const distance = Math.hypot(dx, dy);
    const speed = clamp(settingsRef.current.autoplaySpeed, 0.1, 5);
    agent.from = { x: pose.x, y: pose.y };
    agent.to = { x, y };
    if (distance < 1) {
      agent.c1 = { ...agent.from };
      agent.c2 = { ...agent.to };
    } else {
      const nx = -dy / distance;
      const ny = dx / distance;
      const bend = (Math.random() - 0.5) * 0.7 * distance;
      agent.c1 = { x: pose.x + dx * 0.3 + nx * bend, y: pose.y + dy * 0.3 + ny * bend };
      agent.c2 = { x: pose.x + dx * 0.72 - nx * bend * 0.45, y: pose.y + dy * 0.72 - ny * bend * 0.45 };
    }
    agent.t0 = time;
    agent.duration = Math.max(0.05, duration ?? clamp(0.36 + distance / 820, 0.45, 1.5) / speed);
    ghostHover = false;
    ghostContext = "";
    agent.phase = "travel";
    agent.wiggle = !click && Math.random() < 0.35;
    agent.clickAt = click ? 1 : -1;
  };

  const bezier = (t: number) => {
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    return {
      x: a * agent.from.x + b * agent.c1.x + c * agent.c2.x + d * agent.to.x,
      y: a * agent.from.y + b * agent.c1.y + c * agent.c2.y + d * agent.to.y,
    };
  };

  const bezierSlope = (t: number) => {
    const u = 1 - t;
    const a = 3 * u * u;
    const b = 6 * u * t;
    const c = 3 * t * t;
    return {
      x: a * (agent.c1.x - agent.from.x) + b * (agent.c2.x - agent.c1.x) + c * (agent.to.x - agent.c2.x),
      y: a * (agent.c1.y - agent.from.y) + b * (agent.c2.y - agent.c1.y) + c * (agent.to.y - agent.c2.y),
    };
  };

  const settleArrivals = () => {
    const done = agent.arrive.splice(0);
    for (const resolve of done) resolve();
  };

  const runAgent = (time: number) => {
    const settings = settingsRef.current;
    const speed = clamp(settings.autoplaySpeed, 0.1, 5);
    if (agent.phase === "travel") {
      const u = clamp((time - agent.t0) / agent.duration, 0, 1);
      const eased = ease(u);
      const rate = easeSlope(u) / agent.duration;
      const point = bezier(eased);
      const slope = bezierSlope(eased);
      pose.x = point.x;
      pose.y = point.y;
      pose.vx = slope.x * rate;
      pose.vy = slope.y * rate;
      if (u >= 1) {
        const rect = root.getBoundingClientRect();
        const element = doc.elementFromPoint(rect.left + pose.x, rect.top + pose.y);
        if (element && root.contains(element)) {
          const hit = element.closest(INTERACTIVE);
          const tagged = element.closest("[data-cursor-label]");
          ghostHover = !!hit && root.contains(hit);
          ghostContext = tagged && root.contains(tagged) ? (tagged.getAttribute("data-cursor-label") ?? "") : "";
        }
        agent.phase = "dwell";
        agent.until = time + (0.55 + Math.random() * 0.6) / speed;
        agent.clickAt = agent.clickAt > 0 ? time + 0.12 / speed : -1;
        if (agent.wiggle) pose.wiggleAt = time + 0.08;
        settleArrivals();
      }
      return;
    }
    pose.vx = 0;
    pose.vy = 0;
    if (agent.phase === "dwell") {
      if (agent.clickAt >= 0 && time >= agent.clickAt) {
        agent.clickAt = -1;
        pose.pressed = true;
        agent.releaseAt = time + 0.11;
        ripple(pose.x, pose.y);
      }
      if (agent.releaseAt >= 0 && time >= agent.releaseAt) {
        agent.releaseAt = -1;
        pose.pressed = false;
      }
      if (time < agent.until) return;
      agent.phase = "idle";
    }
    if (settings.autoplay && !settings.reduced && time >= agent.manualUntil) {
      const next = chooseTarget();
      travel(next.x, next.y, null, next.click);
    }
  };

  const decide = (time: number): Mode => {
    const settings = settingsRef.current;
    if (settings.disabled) return "none";
    if (followable() && pointer.inside) return "pointer";
    const scripted = agent.arrive.length > 0 || time < agent.manualUntil;
    const roaming = settings.autoplay && !settings.reduced;
    if (!scripted && !roaming) return "none";
    if (!scripted && followable() && pointer.seen && time - pointer.leftAt < settings.idleDelay) return "none";
    return "ghost";
  };

  const enterGhost = () => {
    if (!pose.placed || mode === "pointer") {
      const { width, height } = bounds();
      const start = pose.placed
        ? { x: clamp(pose.x, width * 0.1, width * 0.9), y: clamp(pose.y, height * 0.1, height * 0.9) }
        : { x: width * (0.3 + Math.random() * 0.4), y: height * (0.3 + Math.random() * 0.4) };
      place(start.x, start.y);
      pose.presence = 0;
      pose.presenceV = 0;
    }
    agent.phase = "idle";
    agent.releaseAt = -1;
    pose.pressed = false;
  };

  const schedule = () => {
    if (destroyed || !visible || raf) return;
    raf = view.requestAnimationFrame(frame);
  };

  function frame(stamp: number) {
    raf = 0;
    if (destroyed) return;
    const settings = settingsRef.current;
    const dt = last ? clamp((stamp - last) / 1000, 0, 1 / 20) : 1 / 60;
    last = stamp;
    const time = now();
    const nextMode = decide(time);
    if (nextMode !== mode) {
      if (nextMode === "pointer") {
        place(pointer.x, pointer.y);
        pose.presence = 0;
        pose.presenceV = 0;
      } else if (nextMode === "ghost") {
        enterGhost();
      }
      mode = nextMode;
    }
    setActive(followable() && pointer.seen);

    if (mode === "pointer") {
      const quiet = time - pointer.heard;
      const decay = quiet > 0.03 ? Math.exp(-dt / 0.05) : 1;
      pointer.vx *= decay;
      pointer.vy *= decay;
      pose.x = pointer.x;
      pose.y = pointer.y;
      pose.vx = pointer.vx;
      pose.vy = pointer.vy;
    } else if (mode === "ghost") {
      runAgent(time);
    }

    const size = clamp(settings.size, 8, 160);
    const outline = clamp(settings.outlineWidth, 0, size * 0.35);
    const rest = restAngle();
    const speed = Math.hypot(pose.vx, pose.vy);
    const turn = settings.reduced ? 0 : clamp(settings.turn, 0, 1);
    const fast = smooth((speed - 40) / 260);
    if (fast > 0.25 && turn > 0) {
      pose.aim = nearest(Math.atan2(pose.vy, pose.vx), pose.angle);
      pose.lastFast = time;
    } else if (time - pose.lastFast > Math.max(0, settings.settle)) {
      pose.aim = nearest(rest, pose.angle);
    }
    const restNear = nearest(rest, pose.angle);
    let offset = wrapAngle(pose.aim - restNear);
    if (Math.abs(offset) > Math.PI * 0.9) offset = Math.abs(offset) * flip;
    else flip = Math.sign(offset) || 1;
    const target = nearest(restNear + turn * offset, pose.angle);
    const omega = TAU * 2.6 * clamp(settings.turnSpeed, 0.1, 4);
    const zeta = 1 - 0.62 * clamp(settings.overshoot, 0, 1);
    step(pose.angle, pose.spin, target, omega, zeta, dt);
    pose.angle = spring[0];
    pose.spin = spring[1];
    if (Math.abs(pose.angle) > TAU * 64) {
      const wrapped = wrapAngle(pose.angle);
      pose.aim += wrapped - pose.angle;
      pose.angle = wrapped;
    }

    const wiggleAge = time - pose.wiggleAt;
    const wiggle =
      wiggleAge >= 0 && wiggleAge < 0.8 && !settings.reduced
        ? Math.sin(wiggleAge * TAU * 6.5) * 0.22 * Math.pow(1 - wiggleAge / 0.8, 1.5)
        : 0;

    const pull = settings.reduced ? 0 : clamp(settings.stretch, 0, 1) * 0.24 * smooth((speed - 120) / 1600);
    pose.stretch += (pull - pose.stretch) * (1 - Math.exp(-dt / 0.06));

    const pressTarget = settings.press && pose.pressed ? 1 : 0;
    if (settings.reduced) {
      pose.press = pressTarget;
      pose.pressV = 0;
    } else {
      step(pose.press, pose.pressV, pressTarget, 42, 0.5, dt);
      pose.press = spring[0];
      pose.pressV = spring[1];
    }
    const hoverTarget =
      settings.hover && ((mode === "pointer" && hovering) || (mode === "ghost" && ghostHover)) ? 1 : 0;
    step(pose.hover, pose.hoverV, hoverTarget, 26, 0.72, dt);
    pose.hover = spring[0];
    pose.hoverV = spring[1];
    const presenceTarget = mode === "pointer" ? (textual ? 0 : 1) : mode === "ghost" ? 1 : 0;
    step(pose.presence, pose.presenceV, presenceTarget, 24, 0.9, dt);
    pose.presence = spring[0];
    pose.presenceV = spring[1];
    const presence = clamp(pose.presence, 0, 1);

    const scale = (0.62 + 0.38 * presence) * (1 - 0.16 * pose.press) * (1 + 0.14 * pose.hover);
    const sx = scale * (1 + pose.stretch);
    const sy = scale * (1 - pose.stretch * 0.45);
    body.style.transform = `translate3d(${pose.x.toFixed(2)}px, ${pose.y.toFixed(2)}px, 0)`;
    body.style.opacity = presence.toFixed(3);
    arrow.style.transform = `rotate(${(pose.angle + wiggle).toFixed(4)}rad) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;

    const text = (mode === "pointer" ? context : mode === "ghost" ? ghostContext : "") || settings.label;
    if (text && text !== shownText) {
      tag.textContent = text;
      if (shownText) label.showV += 4;
      shownText = text;
    }
    const showTarget = text ? presence : 0;
    step(label.show, label.showV, showTarget, 24, 0.8, dt);
    label.show = spring[0];
    label.showV = spring[1];
    const anchorX = pose.x + size * 0.58 + outline * 0.8;
    const anchorY = pose.y + size * 0.82 + outline * 0.8;
    if (settings.reduced) {
      label.x = anchorX;
      label.y = anchorY;
    } else {
      step(label.x, label.vx, anchorX, 34, 0.86, dt);
      label.x = spring[0];
      label.vx = spring[1];
      step(label.y, label.vy, anchorY, 34, 0.86, dt);
      label.y = spring[0];
      label.vy = spring[1];
    }
    const show = clamp(label.show, 0, 1.2);
    tag.style.transform = `translate3d(${label.x.toFixed(2)}px, ${label.y.toFixed(2)}px, 0) scale(${(0.7 + 0.3 * show).toFixed(4)})`;
    tag.style.opacity = clamp(show, 0, 1).toFixed(3);

    const moving =
      speed > 1 ||
      Math.abs(pose.spin) > 1e-3 ||
      Math.abs(target - pose.angle) > 1e-3 ||
      Math.abs(pose.pressV) > 1e-3 ||
      Math.abs(pose.press - pressTarget) > 1e-3 ||
      Math.abs(pose.hoverV) > 1e-3 ||
      Math.abs(pose.hover - hoverTarget) > 1e-3 ||
      Math.abs(pose.presenceV) > 1e-3 ||
      Math.abs(pose.presence - presenceTarget) > 1e-3 ||
      Math.abs(pose.stretch) > 1e-4 ||
      Math.abs(label.x - anchorX) > 0.05 ||
      Math.abs(label.y - anchorY) > 0.05 ||
      Math.abs(label.showV) > 1e-3 ||
      Math.abs(label.show - showTarget) > 1e-3 ||
      wiggle !== 0 ||
      time - pose.lastFast < settings.settle + 0.05;
    const waiting =
      !settings.disabled &&
      followable() &&
      !pointer.inside &&
      pointer.seen &&
      settings.autoplay &&
      !settings.reduced &&
      time - pointer.leftAt < settings.idleDelay + 0.05;
    const hidden =
      mode === "none" &&
      pose.presence < 1e-3 &&
      Math.abs(pose.presenceV) < 1e-3 &&
      label.show < 1e-3 &&
      Math.abs(label.showV) < 1e-3;
    if (hidden) {
      label.x = anchorX;
      label.y = anchorY;
      label.vx = 0;
      label.vy = 0;
      pose.spin = 0;
      pose.angle = target;
      pose.stretch = 0;
    }
    if (mode === "ghost" || waiting || (moving && !hidden)) schedule();
  }

  const track = (event: PointerEvent) => {
    if (event.pointerType === "touch" || !followable()) return;
    const rect = root.getBoundingClientRect();
    const samples = event.getCoalescedEvents?.() ?? [];
    const list = samples.length ? samples : [event];
    for (const sample of list) {
      const x = sample.clientX - rect.left;
      const y = sample.clientY - rect.top;
      const t = sample.timeStamp / 1000;
      if (pointer.fresh) {
        pointer.vx = 0;
        pointer.vy = 0;
        pointer.fresh = false;
      } else {
        const gap = Math.max(t - pointer.time, 0.004);
        const blend = 1 - Math.exp(-gap / 0.045);
        pointer.vx += ((x - pointer.x) / gap - pointer.vx) * blend;
        pointer.vy += ((y - pointer.y) / gap - pointer.vy) * blend;
      }
      pointer.x = x;
      pointer.y = y;
      pointer.time = t;
    }
    pointer.clientX = event.clientX;
    pointer.clientY = event.clientY;
    pointer.heard = now();
    pointer.inside = true;
    pointer.seen = true;
    setActive(true);
    inspect(event.target);
    schedule();
  };

  const onLeave = () => {
    if (!pointer.inside) return;
    pointer.inside = false;
    pointer.fresh = true;
    pointer.leftAt = now();
    pose.pressed = false;
    hovering = false;
    textual = false;
    context = "";
    schedule();
  };

  const onDown = (event: PointerEvent) => {
    if (event.pointerType === "touch" || !followable() || event.button > 0) return;
    track(event);
    pose.pressed = true;
    if (!textual) ripple(pointer.x, pointer.y);
    schedule();
  };

  const onUp = () => {
    if (mode === "ghost") return;
    pose.pressed = false;
    schedule();
  };

  const onScroll = () => {
    if (!pointer.inside) return;
    inspect(doc.elementFromPoint(pointer.clientX, pointer.clientY));
    const rect = root.getBoundingClientRect();
    pointer.x = pointer.clientX - rect.left;
    pointer.y = pointer.clientY - rect.top;
    schedule();
  };

  root.addEventListener("pointermove", track, { passive: true });
  root.addEventListener("pointerover", track, { passive: true });
  root.addEventListener("pointerdown", onDown, { passive: true });
  root.addEventListener("pointerleave", onLeave);
  root.addEventListener("pointercancel", onLeave);
  view.addEventListener("pointerup", onUp, { passive: true });
  view.addEventListener("blur", onLeave);
  view.addEventListener("scroll", onScroll, { passive: true, capture: true });
  const onPreference = () => {
    if (!fine.matches) onLeave();
    schedule();
  };
  fine.addEventListener("change", onPreference);

  const observer =
    typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          if (visible) {
            last = 0;
            schedule();
          } else if (raf) {
            view.cancelAnimationFrame(raf);
            raf = 0;
          }
        });
  observer?.observe(root);

  pose.angle = restAngle();
  pose.aim = pose.angle;
  applyStyle();
  schedule();

  return {
    sync: () => {
      applyStyle();
      if (settingsRef.current.disabled || !followable()) setActive(false);
      schedule();
    },
    moveTo: (x: number, y: number, duration?: number) =>
      new Promise<void>((resolve) => {
        if (destroyed || !Number.isFinite(x) || !Number.isFinite(y) || settingsRef.current.disabled) {
          resolve();
          return;
        }
        const time = now();
        agent.manualUntil = time + Math.max(settingsRef.current.idleDelay, 2) + (duration ?? 1.2);
        if (mode !== "ghost") {
          enterGhost();
          mode = "ghost";
        }
        agent.arrive.push(resolve);
        travel(x, y, duration != null && Number.isFinite(duration) ? Math.max(0, duration) : null, false);
        agent.wiggle = false;
        schedule();
      }),
    click: () => {
      if (destroyed) return;
      const time = now();
      if (mode === "ghost") {
        agent.manualUntil = Math.max(agent.manualUntil, time + Math.max(settingsRef.current.idleDelay, 2));
        pose.pressed = true;
        agent.releaseAt = time + 0.11;
      }
      ripple(pose.x, pose.y);
      schedule();
    },
    wiggle: () => {
      if (destroyed) return;
      pose.wiggleAt = now();
      if (mode === "ghost")
        agent.manualUntil = Math.max(agent.manualUntil, now() + Math.max(settingsRef.current.idleDelay, 2));
      schedule();
    },
    destroy: () => {
      destroyed = true;
      if (raf) view.cancelAnimationFrame(raf);
      observer?.disconnect();
      root.removeEventListener("pointermove", track);
      root.removeEventListener("pointerover", track);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointercancel", onLeave);
      view.removeEventListener("pointerup", onUp);
      view.removeEventListener("blur", onLeave);
      view.removeEventListener("scroll", onScroll, { capture: true });
      fine.removeEventListener("change", onPreference);
      setActive(false);
      settleArrivals();
      for (const ring of rings) for (const animation of ring.getAnimations()) animation.cancel();
    },
  };
};

export const GyroscopeCursor = forwardRef<GyroscopeCursorHandle, GyroscopeCursorProps>(function GyroscopeCursor(
  {
    color = "#5227FF",
    outlineColor = "#FFFFFF",
    size = 24,
    outlineWidth = 3,
    shadow = 0.5,
    turn = 1,
    turnSpeed = 1,
    overshoot = 0.4,
    stretch = 0.4,
    settle = 0.45,
    restAngle = -45,
    press = true,
    ripple = true,
    hover = true,
    label = "",
    autoplay = false,
    autoplaySpeed = 1,
    idleDelay = 1.5,
    interactive = true,
    disabled = false,
    className,
    style,
    children,
  },
  ref,
) {
  const scope = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const ringsRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<Controller | null>(null);
  const reduced = useSyncExternalStore(subscribeToMotion, readMotion, () => false);

  const settings: Settings = {
    color,
    outlineColor,
    size,
    outlineWidth,
    shadow,
    turn,
    turnSpeed,
    overshoot,
    stretch,
    settle,
    restAngle,
    press,
    ripple,
    hover,
    label,
    autoplay,
    autoplaySpeed,
    idleDelay,
    interactive,
    disabled,
    reduced,
  };
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
    controllerRef.current?.sync();
  });

  useEffect(() => {
    const root = rootRef.current;
    const body = bodyRef.current;
    const arrow = arrowRef.current;
    const path = pathRef.current;
    const tag = tagRef.current;
    const holder = ringsRef.current;
    if (!root || !body || !arrow || !path || !tag || !holder) return;
    const rings = Array.from(holder.children) as HTMLElement[];
    const controller = createCursor({ root, body, arrow, path, tag, rings }, settingsRef);
    controllerRef.current = controller;
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      moveTo: (x: number, y: number, duration?: number) =>
        controllerRef.current?.moveTo(x, y, duration) ?? Promise.resolve(),
      click: () => controllerRef.current?.click(),
      wiggle: () => controllerRef.current?.wiggle(),
    }),
    [],
  );

  return (
    <div
      ref={rootRef}
      data-gyroscope-cursor={scope}
      className={cn("relative isolate h-full min-h-[240px] w-full", className)}
      style={style}
    >
      <style>{scopeStyles(scope)}</style>
      {children}
      <div
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 2147483000 }}
      >
        <div ref={ringsRef}>
          {Array.from({ length: RINGS }, (_, index) => (
            <div
              key={index}
              style={{
                position: "absolute",
                borderRadius: "50%",
                borderStyle: "solid",
                borderWidth: 2,
                opacity: 0,
                pointerEvents: "none",
              }}
            />
          ))}
        </div>
        <div
          ref={tagRef}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            opacity: 0,
            padding: "0.36em 0.62em 0.4em",
            borderRadius: "0.55em",
            fontWeight: 600,
            lineHeight: 1,
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
            transformOrigin: "0 0",
            willChange: "transform, opacity",
          }}
        />
        <div
          ref={bodyRef}
          style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, opacity: 0, willChange: "transform, opacity" }}
        >
          <svg ref={arrowRef} style={{ position: "absolute", overflow: "visible", willChange: "transform" }} focusable="false">
            <path ref={pathRef} strokeLinejoin="round" paintOrder="stroke" />
          </svg>
        </div>
      </div>
    </div>
  );
});

GyroscopeCursor.displayName = "GyroscopeCursor";

export default GyroscopeCursor;
