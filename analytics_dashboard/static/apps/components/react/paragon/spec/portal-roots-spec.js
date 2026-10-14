import ensureParagonRoots, { ROOT_IDS } from 'components/react/paragon/portal-roots';

describe('ensureParagonRoots', () => {
  const removeRoots = () => {
    ROOT_IDS.forEach((id) => {
      const root = document.getElementById(id);
      if (root) {
        root.parentNode.removeChild(root);
      }
    });
  };

  beforeEach(removeRoots);
  afterEach(removeRoots);

  it('creates Paragon\'s three portal roots in the body, with the scope class', () => {
    ensureParagonRoots();

    expect(ROOT_IDS).toEqual(['paragon-portal-root', 'toast-root', 'sheet-root']);
    ROOT_IDS.forEach((id) => {
      const root = document.getElementById(id);
      expect(root).not.toBeNull();
      expect(root.parentNode).toBe(document.body);
      expect(root.classList.contains('paragon-styles')).toBe(true);
    });
  });

  it('creates each root only once, however many times it is called', () => {
    ensureParagonRoots();
    ensureParagonRoots();

    ROOT_IDS.forEach((id) => {
      expect(document.querySelectorAll(`#${id}`).length).toBe(1);
    });
  });

  it('keeps an existing root and adds the scope class to it', () => {
    const existing = document.createElement('div');
    existing.setAttribute('id', 'toast-root');
    document.body.appendChild(existing);

    ensureParagonRoots();

    expect(document.getElementById('toast-root')).toBe(existing);
    expect(existing.classList.contains('paragon-styles')).toBe(true);
  });
});
