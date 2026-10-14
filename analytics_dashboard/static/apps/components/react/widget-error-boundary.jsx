import { Component } from 'react';
import PropTypes from 'prop-types';

/**
 * Catches errors thrown while rendering a widget. It renders nothing itself; it gives mountReact the
 * HTML that was on screen just before the failure, so mountReact can put it back unchanged:
 *  - failure before any successful render → null (mountReact restores the server-rendered HTML);
 *  - failure during a later update → the container's HTML read in getSnapshotBeforeUpdate, which React
 *    calls before it removes the last successful output.
 */
export default class WidgetErrorBoundary extends Component {
  static getDerivedStateFromError(error) {
    return { error };
  }

  constructor(props) {
    super(props);
    this.state = { error: null };
    this.hasRendered = false;
  }

  componentDidMount() {
    if (this.state.error) {
      this.props.onFallback(null, this.state.error);
    } else {
      this.hasRendered = true;
      this.props.onRendered();
    }
  }

  getSnapshotBeforeUpdate(prevProps, prevState) {
    if (!prevState.error && this.state.error && this.hasRendered) {
      return this.props.container.innerHTML;
    }
    return null;
  }

  componentDidUpdate(prevProps, prevState, lastRenderedHtml) {
    if (!prevState.error && this.state.error) {
      this.props.onFallback(lastRenderedHtml, this.state.error);
    } else if (!this.state.error) {
      this.hasRendered = true;
    }
  }

  render() {
    return this.state.error ? null : this.props.children;
  }
}

WidgetErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  container: PropTypes.instanceOf(Element).isRequired,
  onFallback: PropTypes.func.isRequired,
  // Called once, after the first successful render.
  onRendered: PropTypes.func,
};

WidgetErrorBoundary.defaultProps = {
  onRendered: () => {},
};
