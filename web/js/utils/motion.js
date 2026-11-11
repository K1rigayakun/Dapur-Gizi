/**
 * DapurGizi Motion System — Powered by Local Anime.js v4
 * Implements the 7 signature animations and respects prefers-reduced-motion:
 * A. Liquid Highlight Button (pointer-following radial light, elevation, spring press)
 * B. Magnetic Button (subtle pointer pull within small limits)
 * C. Sidebar Indicator (smooth sliding active pill)
 * D. Glass Cards (subtle 3D tilt & pointer highlight on KPI cards)
 * E. Page Transitions (fade & slide with subtle stagger, 400–550ms)
 * F. Modal Transitions (natural grow from trigger coordinates, 250–400ms)
 * G. Data Animations (KPI count-up, SVG chart drawing, progress fill, status pulse, toast entrance, checkmark draw)
 */

import {
  animate,
  createTimeline,
  stagger,
  createSpring,
  createAnimatable,
  createDraggable,
  svg,
  utils
} from '../../vendor/anime/anime.esm.js';

export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * A & B. Liquid Highlight + Magnetic Buttons
 * Binds pointer-following radial glow, press compression with createSpring, and magnetic pull.
 */
export function bindInteractiveButtons(root = document) {
  if (!root || prefersReducedMotion()) return;

  const liquidButtons = root.querySelectorAll('.btn-liquid:not([data-motion-bound])');
  liquidButtons.forEach((btn) => {
    btn.dataset.motionBound = 'true';
    const isMagnetic = btn.classList.contains('btn-magnetic');

    const animatable = createAnimatable(btn, {
      x: { duration: 220, ease: 'outQuart', unit: 'px' },
      y: { duration: 220, ease: 'outQuart', unit: 'px' },
      scale: { duration: 180, ease: 'outQuart', unit: '' }
    });

    btn.addEventListener('pointermove', (e) => {
      if (btn.disabled) return;
      const rect = btn.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      btn.style.setProperty('--liquid-x', `${Math.round(relX)}px`);
      btn.style.setProperty('--liquid-y', `${Math.round(relY)}px`);
      btn.style.setProperty('--liquid-opacity', '1');

      if (isMagnetic) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const pullX = utils.clamp((relX - centerX) * 0.14, -5, 5);
        const pullY = utils.clamp((relY - centerY) * 0.18, -3.5, 3.5);
        animatable.x(pullX);
        animatable.y(pullY);
      }
    });

    btn.addEventListener('pointerleave', () => {
      btn.style.setProperty('--liquid-opacity', '0');
      animatable.x(0, 260);
      animatable.y(0, 260);
      animatable.scale(1, 220);
    });

    btn.addEventListener('pointerdown', () => {
      if (btn.disabled) return;
      animate(btn, {
        scale: 0.96,
        duration: 150,
        ease: 'outQuad'
      });
    });

    btn.addEventListener('pointerup', () => {
      if (btn.disabled) return;
      animate(btn, {
        scale: 1,
        duration: 280,
        ease: createSpring({ mass: 1, stiffness: 260, damping: 16 })
      });
    });
  });
}

/**
 * C. Sidebar Indicator Slide
 * Smoothly glides the active indicator pill to the active navigation item.
 */
let sidebarIndicatorAnimatable = null;

export function animateSidebarIndicator(navContainer, indicatorEl, activeItemEl) {
  if (!navContainer || !indicatorEl || !activeItemEl) return;
  const navRect = navContainer.getBoundingClientRect();
  const itemRect = activeItemEl.getBoundingClientRect();
  const targetY = itemRect.top - navRect.top + navContainer.scrollTop;
  const targetH = itemRect.height;

  indicatorEl.style.opacity = '1';

  if (prefersReducedMotion()) {
    utils.set(indicatorEl, { translateY: targetY, height: targetH });
    return;
  }

  if (!sidebarIndicatorAnimatable || sidebarIndicatorAnimatable.targets[0] !== indicatorEl) {
    sidebarIndicatorAnimatable = createAnimatable(indicatorEl, {
      translateY: { duration: 280, ease: createSpring({ mass: 1, stiffness: 220, damping: 20 }), unit: 'px' },
      height: { duration: 240, ease: 'outQuart', unit: 'px' }
    });
  }
  sidebarIndicatorAnimatable.translateY(targetY);
  sidebarIndicatorAnimatable.height(targetH);
}

/**
 * D. Glass Cards Interactive Tilt & Pointer Highlight
 */
export function bindGlassCards(root = document) {
  if (!root || prefersReducedMotion()) return;
  const cards = root.querySelectorAll('.kpi-glass-card:not([data-tilt-bound])');
  cards.forEach((card) => {
    card.dataset.tiltBound = 'true';
    const animatable = createAnimatable(card, {
      rotateX: { duration: 240, ease: 'outQuart', unit: 'deg' },
      rotateY: { duration: 240, ease: 'outQuart', unit: 'deg' },
      translateY: { duration: 240, ease: 'outQuart', unit: 'px' }
    });

    card.addEventListener('pointermove', (e) => {
      const rect = card.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      const pctX = (relX / rect.width - 0.5) * 2;
      const pctY = (relY / rect.height - 0.5) * 2;

      card.style.setProperty('--card-glow-x', `${Math.round(relX)}px`);
      card.style.setProperty('--card-glow-y', `${Math.round(relY)}px`);
      card.style.setProperty('--card-glow-opacity', '1');

      animatable.rotateX(utils.clamp(-pctY * 2.2, -2.5, 2.5));
      animatable.rotateY(utils.clamp(pctX * 2.2, -2.5, 2.5));
      animatable.translateY(-2);
    });

    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--card-glow-opacity', '0');
      animatable.rotateX(0, 280);
      animatable.rotateY(0, 280);
      animatable.translateY(0, 280);
    });
  });
}

/**
 * E. Page Transitions (400–550ms fade & slide with subtle stagger)
 */
export function animatePageEnter(container) {
  if (!container) return;
  if (prefersReducedMotion()) {
    utils.set(container, { opacity: 1, translateY: 0 });
    return;
  }

  const header = container.querySelector('.page-header');
  const sections = container.querySelectorAll('.anim-section, .kpi-glass-card, .glass-panel');

  const tl = createTimeline({
    defaults: { ease: 'outQuart' }
  });

  if (header) {
    tl.add(
      header,
      {
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 400
      },
      0
    );
  }

  if (sections.length > 0) {
    tl.add(
      sections,
      {
        opacity: [0, 1],
        translateY: [14, 0],
        duration: 460,
        delay: stagger(45, { start: 40 })
      },
      0
    );
  } else {
    tl.add(
      container,
      {
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 420
      },
      0
    );
  }
}

/**
 * F. Modal Transitions (250–400ms grow from trigger position)
 */
export function animateModalOpen(backdropEl, dialogEl, triggerRect = null) {
  if (!backdropEl || !dialogEl) return;
  if (prefersReducedMotion()) {
    utils.set(backdropEl, { opacity: 1 });
    utils.set(dialogEl, { opacity: 1, scale: 1, translateX: 0, translateY: 0 });
    return;
  }

  let startX = 0;
  let startY = 18;
  if (triggerRect && typeof window !== 'undefined') {
    const vw = window.innerWidth / 2;
    const vh = window.innerHeight / 2;
    const trigCenterX = triggerRect.left + triggerRect.width / 2;
    const trigCenterY = triggerRect.top + triggerRect.height / 2;
    startX = utils.clamp((trigCenterX - vw) * 0.18, -80, 80);
    startY = utils.clamp((trigCenterY - vh) * 0.18, -60, 60);
  }

  animate(backdropEl, {
    opacity: [0, 1],
    duration: 260,
    ease: 'outQuad'
  });

  animate(dialogEl, {
    opacity: [0, 1],
    scale: [0.92, 1],
    translateX: [startX, 0],
    translateY: [startY, 0],
    duration: 320,
    ease: createSpring({ mass: 1, stiffness: 240, damping: 20 })
  });
}

export function animateModalClose(backdropEl, dialogEl) {
  if (!backdropEl || !dialogEl || prefersReducedMotion()) {
    return Promise.resolve();
  }
  animate(backdropEl, {
    opacity: [1, 0],
    duration: 220,
    ease: 'inQuad'
  });
  return animate(dialogEl, {
    opacity: [1, 0],
    scale: [1, 0.95],
    translateY: [0, 10],
    duration: 240,
    ease: 'inQuad'
  });
}

/**
 * G1. KPI Count-Up Animation
 */
export function animateCountUp(el, targetValue, formatter = (v) => Math.round(v).toLocaleString('id-ID'), duration = 520) {
  if (!el) return;
  const numTarget = Number(targetValue) || 0;
  if (prefersReducedMotion()) {
    el.textContent = formatter(numTarget);
    return;
  }
  const stateObj = { val: 0 };
  animate(stateObj, {
    val: numTarget,
    duration,
    ease: 'outExpo',
    onUpdate: () => {
      el.textContent = formatter(stateObj.val);
    },
    onComplete: () => {
      el.textContent = formatter(numTarget);
    }
  });
}

/**
 * G2. SVG Chart & Checkmark Path Drawing
 */
export function animateSvgDraw(root = document, selector = '.anim-draw-path', duration = 520) {
  if (!root) return;
  const paths = svg.createDrawable(root.querySelectorAll(selector));
  if (!paths.length) return;
  if (prefersReducedMotion()) {
    paths.forEach((p) => {
      p.style.strokeDashoffset = '0';
    });
    return;
  }
  animate(paths, {
    strokeDashoffset: 0,
    duration,
    delay: stagger(65),
    ease: 'outQuart'
  });
}

/**
 * G3. Progress Bar Fill Animation
 */
export function animateProgressFill(root = document) {
  if (!root) return;
  const bars = root.querySelectorAll('.progress-bar-fill[data-target-width]');
  if (!bars.length) return;
  bars.forEach((bar) => {
    const pct = Math.min(100, Math.max(0, Number(bar.dataset.targetWidth) || 0));
    if (prefersReducedMotion()) {
      bar.style.width = `${pct}%`;
      return;
    }
    animate(bar, {
      width: ['0%', `${pct}%`],
      duration: 500,
      ease: 'outExpo'
    });
  });
}

/**
 * G4. Toast Entrance & Exit (250–350ms)
 */
export function animateToastEnter(toastEl) {
  if (!toastEl || prefersReducedMotion()) return;
  animate(toastEl, {
    opacity: [0, 1],
    translateX: [28, 0],
    scale: [0.95, 1],
    duration: 280,
    ease: createSpring({ mass: 1, stiffness: 250, damping: 19 })
  });
}

export function animateToastExit(toastEl) {
  if (!toastEl || prefersReducedMotion()) return Promise.resolve();
  return animate(toastEl, {
    opacity: [1, 0],
    translateX: [0, 24],
    scale: [1, 0.95],
    duration: 240,
    ease: 'inQuad'
  });
}

/**
 * G5. Status Badge Pulse Transition
 */
export function animateStatusTransition(el) {
  if (!el || prefersReducedMotion()) return;
  animate(el, {
    scale: [0.9, 1.06, 1],
    duration: 260,
    ease: 'outBack'
  });
}

export { animate, createTimeline, stagger, createSpring, createAnimatable, createDraggable, utils };
