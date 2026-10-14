import TotalEnrollmentWidget from 'course-list/react/widgets/TotalEnrollmentWidget';

// TEMPORARY, for manual testing only: shows a "Loaded from React" badge above the Total Enrollment card so
// testers can see that React rendered it. Revert the commit that added this file before merging.
// Inline styles keep the whole change in one file (SCSS imported from React components isn't extracted).

// The row has no height, so the card's column keeps the same height as the others. A taller column would catch
// the floated cards that wrap to the next row. The badge sits on the card's top border instead.
const BADGE_ROW_STYLE = {
  position: 'relative',
  zIndex: 1,
  height: 0,
  textAlign: 'center',
};

const BADGE_STYLE = {
  position: 'relative',
  top: '-11px',
  display: 'inline-block',
  padding: '2px 10px',
  border: '1px solid #bce8f1',
  borderRadius: '10px',
  backgroundColor: '#d9edf7',
  color: '#245269',
  fontSize: '12px',
  fontWeight: 600,
  lineHeight: '18px',
};

export default function TotalEnrollmentWithReactBadge() {
  return (
    <>
      <div style={BADGE_ROW_STYLE} data-react-badge="" aria-hidden="true">
        <span style={BADGE_STYLE}>Loaded from React</span>
      </div>
      <TotalEnrollmentWidget />
    </>
  );
}
