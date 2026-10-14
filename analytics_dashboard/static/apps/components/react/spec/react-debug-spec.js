import {
  enableReactDebugIfRequested,
  isReactDebugEnabled,
  markFallback,
  markRendered,
  resetReactDebugForTests,
} from 'components/react/react-debug';

describe('React debug outline', () => {
  const STORAGE_KEY = 'insights.reactDebug';
  const styleElements = () => document.querySelectorAll('#insights-react-debug-styles');

  beforeEach(() => {
    resetReactDebugForTests();
    window.localStorage.removeItem(STORAGE_KEY);
  });

  afterEach(() => {
    resetReactDebugForTests();
    window.localStorage.removeItem(STORAGE_KEY);
  });

  describe('isReactDebugEnabled', () => {
    it('is off when there is no parameter and nothing is stored', () => {
      expect(isReactDebugEnabled('')).toBe(false);
    });

    it('turns on with ?react_debug=1 and remembers it', () => {
      expect(isReactDebugEnabled('?react_debug=1')).toBe(true);
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('1');
      expect(isReactDebugEnabled('')).toBe(true);
    });

    it('finds the parameter among others', () => {
      expect(isReactDebugEnabled('?foo=bar&react_debug=1&baz=2')).toBe(true);
    });

    it('turns off with ?react_debug=0', () => {
      window.localStorage.setItem(STORAGE_KEY, '1');

      expect(isReactDebugEnabled('?react_debug=0')).toBe(false);
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('ignores other values and similar parameter names', () => {
      expect(isReactDebugEnabled('?react_debug=yes')).toBe(false);
      expect(isReactDebugEnabled('?not_react_debug=1')).toBe(false);
    });

    it('stays off, without an error, when localStorage fails', () => {
      // Spy on the prototype: assigning to localStorage.getItem would store an item instead.
      spyOn(Storage.prototype, 'getItem').and.throwError('blocked');

      expect(isReactDebugEnabled('')).toBe(false);
    });
  });

  describe('enableReactDebugIfRequested', () => {
    it('adds no stylesheet when debug is off', () => {
      enableReactDebugIfRequested('');

      expect(styleElements().length).toBe(0);
    });

    it('adds the stylesheet once when debug is on', () => {
      enableReactDebugIfRequested('?react_debug=1');
      enableReactDebugIfRequested('?react_debug=1');

      expect(styleElements().length).toBe(1);
      expect(styleElements()[0].textContent).toContain('[data-react-rendered]');
      expect(styleElements()[0].textContent).toContain('[data-react-fallback]');
    });
  });

  describe('markers', () => {
    let element;

    beforeEach(() => {
      setFixtures('<div id="widget" data-react-widget="total-enrollment"></div>');
      element = document.getElementById('widget');
    });

    it('marks a rendered widget with its name', () => {
      markRendered(element, 'total-enrollment');

      expect(element.getAttribute('data-react-rendered')).toBe('total-enrollment');
      expect(element.hasAttribute('data-react-fallback')).toBe(false);
    });

    it('replaces the rendered marker with a fallback marker', () => {
      markRendered(element, 'total-enrollment');
      markFallback(element, 'total-enrollment');

      expect(element.hasAttribute('data-react-rendered')).toBe(false);
      expect(element.getAttribute('data-react-fallback')).toBe('total-enrollment');
    });

    it('takes the fallback name from data-react-widget when none is given', () => {
      markFallback(element);

      expect(element.getAttribute('data-react-fallback')).toBe('total-enrollment');
    });
  });
});
