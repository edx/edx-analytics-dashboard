// Babel plugin: makes webpack 3 bundle only the Paragon icons and components that are used.
// Webpack 3 ignores "sideEffects": false, so importing from an index file bundles everything it re-exports
// (all 2,319 icons, every component). The source code keeps the MFE import style; only this build rewrites it:
//  (a) import { Close } from '@openedx/paragon/icons'   (or Paragon's own '../../icons')
//        → import Close from '@openedx/paragon/icons/es5/Close'
//  (b) import { Card, OverlayTrigger } from '@openedx/paragon'   (when options.components is true)
//        → import Card from '@openedx/paragon/dist/Card';
//          import { OverlayTrigger } from '@openedx/paragon/dist/Overlay';
// A name the plugin doesn't know leaves the whole import unchanged, so it is always safe.
const fs = require('fs');
const path = require('path');

// Reads `export { a, default as B, c as D } from './file';` statements, including multi-line ones.
function readExportMap(file) {
  const map = {};
  const pattern = /export\s*\{([^}]*)\}\s*from\s*['"]\.\/([^'"]+)['"]/g;
  const source = fs.readFileSync(file, 'utf8');
  let match = pattern.exec(source);
  while (match) {
    const target = match[2];
    match[1].split(',').map(spec => spec.trim()).filter(Boolean).forEach((spec) => {
      const [imported, exported] = spec.split(/\s+as\s+/).map(part => part.trim());
      map[exported || imported] = { file: target, imported };
    });
    match = pattern.exec(source);
  }
  return map;
}

module.exports = function paragonImports({ types: t }, options) {
  const { paragonDir } = options;
  const iconMap = readExportMap(path.join(paragonDir, 'icons/es5/index.js'));
  const componentMap = readExportMap(path.join(paragonDir, 'dist/index.js'));
  const isIconIndex = source => source === '@openedx/paragon/icons' || /^(\.\.\/)+icons$/.test(source);

  return {
    name: 'paragon-imports',
    visitor: {
      ImportDeclaration(nodePath) {
        const { source: { value: source }, specifiers } = nodePath.node;
        if (!specifiers.length || specifiers.some(specifier => !t.isImportSpecifier(specifier))) {
          return;
        }

        let resolve = null;
        if (isIconIndex(source)) {
          resolve = (name) => {
            const entry = iconMap[name];
            return entry && entry.imported === 'default'
              ? { from: `${source}/es5/${entry.file}`, imported: 'default' }
              : null;
          };
        } else if (options.components && source === '@openedx/paragon') {
          resolve = (name) => {
            const entry = componentMap[name];
            return entry ? { from: `@openedx/paragon/dist/${entry.file}`, imported: entry.imported } : null;
          };
        }
        if (!resolve) {
          return;
        }

        const resolved = specifiers.map(specifier => ({ specifier, target: resolve(specifier.imported.name) }));
        if (resolved.some(({ target }) => !target)) {
          return;
        }
        nodePath.replaceWithMultiple(resolved.map(({ specifier, target }) => t.importDeclaration(
          [target.imported === 'default'
            ? t.importDefaultSpecifier(t.identifier(specifier.local.name))
            : t.importSpecifier(t.identifier(specifier.local.name), t.identifier(target.imported))],
          t.stringLiteral(target.from),
        )));
      },
    },
  };
};
