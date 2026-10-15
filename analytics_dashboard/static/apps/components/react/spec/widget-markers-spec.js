import { markFallback, markRendered } from 'components/react/widget-markers';

describe('Widget markers', () => {
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
