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

  it('wraps the component in the wrapper option, inside the Redux Provider', () => {
    function Wrapper({ children }) {
      const value = useSelector(state => state.value);
      return <div className="wrapper" data-value={value}>{children}</div>;
    }
    Wrapper.propTypes = { children: PropTypes.node.isRequired };
    const store = configureStore({ reducer: (state = { value: 'From the store' }) => state });
    let unmount;
    act(() => {
      unmount = mountReact(element, Greeting, { store, wrapper: Wrapper, props: { name: 'Insights' } });
    });

    const wrapper = element.querySelector('.wrapper');
    expect(wrapper.getAttribute('data-value')).toBe('From the store');
    expect(wrapper.querySelector('.greeting').textContent).toBe('Hello Insights');
    act(() => unmount());
  });

  it('returns a function that unmounts the component', () => {
    let unmount;
    act(() => {
      unmount = mountReact(element, Greeting, { props: { name: 'Insights' } });
    });
    act(() => unmount());

    expect(element.innerHTML).toBe('<p>Server-rendered content</p>');
  });

  it('marks the element with the widget name after a successful render, and unmarks it on unmount', () => {
    element.setAttribute('data-react-widget', 'greeting');
    let unmount;
    act(() => {
      unmount = mountReact(element, Greeting, { props: { name: 'Insights' } });
    });

    expect(element.getAttribute('data-react-rendered')).toBe('greeting');

    act(() => unmount());

    expect(element.hasAttribute('data-react-rendered')).toBe(false);
  });

  it('uses the name option for the marker when given', () => {
    let unmount;
    act(() => {
      unmount = mountReact(element, Greeting, { props: { name: 'Insights' }, name: 'named-widget' });
    });

    expect(element.getAttribute('data-react-rendered')).toBe('named-widget');
    act(() => unmount());
  });

  it('throws when there is no element to render into', () => {
    expect(() => mountReact(null, Greeting)).toThrowError(/no element to render Greeting into/);
  });
});
