import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useIntl } from 'react-intl';
import { SearchField } from '@openedx/paragon';

import ParagonProvider from 'components/react/paragon/ParagonProvider';

function Locale() {
  return <span className="locale">{useIntl().locale}</span>;
}

describe('ParagonProvider', () => {
  let element;
  let root;

  const render = (content) => {
    act(() => {
      root.render(content);
    });
  };

  beforeEach(() => {
    setFixtures('<div id="paragon-provider-root"></div>');
    element = document.getElementById('paragon-provider-root');
    root = createRoot(element);
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it('renders its children inside an element with the paragon-styles class', () => {
    render(<ParagonProvider><p className="child">Hello</p></ParagonProvider>);

    const scope = element.querySelector('.paragon-styles');
    expect(scope).not.toBeNull();
    expect(scope.querySelector('.child').textContent).toBe('Hello');
    expect(element.firstElementChild).toBe(scope);
  });

  it('provides English to react-intl', () => {
    render(<ParagonProvider><Locale /></ParagonProvider>);

    expect(element.querySelector('.locale').textContent).toBe('en');
  });

  it('lets Paragon components that need react-intl render', () => {
    render(<ParagonProvider><SearchField onSubmit={() => {}} /></ParagonProvider>);

    expect(element.querySelector('.paragon-styles input')).not.toBeNull();
  });
});
