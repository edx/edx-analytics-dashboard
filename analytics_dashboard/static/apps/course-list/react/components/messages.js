import { defineMessages } from 'react-intl';

// English only: Insights isn't internationalized. The messages follow the micro-frontend convention, so the
// components that use them can be copied into the MFE unchanged.
const messages = defineMessages({
  helpLabel: {
    id: 'insights.courseList.summaryCard.helpLabel',
    defaultMessage: '{label} help',
    description: 'Accessible name of the button that shows the description of a summary card.',
  },
});

export default messages;
