/**
 * The icons of the prototype that Paragon doesn't have: Material Symbols Sharp (weight 400, 24px; Apache License 2.0,
 * as Paragon's own Material icons), drawn with the text colour. Paragon has only the rounded Material Icons versions.
 */
const sharpIcon = path => function SharpIcon() {
  return (
    <svg width="24" height="24" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" focusable="false">
      <path d={path} />
    </svg>
  );
};

export const ViewColumnSharp = sharpIcon(
  'M121-200v-560h719v560H121Zm79-80h133v-400H200v400Zm213 0h133v-400H413v400Zm213 0h133v-400H626v400Z',
);

export const DownloadSharp = sharpIcon(
  'M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM160-160v-200h80v120h480v-120h80v200H160Z',
);
