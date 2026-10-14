// Paragon renders modals, toasts and sheets into elements it creates in <body>, outside any .paragon-styles
// element, so they would be unstyled. Each of its components reuses the element if it already exists, so
// creating the elements first, with the scope class, keeps them styled. (Paragon's tooltips and popovers
// need no root; their styles are handled in the CSS, see webpack/paragon/scope-paragon-css.js.)
const ROOT_IDS = ['paragon-portal-root', 'toast-root', 'sheet-root'];

/** Creates Paragon's portal roots, with the scope class, if they don't exist yet. Safe to call repeatedly. */
export default function ensureParagonRoots() {
  ROOT_IDS.forEach((id) => {
    let root = document.getElementById(id);
    if (!root) {
      root = document.createElement('div');
      root.setAttribute('id', id);
      document.body.appendChild(root);
    }
    root.classList.add('paragon-styles');
  });
}

export { ROOT_IDS };
