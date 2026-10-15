import PropTypes from 'prop-types';
import { IntlProvider } from 'react-intl';

/**
 * Wraps Paragon widgets in what they need outside an MFE:
 *  - react-intl's IntlProvider, which Paragon components require. Insights isn't internationalized, so the
 *    language is fixed to English; text still goes through react-intl messages, like in the MFE;
 *  - an element with the class paragon-styles, the only place Paragon's scoped CSS applies (see
 *    webpack/paragon/scope-paragon-css.js).
 * In an MFE, frontend-platform's AppProvider does this job, so this file isn't copied there.
 * Pass it to mountReact as the wrapper option.
 */
export default function ParagonProvider({ children }) {
  return (
    <IntlProvider locale="en" defaultLocale="en">
      <div className="paragon-styles">{children}</div>
    </IntlProvider>
  );
}

ParagonProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
