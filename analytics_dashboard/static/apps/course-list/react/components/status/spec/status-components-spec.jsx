import { act } from 'react';
import { createRoot } from 'react-dom/client';

import ParagonProvider from 'components/react/paragon/ParagonProvider';
import EmptyState from 'course-list/react/components/status/EmptyState';
import ErrorState from 'course-list/react/components/status/ErrorState';
import LoadingState from 'course-list/react/components/status/LoadingState';

describe('status components', () => {
  let element;
  let root;

  const render = (content) => {
    act(() => {
      root.render(<ParagonProvider>{content}</ParagonProvider>);
    });
  };

  beforeEach(() => {
    setFixtures('<div id="status-root"></div>');
    element = document.getElementById('status-root');
    root = createRoot(element);
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it('LoadingState shows a spinner and the word Loading', () => {
    render(<LoadingState />);

    expect(element.querySelector('.spinner-border')).not.toBeNull();
    expect(element.textContent).toContain('Loading');
  });

  describe('EmptyState', () => {
    it('shows its message', () => {
      render(<EmptyState message="No courses matched your criteria." />);

      expect(element.querySelector('.insights-empty-state-message').textContent).toBe('No courses matched your criteria.');
      expect(element.querySelectorAll('p').length).toBe(1);
    });

    it('shows its detail after the message when there is one', () => {
      render(<EmptyState message="No data." detail="Check back later." />);

      expect(element.querySelectorAll('p').length).toBe(2);
      expect(element.textContent).toContain('Check back later.');
    });
  });

  describe('ErrorState', () => {
    it('is the Insights error alert, with an icon, a title and a line of text', () => {
      render(<ErrorState />);

      const alert = element.querySelector('.alert.alert-error[role="alert"]');
      expect(alert).not.toBeNull();
      expect(alert.querySelector('.alert-icon.fa-warning')).not.toBeNull();
      expect(alert.querySelector('.alert-title').textContent).toBe('We are unable to load this section.');
      expect(alert.querySelector('.alert-copy-with-title').textContent).toBe('Reload the page to try again.');
    });
  });
});
