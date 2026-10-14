// Makes Paragon's prebuilt CSS safe to load on Insights' Bootstrap 3 pages.
//
// Paragon's CSS (dist/core.min.css, dist/light.min.css) is written for Bootstrap 4 and styles bare elements and
// generic class names (.btn, .row, .card, h1, body, ...) that Insights' Bootstrap 3 CSS also uses. Loaded as-is,
// it would restyle the whole page. This module rewrites it so that:
//  - every rule applies only inside an element with the class .paragon-styles (SCOPE);
//  - :root rules, which only define --pgn-* custom properties, stay global: they style nothing by themselves;
//  - html and body rules apply to the scope element itself;
//  - tooltips and popovers, which react-bootstrap renders into <body>, outside the scope, get extra rules that
//    match only Bootstrap 4's placement classes (bs-tooltip-*, bs-popover-*). Insights' jQuery (Bootstrap 3)
//    tooltips never have those classes, so they are unaffected.
// Other changes: @media (--pgn-...) custom media queries, which browsers ignore, are resolved from Paragon's own
// definitions; rem values become px at a 16px base, because Insights sets html { font-size: 14px } and Paragon's
// rem sizes assume 16px; :export blocks (CSS-modules metadata) are dropped.
//
// The result is verified: if any selector is left that is neither scoped, :root, nor a tooltip/popover rule, this
// throws, so a leak can't be shipped by accident.
const postcss = require('postcss');
const prefixer = require('postcss-prefix-selector');

const SCOPE = '.paragon-styles';
const OVERLAY_SELECTOR = /\.(tooltip|popover|bs-tooltip-|bs-popover-)/;
const OVERLAY_RESULT = /\[class\*="bs-(tooltip|popover)-"\]|\.bs-(tooltip|popover)-/;
const REM_TO_PX = 16;

const isInKeyframes = rule => rule.parent.type === 'atrule' && /keyframes/.test(rule.parent.name);

function parseCustomMedia(customMediaCss) {
  const definitions = {};
  customMediaCss.replace(/@custom-media\s+(--[\w-]+)\s+([^;]+);/g, (match, name, query) => {
    definitions[name] = query.trim();
    return match;
  });
  return definitions;
}

const resolveCustomMedia = definitions => ({
  postcssPlugin: 'resolve-custom-media',
  AtRule: {
    media(atRule) {
      // eslint-disable-next-line no-param-reassign
      atRule.params = atRule.params.replace(/\((--[\w-]+)\)/g, (match, name) => definitions[name] || match);
    },
  },
});

// Media query rem units are left alone: they always use the browser default (16px), not the html font size.
const remToPx = () => ({
  postcssPlugin: 'rem-to-px',
  Declaration(declaration) {
    if (!/rem\b/.test(declaration.value)) {
      return;
    }
    // eslint-disable-next-line no-param-reassign
    declaration.value = declaration.value.replace(
      /(-?\d*\.?\d+)rem\b/g,
      (match, rem) => `${parseFloat((parseFloat(rem) * REM_TO_PX).toFixed(4))}px`,
    );
  },
});

// Uses Once, not a Rule visitor: PostCSS runs plugin functions such as the prefixer, and Once handlers, in order
// first, and visitors afterwards, so a Rule visitor would see :export after it was already prefixed.
const dropExport = () => ({
  postcssPlugin: 'drop-css-modules-export',
  Once(root) {
    root.walkRules((rule) => {
      if (rule.selector === ':export') {
        rule.remove();
      }
    });
  },
});

// .tooltip → .tooltip[class*="bs-tooltip-"], .tooltip-inner → [class*="bs-tooltip-"] .tooltip-inner, and the same
// for popovers, so the copies only match react-bootstrap's overlays.
function toOverlaySelector(selector) {
  return selector
    .replace(/\.tooltip-inner\b/g, '[class*="bs-tooltip-"] .tooltip-inner')
    .replace(/\.popover-(header|body)\b/g, '[class*="bs-popover-"] .popover-$1')
    .replace(/\.tooltip(?![-\w])/g, '.tooltip[class*="bs-tooltip-"]')
    .replace(/\.popover(?![-\w])/g, '.popover[class*="bs-popover-"]')
    // Paragon's popover variants (.popover-success, ...) are on the popover element itself.
    .replace(/\.popover-(?!header\b|body\b)([\w-]+)/g, '.popover-$1[class*="bs-popover-"]');
}

const addOverlayRules = () => ({
  postcssPlugin: 'paragon-overlay-rules',
  Once(root) {
    const copies = [];
    root.walkRules((rule) => {
      if (isInKeyframes(rule)) {
        return;
      }
      const selectors = rule.selectors.filter(selector => OVERLAY_SELECTOR.test(selector));
      if (!selectors.length) {
        return;
      }
      const copy = rule.clone({ selectors: selectors.map(toOverlaySelector) });
      copy.raws.paragonOverlayRule = true;
      copies.push({ rule, copy });
    });
    copies.forEach(({ rule, copy }) => rule.after(copy));
  },
});

const scopeRules = prefixer({
  prefix: SCOPE,
  transform(prefix, selector, prefixedSelector, filePath, rule) {
    if (rule.raws.paragonOverlayRule || selector === ':root') {
      return selector;
    }
    if (/^(html|body)$/.test(selector)) {
      return prefix;
    }
    if (/^(html|body)[\s>]/.test(selector)) {
      return selector.replace(/^(html|body)/, prefix);
    }
    return prefixedSelector;
  },
});

/**
 * Throws if any selector would apply outside the scope, or if a global :root rule sets anything but a --*
 * custom property (a custom property styles nothing by itself; any other declaration would restyle the whole
 * page). Returns counts, for logging and tests.
 */
function verifyScoped(css) {
  const unscoped = [];
  const globalDeclarations = [];
  const counts = { selectors: 0, scoped: 0, root: 0, overlay: 0 };
  postcss.parse(css).walkRules((rule) => {
    if (isInKeyframes(rule)) {
      return;
    }
    rule.selectors.forEach((selector) => {
      counts.selectors += 1;
      if (selector.startsWith(SCOPE)) {
        counts.scoped += 1;
      } else if (selector === ':root') {
        counts.root += 1;
        rule.each((node) => {
          if (node.type === 'decl' && !node.prop.startsWith('--')) {
            globalDeclarations.push(node.prop);
          }
        });
      } else if (OVERLAY_RESULT.test(selector)) {
        counts.overlay += 1;
      } else {
        unscoped.push(selector);
      }
    });
  });
  if (unscoped.length) {
    throw new Error(
      `Paragon CSS has ${unscoped.length} selector(s) that would apply outside ${SCOPE}: `
      + `${unscoped.slice(0, 10).join(' | ')}. Extend webpack/paragon/scope-paragon-css.js.`,
    );
  }
  if (globalDeclarations.length) {
    throw new Error(
      `Paragon CSS has a global :root rule with declarations other than --* custom properties: `
      + `${Array.from(new Set(globalDeclarations)).slice(0, 10).join(', ')}. They would restyle the whole page. `
      + 'Scope them in webpack/paragon/scope-paragon-css.js.',
    );
  }
  return counts;
}

/**
 * @param {string} css - Paragon's prebuilt CSS, or a file of --pgn-* overrides.
 * @param {string} customMediaCss - Paragon's styles/css/core/custom-media-breakpoints.css.
 * @returns {string} The scoped CSS.
 */
function scopeParagonCss(css, customMediaCss) {
  const result = postcss([
    resolveCustomMedia(parseCustomMedia(customMediaCss)),
    remToPx(),
    dropExport(),
    addOverlayRules(),
    scopeRules,
  ]).process(css, { from: undefined }).css;
  verifyScoped(result);
  return result;
}

module.exports = { SCOPE, scopeParagonCss, verifyScoped };
