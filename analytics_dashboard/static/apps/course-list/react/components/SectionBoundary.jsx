import { Component } from 'react';
import PropTypes from 'prop-types';

/**
 * Shows `fallback` in place of its children when one of them throws while rendering, so a failing section
 * doesn't take the rest of the page down. It doesn't report anything itself: the page passes `onError(name, error)`.
 */
export default class SectionBoundary extends Component {
  static getDerivedStateFromError() {
    return { failed: true };
  }

  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  componentDidCatch(error) {
    this.props.onError(this.props.name, error);
  }

  render() {
    const { fallback: Fallback, children } = this.props;
    return this.state.failed ? <Fallback /> : children;
  }
}

SectionBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.elementType.isRequired,
  // Names the section, for the error report.
  name: PropTypes.string.isRequired,
  onError: PropTypes.func,
};

SectionBoundary.defaultProps = {
  onError: () => {},
};
