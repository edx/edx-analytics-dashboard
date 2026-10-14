// Checks for the Paragon build helpers in webpack/paragon/. Run with `npm run check:paragon`.
// Plain Node (no test framework): the helpers run in webpack, not in the browser, so Karma can't test them.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const babel = require('@babel/core');
const postcss = require('postcss');

const { PARAGON_CSS_PATTERN } = require('./css');
const { scopeParagonCss, verifyScoped } = require('./scope-paragon-css');
const { TRANSPILED_PACKAGES_PATTERN } = require('./transpiled-packages');

const checks = [];
const check = (name, fn) => checks.push({ name, fn });

// A tiny stand-in for Paragon's index files, with the export styles the real ones use.
function createFakeParagon() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-paragon-'));
  fs.mkdirSync(path.join(dir, 'dist'));
  fs.mkdirSync(path.join(dir, 'icons', 'es5'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'dist', 'index.js'), [
    "export { default as Button, ButtonGroup } from './Button';",
    'export {',
    '  default as Card,',
    '  CardDeck,',
    "} from './Card';",
    "export { default as Overlay, OverlayTrigger } from './Overlay';",
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(dir, 'icons', 'es5', 'index.js'), [
    'export { default as InfoOutline } from "./InfoOutline";',
    'export { default as Close } from "./Close";',
    '',
  ].join('\n'));
  return dir;
}

const paragonDir = createFakeParagon();
const pluginPath = path.join(__dirname, 'babel-plugin-paragon-imports.js');

function transform(code, { components = true } = {}) {
  return babel.transformSync(code, {
    babelrc: false,
    configFile: false,
    sourceType: 'module',
    plugins: [[pluginPath, { paragonDir, components }]],
  }).code;
}

check('rewrites component imports into per-file imports', () => {
  const out = transform("import { Card, OverlayTrigger } from '@openedx/paragon';");
  assert.ok(out.includes('import Card from "@openedx/paragon/dist/Card"'), out);
  assert.ok(out.includes('import { OverlayTrigger } from "@openedx/paragon/dist/Overlay"'), out);
  assert.ok(!out.includes("from '@openedx/paragon'"), out);
});

check('reads multi-line export statements', () => {
  const out = transform("import { CardDeck } from '@openedx/paragon';");
  assert.ok(out.includes('import { CardDeck } from "@openedx/paragon/dist/Card"'), out);
});

check('keeps the local name of renamed imports', () => {
  const out = transform("import { Button as Btn } from '@openedx/paragon';");
  assert.ok(out.includes('import Btn from "@openedx/paragon/dist/Button"'), out);
});

check('rewrites icon imports, from the package and from Paragon\'s own relative path', () => {
  const fromPackage = transform("import { InfoOutline } from '@openedx/paragon/icons';");
  assert.ok(fromPackage.includes('import InfoOutline from "@openedx/paragon/icons/es5/InfoOutline"'), fromPackage);
  const relative = transform("import { Close } from '../../icons';");
  assert.ok(relative.includes('import Close from "../../icons/es5/Close"'), relative);
});

check('leaves the whole import alone when one name is unknown', () => {
  const code = "import { Card, NotAParagonComponent } from '@openedx/paragon';";
  assert.ok(transform(code).includes("from '@openedx/paragon'"));
});

check('leaves component imports alone when components is false', () => {
  const out = transform("import { Card } from '@openedx/paragon';", { components: false });
  assert.ok(out.includes("from '@openedx/paragon'"), out);
});

check('leaves other imports alone', () => {
  const out = transform("import React from 'react';\nimport * as all from '@openedx/paragon';");
  assert.ok(out.includes("from 'react'") && out.includes("import * as all from '@openedx/paragon'"), out);
});

check('the transpile pattern matches the Paragon packages with / and \\ separators, and nothing else', () => {
  [
    '/repo/node_modules/@openedx/paragon/dist/Card/index.js',
    'C:\\repo\\node_modules\\@openedx\\paragon\\dist\\Card\\index.js',
    '/repo/node_modules/@restart/hooks/esm/useMounted.js',
    '/repo/node_modules/imask/esm/imask.js',
    '/repo/node_modules/uuid/dist/esm-browser/v4.js',
  ].forEach(file => assert.ok(TRANSPILED_PACKAGES_PATTERN.test(file), file));
  [
    '/repo/node_modules/@restart/ui/esm/index.js',
    '/repo/node_modules/imask-extra/index.js',
    '/repo/node_modules/react/index.js',
    '/repo/analytics_dashboard/static/apps/imask/index.js',
  ].forEach(file => assert.ok(!TRANSPILED_PACKAGES_PATTERN.test(file), file));
});

check('the Paragon CSS pattern matches only Paragon and theme CSS, with / and backslash separators', () => {
  [
    '/repo/node_modules/@openedx/paragon/dist/core.min.css',
    'C:\\repo\\node_modules\\@openedx\\paragon\\dist\\light.min.css',
    '/repo/analytics_dashboard/static/apps/components/react/paragon/insights-theme.css',
    'C:\\repo\\analytics_dashboard\\static\\apps\\components\\react\\paragon\\insights-theme.css',
  ].forEach(file => assert.ok(PARAGON_CSS_PATTERN.test(file), file));
  [
    '/repo/node_modules/@openedx/paragon/dist/core.css',
    '/repo/node_modules/backgrid-paginator/backgrid-paginator.min.css',
    '/repo/analytics_dashboard/static/sass/style-application.scss',
    '/repo/analytics_dashboard/static/apps/components/react/other-theme.css',
  ].forEach(file => assert.ok(!PARAGON_CSS_PATTERN.test(file), file));
});

const CUSTOM_MEDIA = '@custom-media --pgn-size-breakpoint-min-width-sm (min-width: 576px);';
const scope = css => scopeParagonCss(css, CUSTOM_MEDIA);
const compact = css => css.replace(/\s+/g, ' ').trim();
const THEME_FILE = path.resolve(
  __dirname,
  '../../analytics_dashboard/static/apps/components/react/paragon/insights-theme.css',
);

check('scopes class and element selectors under .paragon-styles', () => {
  const out = compact(scope('.btn { color: red } h1, .row > .col { margin: 0 }'));
  assert.ok(out.includes('.paragon-styles .btn {'), out);
  assert.ok(out.includes('.paragon-styles h1, .paragon-styles .row > .col {'), out);
});

check('keeps :root global and turns html and body into the scope element', () => {
  const out = compact(scope(':root { --pgn-x: 1px } html { color: red } body { margin: 0 } body .x { top: 0 }'));
  assert.ok(out.includes(':root { --pgn-x: 1px }'), out);
  assert.ok(out.includes('.paragon-styles { color: red }'), out);
  assert.ok(out.includes('.paragon-styles { margin: 0 }'), out);
  assert.ok(out.includes('.paragon-styles .x {'), out);
});

check('adds tooltip and popover rules that only match Bootstrap 4 placement classes', () => {
  const out = compact(scope(
    '.tooltip { opacity: 0 } .tooltip-inner { color: #fff } .popover-header { top: 0 } '
    + '.popover-success { color: green }',
  ));
  assert.ok(out.includes('.tooltip[class*="bs-tooltip-"] {'), out);
  assert.ok(out.includes('[class*="bs-tooltip-"] .tooltip-inner {'), out);
  assert.ok(out.includes('[class*="bs-popover-"] .popover-header {'), out);
  assert.ok(out.includes('.popover-success[class*="bs-popover-"] {'), out);
  // The scoped copies are still there.
  assert.ok(out.includes('.paragon-styles .tooltip {'), out);
});

check('converts rem to px at a 16px base, but not in media queries', () => {
  const out = compact(scope(
    ':root { --pgn-size: 1.5rem } .a { margin: 0.25rem 2rem } @media (min-width: 40rem) { .b { top: 0 } }',
  ));
  assert.ok(out.includes('--pgn-size: 24px'), out);
  assert.ok(out.includes('margin: 4px 32px'), out);
  assert.ok(out.includes('@media (min-width: 40rem)'), out);
});

check('resolves custom media queries and drops :export blocks', () => {
  const out = compact(scope('@media (--pgn-size-breakpoint-min-width-sm) { .a { top: 0 } } :export { xs: 0 }'));
  assert.ok(out.includes('@media (min-width: 576px)'), out);
  assert.ok(!out.includes(':export'), out);
});

check('verifyScoped throws on a selector that would apply outside the scope', () => {
  assert.throws(() => verifyScoped('.paragon-styles .a { top: 0 } .leak { top: 0 }'), /\.leak/);
  assert.doesNotThrow(() => verifyScoped(':root { --x: 1px } .paragon-styles .a { top: 0 }'));
});

check('scopes the real Paragon CSS and the Insights theme with no leaks', () => {
  const paragonDir = path.dirname(require.resolve('@openedx/paragon/package.json'));
  const customMedia = fs.readFileSync(path.join(paragonDir, 'styles/css/core/custom-media-breakpoints.css'), 'utf8');
  [
    path.join(paragonDir, 'dist/core.min.css'),
    path.join(paragonDir, 'dist/light.min.css'),
    THEME_FILE,
  ].forEach((file) => {
    const counts = verifyScoped(scopeParagonCss(fs.readFileSync(file, 'utf8'), customMedia));
    assert.ok(counts.selectors > 0, file);
  });
});

check('verifyScoped throws on a global :root rule that sets more than custom properties', () => {
  assert.throws(() => verifyScoped(':root { --x: 1px; font-size: 10px }'), /font-size/);
  assert.throws(() => verifyScoped(':root { color: red } .paragon-styles .a { top: 0 }'), /color/);
  assert.doesNotThrow(() => verifyScoped(':root { --x: 1px; --y: 2px }'));
});

// @keyframes names are global, so scoping can't protect against a clash with another stylesheet. Paragon defines
// only these today, and Insights' own CSS has none of them (it defines fa-spin). When a Paragon upgrade adds or
// renames one, this fails so that someone checks the new name against Insights' CSS before updating the list.
const KNOWN_PARAGON_KEYFRAMES = [
  'progress-bar-stripes', 'react-loading-skeleton', 'spinner-border', 'spinner-grow',
];

check('Paragon defines only the @keyframes names that were checked against Insights\' CSS', () => {
  const paragonDir = path.dirname(require.resolve('@openedx/paragon/package.json'));
  const names = {};
  ['core.min.css', 'light.min.css'].forEach((file) => {
    postcss.parse(fs.readFileSync(path.join(paragonDir, 'dist', file), 'utf8')).walkAtRules(/keyframes$/, (rule) => {
      names[rule.params] = true;
    });
  });

  assert.deepStrictEqual(
    Object.keys(names).sort(),
    KNOWN_PARAGON_KEYFRAMES,
    'Paragon\'s @keyframes names changed. Check the new names against the @keyframes in Insights\' CSS '
    + '(grep -r "@keyframes" analytics_dashboard/static/sass node_modules/bootstrap-sass), then update '
    + 'KNOWN_PARAGON_KEYFRAMES in webpack/paragon/check-paragon-build.js.',
  );
});

check('the Insights theme sets the Insights font, colour and card border', () => {
  const theme = fs.readFileSync(THEME_FILE, 'utf8');
  assert.ok(theme.includes("'Open Sans'"));
  assert.ok(theme.includes('--pgn-color-primary-base: #0075B4;'));
  assert.ok(theme.includes('--pgn-color-card-border-base: #D4D2CF;'));
});

let failed = 0;
checks.forEach(({ name, fn }) => {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name}\n${error.message}`);
  }
});
fs.rmSync(paragonDir, { recursive: true, force: true });
console.log(failed ? `${failed} check(s) failed` : `${checks.length} checks passed`);
process.exit(failed ? 1 : 0);
