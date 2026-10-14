// Checks for the Paragon build helpers in webpack/paragon/. Run with `npm run check:paragon`.
// Plain Node (no test framework): the helpers run in webpack, not in the browser, so Karma can't test them.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const babel = require('@babel/core');

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
