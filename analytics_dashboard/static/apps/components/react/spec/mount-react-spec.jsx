import { act } from 'react';
import PropTypes from 'prop-types';
import { configureStore } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

import mountReact from 'components/react/mount-react';

function Greeting({ name }) {
  return <p className="greeting">Hello {name}</p>;
}

Greeting.propTypes = {
  name: PropTypes.string.isRequired,
};

function StoreValue() {
  const value = useSelector(state => state.value);
  return <p className="store-value">{value}</p>;
}

describe('mountReact', () => {
  let element;

  beforeEach(() => {
    setFixtures('<div id="mount-point"><p>Server-rendered content</p></div>');
    element = document.getElementById('mount-point');
  });

  it('renders the component with its props in place of the element content', () => {
    let unmount;
    act(() => {
      unmount = mountReact(element, Greeting, { props: { name: 'Insights' } });
    });

    expect(element.textContent).toBe('Hello Insights');
    act(() => unmount());
  });

  it('wraps the component in a Redux Provider when a store is given', () => {
    const store = configureStore({ reducer: (state = { value: 'From the store' }) => state });
    let unmount;
    act(() => {
      unmount = mountReact(element, StoreValue, { store });
    });

    expect(element.querySelector('.store-value').textContent).toBe('From the store');
    act(() => unmount());
  });

  it('returns a function that unmounts the component', () => {
    let unmount;
    act(() => {
      unmount = mountReact(element, Greeting, { props: { name: 'Insights' } });
    });
    act(() => unmount());

    expect(element.innerHTML).toBe('');
  });

  it('throws when there is no element to render into', () => {
    expect(() => mountReact(null, Greeting)).toThrowError(/no element to render Greeting into/);
  });
});
