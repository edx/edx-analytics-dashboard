# Course List React Widgets

A guide for adding React widgets to the course list page (`/courses/`).

## 1. Purpose and status

The course list page is drawn by React and Redux Toolkit when the `enable_react_course_list` waffle flag is on.
All of this code runs only then. The flag is off by default.

- **Flag off:** the page is the server-rendered and Backbone page, exactly as before. No React code is
  downloaded.
- **Flag on:** the page is drawn by React and **nothing legacy is rendered or started**. The template renders only
  `#course-list-react-root` (a spinner) instead of the summary cards and the Backbone course list, and
  `course-list-main.js` doesn't load the Backbone app. There is **no fallback to the legacy UI**: if the React
  code fails to load, the spinner is replaced by an error message; if one section fails, that section shows an
  error state and the others keep working (section 10). Turning the flag off is the rollback.

The page is a skeleton whose sections are placeholders that are replaced one by one:

| Widget | Draws |
|---|---|
| `CourseListPage` | The two sections and their headings: *Performance summary* and *Courses* |
| `SummarySection` | The summary cards (placeholder) |
| `ControlsSection` | The filter bar: search, filters, Columns menu, Download CSV (placeholder) |
| `ResultsSection` | The result count, table and pagination (placeholder; it already shows the loading and "no course data" states) |

The summary cards, the filters and the table columns are configuration: one entry each in `react/registries/`.

Libraries, pinned exactly in `package.json`: `react` and `react-dom` 18.3.1, `@reduxjs/toolkit` 1.9.7,
`react-redux` 7.2.9, `prop-types` 15.8.1, `@openedx/paragon` 23.4.5 and `react-intl` 6.8.9. These are the
micro-frontend (MFE) versions. JSX uses the automatic runtime, so components don't import `React`.

**New widgets are built with Paragon**, written exactly like MFE code, so they can be copied into the MFE
later. Section 17 explains how Paragon is wired into this page, and section 3 how it is styled.

**React 17 compatibility.** Apart from `createRoot` in `mount-react.jsx`, use only React APIs that also exist in
React 17. Don't use `useId`, `useTransition`, `useDeferredValue` or `useSyncExternalStore`. This keeps a
downgrade to React 17 possible without component changes. A downgrade would change `mount-react.jsx` and the
specs, which import `act` from `react` (React 18.3 or later) and `createRoot` from `react-dom/client`.

**Browsers.** React 18 doesn't support Internet Explorer 11. With the flag on, IE11 isn't supported on this
page.

## 2. Where code goes

```
analytics_dashboard/static/apps/
├── components/react/              React infrastructure shared by all Insights pages
│   ├── mount-react.jsx            mounts a component into an existing element; restores HTML on failure
│   ├── widget-error-boundary.jsx  catches render errors and reports the last on-screen HTML
│   ├── monitoring.js              minimal Datadog RUM reporting (imports nothing)
│   ├── widget-markers.js          data-react-rendered / data-react-fallback markers (imports nothing)
│   ├── paragon/                   what Paragon needs on an Insights page (section 17)
│   │   ├── ParagonProvider.jsx    react-intl provider (English) and the .paragon-styles scope
│   │   ├── paragon-styles.js      webpack entry for Paragon's CSS
│   │   ├── insights-theme.css     Paragon theme variables set to Insights' look
│   │   └── breakpoints.js         replaces an SCSS file Paragon imports for its breakpoints
│   └── spec/
└── course-list/
    ├── app/
    │   ├── course-list-main.js    (legacy side) starts the Backbone app, or the React page when the flag is on
    │   └── react-loader.js        (legacy side) checks the flag, then import('apps/course-list/react/index')
    └── react/                     everything React for the course list; loaded only when the flag is on
        ├── index.js               chunk entry point: startReactPage
        ├── registries/            configuration: the metrics, filters and columns, one entry each
        ├── state/                 store, slices, selectors and data validation
        ├── components/            presentational components: props in, markup out
        ├── widgets/               components connected to Redux with useSelector
        ├── platform/              Insights-only adapters: page-model bridge, row normalization, formatting
        └── spec/fixtures/         JSON fixtures shared by the Python and JavaScript tests

webpack/paragon/                   build helpers for Paragon (section 17); not application code
```

| Put this… | …here |
|---|---|
| React widgets connected to Redux | `course-list/react/widgets/` |
| Presentational components shared within the course list | `course-list/react/components/` |
| Redux store, slices, selectors and data validation | `course-list/react/state/` |
| Adapters to Insights code (page model, Backbone, jQuery, Bootstrap, Globalize, `gettext`) | `course-list/react/platform/` |
| React infrastructure for all Insights pages (mounting, error boundary, monitoring, the Paragon provider) | `apps/components/react/` |

What each layer may import:

| Layer | May import |
|---|---|
| `react/state/` | `@reduxjs/toolkit` and other `react/state/` modules. No Backbone, jQuery, `gettext` or `utils/*` |
| `react/components/`, `react/widgets/` | `react`, `react-redux`, `react-intl`, `prop-types`, `@openedx/paragon`, `react/state/`, `react/components/`, `react/platform/`. **Not** jQuery, Backbone, underscore, `utils/*`, `gettext` or `components/react/*`: ESLint enforces this, so the code stays copyable into the MFE |
| `react/platform/`, `components/react/`, `app/react-loader.js` | Anything: Backbone models, jQuery, `utils/*`, the global `gettext`, `window.DD_RUM` |

Naming: React components use `PascalCase.jsx`; other modules use `kebab-case.js`.

## 3. Styling

- **Use Paragon components and utility classes** (`d-flex`, `text-center`, `py-3`, `h2`, ...). Don't write CSS
  for them. Paragon takes its colours, font and corners from `--pgn-*` theme variables, and
  `components/react/paragon/insights-theme.css` sets those to Insights' values (Open Sans, the edX blue
  `#0075B4`, the card border and corner radius). Change the look there, in one place.
- **Paragon's CSS is scoped.** The build applies it only inside the `.paragon-styles` element that
  `ParagonProvider` renders, so it can't affect the rest of the page (section 17). A page gets it by linking the
  `paragon-styles` bundle; no page does yet.
- **If an Insights Bootstrap 3 rule leaks into a Paragon widget** (for example the top margin Insights gives
  headings), add a rule to `insights-theme.css`. It is scoped like the rest of the file, so it only applies inside
  Paragon widgets. Check the widget in a browser at 375 and 1440 px.
- Don't import CSS or SCSS from React components. The React code is an async chunk, and the production build
  doesn't extract styles imported from async chunks.
- Legacy-look widgets (not Paragon) reuse the existing global classes, such as `.summary-point` from
  `sass/_base.scss`.

## 4. Connecting a widget to Redux

1. Add or extend a slice in `react/state/` with `createSlice`.
2. Export selectors from the slice.
3. Read state with `useSelector(selector)` in a `widgets/` component.
4. Pass plain props to a `components/` component.
5. Derive arrays and objects with `createSelector`, so components only re-render when their inputs change.
6. Give list items stable keys, for example `course_id`.

`ResultsSection.jsx`, `CourseListPage.jsx` and `state/courses-slice.js` follow this pattern.

## 5. Getting data into Redux

- **Server page data:** a bridge in `platform/`, such as `page-model-bridge.js`. It copies values one way, from
  the page model (`initModelData.course`) into the store, and listens for changes.
- **The Backbone course list collection:** a one-way collection bridge in `platform/` (planned, not in the code
  yet).
- Every bridge validates values with a pure function in `react/state/`, like `acceptValidRows`. It
  dispatches only valid values and reports rejected ones as `invalid_update` (see section 11).
- React never writes to Backbone directly. Changes go through a commands module in `platform/` that calls the
  collection's methods (planned, not in the code yet).
- Only one layer writes any piece of state at a time. State is never synced in both directions. Today the
  page model is the only writer of the course rows (`courses`), and the page's components are the only
  writers of the user's choices (`query`, `view`).

## 6. Translations

Insights isn't internationalized, so React widgets show English.

- **Text in a component** is a plain English string. Nothing extracts or translates it. When the course list
  moves to the MFE, wrap its strings in `react-intl` messages there.
- **Strings the legacy widget already shows from a Django template:** pass them from the view in the page data,
  with the same message IDs, so both versions show identical text while the flag exists. `summary_text` in
  `CourseIndex.get_context_data` does this for the Total Enrollment label and tooltip.
- Paragon requires `react-intl` (many of its components use it for their built-in text, such as "Close" or
  "Search"), so `ParagonProvider` supplies it, fixed to English. That is a technical requirement of Paragon, not
  internationalization of Insights.

## 7. Number formatting

- Use `formatCount` from `react/platform/format.js`, which uses Globalize like the rest of the course list.
  Never use `toLocaleString`.
- For summary cards, use `formatSummaryNumber`. It mirrors the template: `default_if_none:0`, the full
  `intcomma` value in the `title`, and `truncatechars:13` for the visible text.
- **English only.** The match with the template is exact in English, and the shared fixture and tests check
  English. Django's `intcomma` and Globalize can differ in other languages (digits, separators, length), so
  the number can look different when React replaces the server card. This is a known limitation while the
  flag is staff-only. If it matters, send the server-formatted `title` and `display` in the page data and
  render those.

## 8. Tooltips and tracking

- **Legacy-look widgets** (none now): `load/init-tooltips.js` runs once at page load and never sees
  React-rendered elements, so activate their `has-tooltip` elements from the widget. (The helper that did this
  was removed with the foundation card.)
- Never import Bootstrap again. `application-main.js` loads it on every page.
- Keep the same `data-track-*` attributes as the legacy markup. `TrackingView` listens for `shown.bs.tooltip`
  on the whole document, so the tooltip events are still recorded.
- Bootstrap moves the `title` attribute into `data-original-title` when it activates a tooltip. Tests should
  check `data-original-title`.
- **Paragon widgets:** use Paragon's `OverlayTrigger` and `Tooltip`, with an `IconButton` as the trigger. Give each
  tooltip an `id` that is unique on the page. Don't use Bootstrap 3's jQuery `.tooltip()` in them.
- Paragon's tooltips are drawn into `<body>`, outside the widget. The build adds rules that style them only when
  they are Bootstrap 4 tooltips (`bs-tooltip-*`), so Insights' own jQuery tooltips are unaffected (section 17).
- **Analytics for Paragon tooltips.** `TrackingView` listens for Bootstrap's `shown.bs.tooltip`, which Paragon's
  tooltips don't fire. A Paragon widget must send the same `segment:track` event itself, through the tracking
  model (`trackingModel.trigger('segment:track', 'edx.bi.tooltip.displayed', { title, category, type })`), with
  the same properties as the legacy markup's `data-track-*` attributes.
- Legacy markup restored by the fallback still gets its jQuery tooltips back (see `mountReact`).

## 9. Mounting

- **The page** has one mount point, `#course-list-react-root`, which the template renders only when the flag is
  on. `startReactPage` in `react/index.js` mounts `CourseListPage` into it with
  `mountReact(element, CourseListPage, { store, wrapper: ParagonProvider, name: 'course-list' })`. React manages
  only that element's children. `wrapper: ParagonProvider` supplies `react-intl` and the `.paragon-styles`
  scope.
- Every section of the page is wrapped in a `SectionBoundary` (see section 10).
- The function `mountReact` returns unmounts the page and puts the original HTML (the spinner) back into the
  element.

### Seeing which parts are React

`mountReact` marks every mount element automatically; widgets need no code for this:

- `data-react-rendered="<widget>"` after the first successful render;
- `data-react-fallback="<widget>"` when `mountReact` restored the original HTML after the whole page failed to
  render.

The markers are invisible. Check them in DevTools → Elements.

## 10. Failure behavior

There is no fallback to the legacy UI (it isn't rendered when the flag is on). Every part of the page must keep
these rules:

| Situation | What the user sees |
|---|---|
| Flag off | The legacy page; no React code is loaded |
| The React chunk fails to load, or `startReactPage` throws | The spinner is replaced by "Something went wrong loading this page." and a reload link (`react-loader.js`) |
| The server sent no course data | The legacy "No course data is currently available for your course." message in the results |
| The course data is malformed | The results section shows the error state |
| A section throws while rendering | That section shows the error state (`ErrorState`, with a Reload page button); the other sections keep working |
| Some rows have no `course_id` | Those rows are dropped and the rest is shown |

- Each section of `CourseListPage` is wrapped in a `SectionBoundary`. When a section can't render correct output,
  for example because no valid data has been loaded, it **throws** an `Error` with a fixed message that contains
  no data (`ResultsSection` does this). The boundary shows `ErrorState`, and `onSectionError` reports it.
- Never render the text of an error. Never call `console.error` directly; use the monitoring adapter.

## 11. Monitoring

Failures are reported to the existing Datadog RUM integration (`window.DD_RUM`), only through
`components/react/monitoring.js`:

- `reportWidgetFailure({ widget, failureType, recovery, error })` sends an error with a fixed message.
- `reportFallbackActivated({ widget, fallback, failureType })` sends the `insights_react_fallback_activated`
  action.

The adapter does nothing when RUM isn't loaded and never throws. Each widget and failure type is reported at
most once per page load. Nothing is sent when everything works.

| `failure_type` | Message | When |
|---|---|---|
| `chunk_load` | Insights React widgets failed to load | The React chunk couldn't be loaded |
| `start_error` | Insights React widgets failed to start | `startReactPage` threw |
| `render_error` | Insights React widget failed to render | The error boundary caught an error |
| `invalid_update` | Insights React widget received invalid data | A bridge rejected a value |

Rules:

- Use an existing `failure_type` where it fits. A new one needs a fixed message in `MESSAGES` and a test in
  `components/react/spec/monitoring-spec.js`.
- The context is allow-listed. Every key starts with `insights.react.`: `widget`, `failure_type`, `recovery`,
  `fallback`, `flag`, `flag_enabled`, `error_name` and `library_version`. Adding a key needs a review.
- Never send metric values, labels, user or course data, error messages, stacks, HTML or Redux state. For an
  error, only its class name (`error.name`) is sent.
- Don't send success events.

## 12. The waffle flag

- Declared in `analytics_dashboard/courses/waffle.py` (`ENABLE_REACT_COURSE_LIST_FLAG`,
  `react_course_list_enabled`).
- Read once per request in `CourseIndex.get_context_data`
  (`analytics_dashboard/courses/views/course_summaries.py`). The same value goes to the template context and,
  only when the flag is on, to the page data as `enable_react_course_list`. With the flag off, the page data
  is unchanged.
- Never read waffle in JavaScript. `course-list-main.js` and `react-loader.js` only read
  `enable_react_course_list` from the page data.
- **Devstack:**
  - on for everyone: `python manage.py waffle_flag enable_react_course_list --create --everyone`
  - off for everyone: `python manage.py waffle_flag enable_react_course_list --deactivate`
  - list flags: `python manage.py waffle_flag --list`
- **Stage and production:** Django admin, Waffle → Flags. A Flag can be turned on for staff, specific users or
  a percentage of users first.

## 13. Keeping the legacy page working

- Don't change legacy templates or Backbone views, except to render them only when the flag is off.
- With the flag off, the page must stay as it was. Keep the Python view tests for the flag-off and flag-on
  output, as `courses/tests/test_views/test_course_summaries.py` does.
- Never import React, Redux or anything under `course-list/react/` from legacy code. The only exceptions are
  `react-loader.js`'s dynamic `import()` and its import of `components/react/monitoring.js`, which imports
  nothing.
- **Bundle check.** Build with a stats report and list each chunk's modules:

  ```bash
  chunk_modules() {
    node -e '
      const stats = require(process.argv[1]);
      const label = {};
      stats.chunks.forEach((c) => {
        label[c.id] = c.names.length
          ? c.names.join(",")
          : "async from " + (c.origins || []).map((o) => o.moduleName + " (" + o.request + ")").join(" | ");
      });
      const lines = [];
      stats.modules.forEach((m) => m.chunks.forEach((id) => lines.push(label[id] + " :: " + m.name)));
      console.log(lines.sort().join("\n"));
    ' "$1"
  }

  node_modules/.bin/webpack --config webpack.prod.config.js --json > /tmp/stats.json
  # React and Redux must appear only in the React chunk; this prints nothing:
  chunk_modules /tmp/stats.json \
    | grep -e 'node_modules/react' -e 'node_modules/@reduxjs' -e 'node_modules/immer' \
    | grep -v '(apps/course-list/react/index)'
  ```

  To prove other pages are unchanged, run `chunk_modules` on a build of the base branch and on your branch,
  then `diff` the two lists. Only `course-list-main ::` lines and lines of the React chunk
  (`(apps/course-list/react/index)`) may differ.

## 14. Tests

- Put Jasmine specs next to the code in `spec/` folders, named `*-spec.js` or `*-spec.jsx`. Karma finds them
  automatically.
- Wrap every React render, update and unmount in `act` from `react`.
- Share expectations between Python and JavaScript through a JSON fixture under `react/spec/fixtures/`, like
  `total-enrollment-card.json`. Don't hard-code expected values in specs.
- Test monitoring by setting `window.DD_RUM` to an object with `addError` and `addAction` spies, and call
  `resetMonitoringForTests()` in `beforeEach`.
- Test the failure paths: a section that throws, data that is unavailable or malformed, and the chunk failing to
  load.
- **Specs that expect a render error:** React's development build, which Karma uses, sends render errors to
  `window.onerror`, and Jasmine then fails the spec even when the error boundary handled the error. Call
  `ignoreExpectedErrors([message])` from `components/react/spec/ignore-expected-errors.js` in `beforeEach`, and
  the function it returns in `afterEach`.
- **Fixtures with a server-rendered tooltip:** call `$(element).find('.has-tooltip').tooltip()` before
  mounting, as `load/init-tooltips.js` does on the page. Otherwise exact HTML comparisons of the restored
  markup fail.
- Render Paragon components inside `ParagonProvider`: they need `react-intl`.
- **Karma runs in PhantomJS 2.1**, which lacks some browser APIs. `js/test/specs/spec-runner.js` adds, for tests
  only, the `EventTarget` global (Paragon's `Overlay` references it when it loads) and an `Intl` polyfill with
  English data (`react-intl` needs `Intl`). PhantomJS has no `MouseEvent` constructor, so create events with
  `document.createEvent('Event')` and `initEvent(type, true, true)`. If a Paragon component needs another API,
  add a shim there, or switch Karma to a headless modern browser.
- Paragon's tooltips are appended to `<body>` and stay there if a spec doesn't unmount. Other specs can leave
  legacy `.tooltip` elements, so select Paragon's with `.tooltip[class*="bs-tooltip-"]`.
- Run axe-core on new widgets (`axe.a11yCheck`).
- Python view tests use `waffle.testutils.override_flag`.
- The build helpers have their own checks: `npm run check:paragon`. `make validate_js` (so CI) runs it.
- Commands: `npm test`, `npm run lint`, `npm run check:paragon`, `make test_python`, `make quality`,
  `make validate_translations`.
- The spec "Data Table View should format display of a date" assumes the machine's timezone is UTC. It fails on a
  machine in another timezone; this is unrelated to the React code.

## 15. Checklist for a new widget

1. Add the widget to the page (`CourseListPage`) in its own `SectionBoundary`, or add an entry to the matching
   registry.
2. Add a slice, selectors, validation and the bridge mapping.
3. Add a presentational component (Paragon, with plain English text) and a connected widget. The widget throws
   when it has no valid data.
4. Handle number formatting and tracking through the `platform/` adapters.
5. Don't write CSS; use Paragon components, utility classes and the theme (section 3).
6. Add the entry or widget in the section that shows it. The page is mounted once, in `react/index.js`.
7. Write tests: unit tests, update in place, invalid data keeps the last value, a render failure shows the error
   state, flag off and on, axe-core and monitoring.
8. Run the bundle check (section 13), and look at the widget in a browser with the flag on and off.
9. Update this README if you introduce a new pattern.

## 16. What moves to an MFE

The course list is expected to move to a micro-frontend (MFE) later.

- **Unchanged:** `react/state/`, including validation, and other pure helpers.
- **Unchanged, because they are written like MFE code:** `react/components/` and `react/widgets/` (Paragon).
  Only their imports of `react/platform/` adapters are replaced, and their text is wrapped in `react-intl`
  messages.
- **Not carried over:** `react/platform/` (page-model bridge, formatting, tracking), `components/react/` (mounting,
  error boundary, RUM adapter, `ParagonProvider`, widget markers), `insights-theme.css`,
  `react-loader.js`, the waffle flag, the Django mount points, `webpack/paragon/`, and the Karma tests. In the MFE,
  frontend-platform provides the providers, and its theme and monitoring apply.

## 17. How Paragon is wired into this page

Paragon is built for MFEs, which use webpack 5 and no other CSS. Insights uses webpack 3, Babel 7.17, UglifyJS
(ES5 only) and Bootstrap 3, so the build has extra steps. They live in `webpack/paragon/` and the three configs
(`webpack.config.js`, `webpack.prod.config.js`, `karma.conf.js`). Developers don't need to change them to build a
widget.

| Problem | What the build does |
|---|---|
| Paragon and 10 of its dependencies ship ES2015+ code, which UglifyJS rejects | Transpiles exactly those packages (the list in `webpack/paragon/index.js`) |
| Paragon's JavaScript imports an SCSS file for its breakpoints | Replaces it with `components/react/paragon/breakpoints.js` |
| Webpack 3 ignores `sideEffects: false`, so one import bundles all 2,319 icons and every component | A Babel plugin rewrites `import { Card } from '@openedx/paragon'` and icon imports into per-file imports. Source code keeps the MFE style |
| Paragon's Bootstrap 4 CSS would restyle the Bootstrap 3 page | Scopes it under `.paragon-styles` (`webpack/paragon/scope-paragon-css.js`). **The build fails if a rule would apply outside the scope.** Only the `:root` variable rules stay global |
| Tooltips and popovers are drawn into `<body>`, outside the scope | Adds copies of their rules that only match Bootstrap 4's `bs-tooltip-*` and `bs-popover-*` classes |
| Insights sets `html { font-size: 14px }`; Paragon's `rem` sizes assume 16px | Converts Paragon's `rem` values to `px` |
| Browsers ignore Paragon's `@media (--pgn-...)` custom media queries | Resolves them from Paragon's own definitions |

At run time: `ParagonProvider` wraps each Paragon widget in `react-intl`'s provider (English) and an element with
the class `paragon-styles`, and a page must link the `paragon-styles` CSS file (and, in development, its JS bundle) to get the styles.

**Before you use a Paragon modal, toast or sheet:** Paragon draws these into elements it creates at the end of
`<body>` (`paragon-portal-root`, `toast-root`, `sheet-root`), which are outside `.paragon-styles`, so they would be
unstyled. Create those three elements once, before the first one is shown, each with the class `paragon-styles`
(for example `document.createElement('div')`, set its `id`, add the class, append it to `document.body`).
Paragon reuses an element that already exists. Tooltips, popovers and dropdown menus need none of this.

Cost, measured with the first Paragon card: about 175 KB of gzipped JavaScript in the React chunk and 78 KB of
gzipped CSS, downloaded only by a page that uses Paragon widgets.

## 18. Upgrading Paragon

1. Change the exact version in `package.json`, then `npm install`.
2. `npm run build`. If it fails with "from UglifyJs" or "Module parse failed", the error names a file in
   `node_modules`. Add that package (not only Paragon itself) to the list in `webpack/paragon/index.js`, and build
   again. Repeat until the build passes; each upgrade usually needs zero to two additions.
3. If the build reports selectors that would apply outside `.paragon-styles`, or a global `:root` rule with
   declarations other than `--*` custom properties, extend `webpack/paragon/scope-paragon-css.js` and add a case
   to `webpack/paragon/check-paragon-build.js`. If `npm run check:paragon` reports new `@keyframes` names
   (keyframe names are global), check them against the `@keyframes` in Insights' CSS, then update the list in
   that script.
4. Run `npm run check:paragon` and `npm test`. Check that the breakpoints in `breakpoints.js` still match
   Paragon's `styles/scss/core/_exports.module.scss`, and that the `--pgn-*` variables in `insights-theme.css`
   still exist.
5. Look at a Paragon widget in a browser, with the flag on and off, including its tooltip.
