import { act } from 'react';
import { createRoot } from 'react-dom/client';

import ignoreExpectedErrors from 'components/react/spec/ignore-expected-errors';
import SectionBoundary from 'course-list/react/components/SectionBoundary';

function Fine() {
  return <p className="fine">Works</p>;
}

function Broken() {
  throw new Error('Section failed on purpose');
}

function Fallback() {
  return <p className="fallback">Fallback</p>;
}

describe('SectionBoundary', () => {
  let element;
  let root;
  let restoreOnError;

  const render = (content) => {
    act(() => {
      root.render(content);
    });
  };

  beforeEach(() => {
    restoreOnError = ignoreExpectedErrors(['Section failed on purpose']);
    // React logs errors that an error boundary caught to the console in development builds.
    spyOn(console, 'error');
    setFixtures('<div id="section-boundary-root"></div>');
    element = document.getElementById('section-boundary-root');
    root = createRoot(element);
  });

  afterEach(() => {
    act(() => root.unmount());
    restoreOnError();
  });

  it('renders its children when none fails', () => {
    render(<SectionBoundary name="section" fallback={Fallback}><Fine /></SectionBoundary>);

    expect(element.querySelector('.fine')).not.toBeNull();
    expect(element.querySelector('.fallback')).toBeNull();
  });

  it('renders the fallback in place of the children when one throws, and tells onError', () => {
    const onError = jasmine.createSpy('onError');

    render(<SectionBoundary name="section" fallback={Fallback} onError={onError}><Broken /></SectionBoundary>);

    expect(element.querySelector('.fallback')).not.toBeNull();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.calls.argsFor(0)[0]).toBe('section');
    expect(onError.calls.argsFor(0)[1].message).toBe('Section failed on purpose');
  });

  it('works without an onError', () => {
    render(<SectionBoundary name="section" fallback={Fallback}><Broken /></SectionBoundary>);

    expect(element.querySelector('.fallback')).not.toBeNull();
  });

  it('leaves its siblings working when it fails', () => {
    render(
      <>
        <SectionBoundary name="first" fallback={Fallback}><Broken /></SectionBoundary>
        <SectionBoundary name="second" fallback={Fallback}><Fine /></SectionBoundary>
      </>,
    );

    expect(element.querySelectorAll('.fallback').length).toBe(1);
    expect(element.querySelectorAll('.fine').length).toBe(1);
  });
});
