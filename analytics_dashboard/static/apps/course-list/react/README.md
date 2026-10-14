# Course List React Widgets

A guide for adding React widgets to the course list page (`/courses/`).

## 1. Purpose and status

Parts of the course list page can be rendered with React and Redux Toolkit. All of this code runs only when
the `enable_react_course_list` waffle flag is on. The flag is off by default.

- **Flag off:** the page is the server-rendered and Backbone page, exactly as before. No React code is
  downloaded.
- **Flag on:** the server still renders every widget. React replaces a widget only after it has rendered
  successfully. The server-rendered or Backbone version is always the fallback.

Current widgets:

| Widget | Mount element | Replaces |
|---|---|---|
| `TotalEnrollmentWidget` | `div[data-stat-type="total_enrollment"]` in `courses/templates/courses/index.html` | The Total Enrollment card rendered by `templates/summary_point.html` |

Libraries, pinned exactly in `package.json`: `react` and `react-dom` 18.3.1, `@reduxjs/toolkit` 1.9.7,
`react-redux` 7.2.9 and `prop-types` 15.8.1. JSX uses the automatic runtime, so components don't import
`React`.

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
│   ├── react-debug.js             widget markers and the ?react_debug=1 outline (imports nothing)
│   └── spec/
└── course-list/
    ├── app/
    │   ├── course-list-main.js    (legacy) starts the Backbone app, then calls react-loader
    │   └── react-loader.js        (legacy side) checks the flag, then import('apps/course-list/react/index')
    └── react/                     everything React for the course list; loaded only when the flag is on
        ├── index.js               chunk entry point: startReactWidgets
        ├── state/                 store, slices, selectors and data validation
        ├── components/            presentational components: props in, markup out
        ├── widgets/               components connected to Redux with useSelector
        ├── platform/              Insights-only adapters: page-model bridge, formatting, Bootstrap tooltip
        └── spec/fixtures/         JSON fixtures shared by the Python and JavaScript tests
```

| Put this… | …here |
|---|---|
| React widgets connected to Redux | `course-list/react/widgets/` |
| Presentational components shared within the course list | `course-list/react/components/` |
| Redux store, slices, selectors and data validation | `course-list/react/state/` |
| Adapters to Insights code (page model, Backbone, jQuery, Bootstrap, Globalize, `gettext`) | `course-list/react/platform/` |
| React infrastructure for all Insights pages (mounting, error boundary, monitoring) | `apps/components/react/` |

What each layer may import:

| Layer | May import |
|---|---|
| `react/state/` | `@reduxjs/toolkit` and other `react/state/` modules. No Backbone, jQuery, `gettext` or `utils/*` |
| `react/components/`, `react/widgets/` | `react`, `react-redux`, `prop-types`, `react/state/`, `react/components/`, `react/platform/` |
| `react/platform/`, `components/react/`, `app/react-loader.js` | Anything: Backbone models, jQuery, `utils/*`, the global `gettext`, `window.DD_RUM` |

Naming: React components use `PascalCase.jsx`; other modules use `kebab-case.js`.

## 3. Styling

- Reuse the existing global classes, so the legacy and React versions look identical while the flag exists.
  Summary cards use `.summary-point` from `sass/_base.scss`.
- Put new styles in a Sass partial under `analytics_dashboard/static/sass/components/` and import it from
  `components/_components.scss`, which `style-application.scss` already imports.
- Don't import SCSS from React components. The React code is an async chunk, and the production build doesn't
  extract SCSS imported from async chunks into the CSS files.

## 4. Connecting a widget to Redux

1. Add or extend a slice in `react/state/` with `createSlice`.
2. Export selectors from the slice.
3. Read state with `useSelector(selector)` in a `widgets/` component.
4. Pass plain props to a `components/` component.
5. Derive arrays and objects with `createSelector`, so components only re-render when their inputs change.
6. Give list items stable keys, for example `course_id`.

`TotalEnrollmentWidget.jsx`, `SummaryCard.jsx` and `state/summary-slice.js` follow this pattern.

## 5. Getting data into Redux

- **Server page data:** a bridge in `platform/`, such as `page-model-bridge.js`. It copies values one way, from
  the page model (`initModelData.course`) into the store, and listens for changes.
- **The Backbone course list collection:** a one-way collection bridge in `platform/` (planned, not in the code
  yet).
- Every bridge validates values with a pure function in `react/state/`, like `acceptValidSummary`. It
  dispatches only valid values and reports rejected ones as `invalid_update` (see section 11).
- React never writes to Backbone directly. Changes go through a commands module in `platform/` that calls the
  collection's methods (planned, not in the code yet).
- Only one layer writes any piece of state at a time. State is never synced in both directions. Today the
  page model is the only writer of `summary`.

## 6. Translations

- **New React-only strings:** call `gettext` in a `.js` file such as `react/platform/messages.js`, never inside
  JSX. Add `// Translators:` comments. Then run `make extract_translations` and commit the English `.po`
  files. `makemessages` reads `.js` files only, so strings in `.jsx` files are never extracted.
- **Strings the legacy widget already shows from a Django template:** pass them from the view in the page data,
  with the same message IDs. Both paths are then translated identically while the flag exists. `summary_text`
  in `CourseIndex.get_context_data` does this for the Total Enrollment label and tooltip.

## 7. Number formatting

- Use `formatCount` from `react/platform/format.js`, which uses Globalize like the rest of the course list.
  Never use `toLocaleString`.
- For summary cards, use `formatSummaryNumber`. It mirrors the template: `default_if_none:0`, the full
  `intcomma` value in the `title`, and `truncatechars:13` for the visible text.

## 8. Tooltips and tracking

- Activate every `has-tooltip` element with `useBootstrapTooltip(ref, title)` from
  `react/platform/use-bootstrap-tooltip.js`. `load/init-tooltips.js` runs once at page load and never sees
  React-rendered elements.
- Never import Bootstrap again. `application-main.js` loads it on every page.
- Keep the same `data-track-*` attributes as the legacy markup. `TrackingView` listens for `shown.bs.tooltip`
  on the whole document, so the tooltip events are still recorded.
- Bootstrap moves the `title` attribute into `data-original-title` when it activates a tooltip. Tests should
  check `data-original-title`.

## 9. Mounting

- **Elements rendered by Django:** in the template, add `data-react-widget="<name>"` to the existing element
  only when the flag is on (`{% if enable_react_course_list %}`). Then mount from `react/index.js` with
  `mountReact(element, Widget, { store })`. React manages only that element's children. Its classes and
  attributes stay unchanged, apart from the markers below.
- **Widgets inside the Backbone app:** mount into a Marionette region through a region adapter (planned, not in
  the code yet).
- Mount one widget per element.
- Always keep the server-rendered or Backbone version in the element. It is the fallback.
- The function `mountReact` returns unmounts the widget and leaves the element empty. It exists for tests. In
  production code, don't call it: the fallback restores the server HTML when a widget fails.

### Seeing which parts are React

`mountReact` marks every mount element automatically; widgets need no code for this:

- `data-react-rendered="<widget>"` after the first successful render;
- `data-react-fallback="<widget>"` when the server-rendered HTML is shown instead (render failure, or the React
  chunk failed to load or start).

The markers are invisible. Check them in DevTools → Elements.

**Debug outline.** Open any page once with `?react_debug=1`, for example `/courses/?react_debug=1`. This browser
remembers the setting in `localStorage`, and from then on:

- React widgets get a blue dashed outline labelled "React: <widget>";
- widgets showing the fallback get a red dashed outline labelled "Fallback: <widget>".

`?react_debug=0` turns it off. It affects only your browser, never moves anything (it uses `outline`), and
sends nothing anywhere. `components/react/react-debug.js` implements it.

## 10. Fallback behavior

Every widget must keep these rules:

| Situation | What the user sees |
|---|---|
| Flag off | The server-rendered widget; no React code is loaded |
| The React chunk fails to load, or `startReactWidgets` throws | The server-rendered widget, untouched (`react-loader.js`) |
| The first render fails, including missing data | The server-rendered HTML, restored exactly |
| A later update carries invalid data | The latest valid value; the bridge rejects the invalid one |
| A later render fails | The last successful React output, restored exactly; the widget stops updating |

- React replaces the server markup only by rendering successfully.
- If a widget can't render correct output, for example because no valid data has been loaded, it **throws**
  an `Error` with a fixed message that contains no data. `mountReact` then restores the server HTML.
  `TotalEnrollmentWidget` does this.
- After the first successful render, the bridge must reject invalid data, so the last valid value stays.
- A render crash restores the last successful output. The restore writes the HTML straight back into the
  mount element, with no wrapper, and re-activates its tooltips.
- Never render error text. Never call `console.error` directly; use the monitoring adapter.

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
| `start_error` | Insights React widgets failed to start | `startReactWidgets` threw |
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
- Never read waffle in JavaScript. `react-loader.js` only reads `enable_react_course_list` from the page
  model.
- **Devstack:**
  - on for everyone: `python manage.py waffle_flag enable_react_course_list --create --everyone`
  - off for everyone: `python manage.py waffle_flag enable_react_course_list --deactivate`
  - list flags: `python manage.py waffle_flag --list`
- **Stage and production:** Django admin, Waffle → Flags. A Flag can be turned on for staff, specific users or
  a percentage of users first.

## 13. Preserving the legacy fallback

- Don't change legacy templates or Backbone views, except to add mount points behind the flag.
- With the flag off, the page HTML must stay unchanged. Add a Python view test for the flag-off and flag-on
  output, as `courses/tests/test_views/test_course_summaries.py` does.
- Never import React, Redux or anything under `course-list/react/` from legacy code. The only exceptions are
  `react-loader.js`'s dynamic `import()` and its imports of `components/react/monitoring.js` and
  `components/react/react-debug.js`, which import nothing.
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
- Test the fallback paths: first-render failure, later render failure and invalid data.
- **Specs that expect a render error:** React's development build, which Karma uses, sends render errors to
  `window.onerror`, and Jasmine then fails the spec even when the error boundary handled the error. Call
  `ignoreExpectedErrors([message])` from `components/react/spec/ignore-expected-errors.js` in `beforeEach`, and
  the function it returns in `afterEach`.
- **Fixtures with a server-rendered tooltip:** call `$(element).find('.has-tooltip').tooltip()` before
  mounting, as `load/init-tooltips.js` does on the page. Otherwise exact HTML comparisons of the restored
  markup fail.
- Run axe-core on new widgets (`axe.a11yCheck`).
- Python view tests use `waffle.testutils.override_flag`.
- Commands: `npm test`, `npm run lint`, `make test_python`, `make quality`, `make validate_translations`.

## 15. Checklist for a new widget

1. Add a mount point behind the flag in the Django template, or a Marionette region.
2. Add a slice, selectors, validation and the bridge mapping.
3. Add a presentational component and a connected widget. The widget throws when it has no valid data.
4. Handle text and number formatting through the `platform/` adapters.
5. Reuse the existing CSS classes.
6. Write tests: unit tests, update in place, invalid data keeps the last value, a render failure restores the
   HTML exactly, flag off and on, legacy equivalence, axe-core and monitoring.
7. Run the bundle check (section 13).
8. Update this README if you introduce a new pattern.

## 16. What moves to an MFE

The course list is expected to move to a micro-frontend (MFE) later.

- **Unchanged:** `react/state/`, including validation, and other pure helpers.
- **With adapters swapped:** `react/components/` and `react/widgets/`. They would use react-intl instead of
  `gettext` and Globalize, and Paragon instead of Bootstrap tooltips and the legacy classes.
- **Not carried over:** `react/platform/`, `components/react/` (mounting, error boundary and the RUM adapter),
  `react-loader.js`, the waffle flag, the Django mount points, the build configuration and the Karma tests.
  The MFE has its own monitoring setup.
