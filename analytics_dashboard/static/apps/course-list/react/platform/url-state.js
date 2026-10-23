import columnRegistry from 'course-list/react/registries/columns';
import filterRegistry, { resolveFilters } from 'course-list/react/registries/filters';
import { queryRestored } from 'course-list/react/state/query-slice';
import { selectAvailableColumns, selectCurrentPage, selectFilters } from 'course-list/react/state/selectors';
import { viewRestored } from 'course-list/react/state/view-slice';

/**
 * The search, filters, sort, page and columns of the course list, kept in the address of the page, so a reload, the
 * Back button, a bookmark and a shared link show the same view. The format is the legacy page's, so old links keep
 * working:
 *
 *   /courses/#?text_search=algebra&availability=Current,Upcoming&sortKey=count&order=desc&page=3&cols=start_date,count
 *
 *   text_search  the search text
 *   timeframe    7d, 30d, 60d or custom (new, the prototype's keys); with custom, from and to (YYYY-MM-DD)
 *   <filter id>  the selected values of a filter, comma-separated. The id of a filter in registries/filters.js is its
 *                key in the address (as in the legacy page: availability, pacing_type, program_ids)
 *   sortKey      the id of a column of registries/columns.js
 *   order        asc or desc
 *   page         1-based
 *   cols         the ticked optional columns (new: the legacy page had no Columns menu)
 *
 * Whatever is read from the address is checked first, because anyone can edit it: unknown parameters and values are
 * left out, as the legacy page did, and a page that isn't a whole number from 1 makes the address "invalid", which
 * shows the legacy "Invalid Parameters" message.
 */

const MAX_SEARCH_LENGTH = 200;
// The timeframes other than All Time (the default, not written), with the prototype's keys; Custom has from and to.
const TIMEFRAME_VALUES = ['7d', '30d', '60d', 'custom'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Whether text is a real calendar date written YYYY-MM-DD (not 2026-13-45 or 2026-02-30). */
function isDate(text) {
  if (!DATE_PATTERN.test(text || '')) {
    return false;
  }
  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
// How long the address waits for the view to stop changing before it is rewritten (browsers limit how often a page may
// rewrite its address: Safari throws after about 100 times in 30 seconds, which fast typing could reach).
const WRITE_DELAY = 200;

function decode(text) {
  try {
    return { value: decodeURIComponent(text) };
  } catch (error) {
    return { value: null };
  }
}

/** The key and value pairs of an address hash such as "#?a=1&b=2" (values decoded). null when it can't be read. */
function readParams(hash) {
  const text = String(hash || '').replace(/^#\??/, '');
  const params = {};
  if (!text) {
    return params;
  }
  const parts = text.split('&');
  for (let index = 0; index < parts.length; index += 1) {
    if (parts[index]) {
      const pair = parts[index].split('=');
      const key = decode(pair[0]).value;
      const value = pair.length > 1 ? decode(pair.slice(1).join('=')).value : '';
      if (key === null || value === null) {
        return null;
      }
      params[key] = value;
    }
  }
  return params;
}

const isEnabled = (column, switches) => !column.enabled || column.enabled(switches);

/**
 * The columns of the registry a sort in the address can name: the ones that exist for this page, have data and are
 * shown (Course Name; the ticked ones from `cols`, or the ones that start visible). A sort by a column that isn't shown
 * would leave the rows in an order nothing explains.
 */
function sortableColumnIds(columns, switches, visibleColumns, dataColumnIds) {
  return columns
    .filter(column => isEnabled(column, switches) && dataColumnIds.indexOf(column.id) !== -1)
    .filter((column) => {
      if (column.alwaysVisible) {
        return true;
      }
      return visibleColumns ? visibleColumns.indexOf(column.id) !== -1 : column.defaultVisible !== false;
    })
    .map(column => column.id);
}

/**
 * Reads an address hash.
 * @param {string} hash - window.location.hash.
 * @param {Object} [options] - { switches, columns, filters, dataColumnIds }: the page's switches
 *   ({ passingUsersEnabled, filtersEnabled, timeframeEnabled }), the columns registry and the filters with their
 *   options (the real ones by default, with no page data) and the ids of the columns that have data (by default the
 *   ones that aren't pending). Filters are read only with the filters switch on, as the legacy page offered them only
 *   then.
 * @returns {{ query: Object, visibleColumns: (string[]|null), invalid: boolean }} The query to restore (only the
 *   parts the address has), the ticked columns (null when it has none) and whether it has an invalid parameter.
 */
export function parseHash(hash, {
  switches = {},
  columns = columnRegistry,
  filters = resolveFilters({ rows: [], programs: [] }),
  dataColumnIds = columns.filter(column => !column.pending).map(column => column.id),
} = {}) {
  const params = readParams(hash);
  if (params === null) {
    return { query: {}, visibleColumns: null, invalid: true };
  }
  const query = {};
  let invalid = false;

  if (typeof params.text_search === 'string' && params.text_search.trim() !== '') {
    // Cut by whole characters: cutting in the middle of an emoji leaves half of it, which can't be written back.
    query.search = Array.from(params.text_search).slice(0, MAX_SEARCH_LENGTH).join('');
  }

  // The timeframe is read only while its menu is shown. Custom dates must be real ones, and To no earlier than From
  // (To is dropped otherwise, as the menu does).
  if (switches.timeframeEnabled && TIMEFRAME_VALUES.indexOf(params.timeframe) !== -1) {
    const isCustom = params.timeframe === 'custom';
    const from = isCustom && isDate(params.from) ? params.from : '';
    const to = isCustom && isDate(params.to) && !(from && params.to < from) ? params.to : '';
    query.timeframe = { range: params.timeframe, from, to };
  }

  const selected = {};
  filters.forEach((filter) => {
    if (switches.filtersEnabled && typeof params[filter.id] === 'string') {
      const allowed = filter.options.map(option => option.value);
      const values = params[filter.id].split(',').filter(value => allowed.indexOf(value) !== -1);
      if (values.length) {
        selected[filter.id] = values.filter((value, index) => values.indexOf(value) === index);
      }
    }
  });
  if (Object.keys(selected).length) {
    query.filters = selected;
  }

  let visibleColumns = null;
  if (typeof params.cols === 'string') {
    const optional = columns.filter(column => !column.alwaysVisible && isEnabled(column, switches));
    const ids = params.cols.split(',');
    visibleColumns = optional.map(column => column.id).filter(id => ids.indexOf(id) !== -1);
  }

  if (typeof params.sortKey === 'string'
    && sortableColumnIds(columns, switches, visibleColumns, dataColumnIds).indexOf(params.sortKey) !== -1) {
    query.sort = { key: params.sortKey, dir: params.order === 'desc' ? 'desc' : 'asc' };
  }

  if (typeof params.page === 'string') {
    if (/^[0-9]+$/.test(params.page) && Number(params.page) >= 1) {
      query.page = Number(params.page);
    } else {
      invalid = true;
    }
  }

  return { query, visibleColumns, invalid };
}

/** The [key, value] of the search, when there is one. Also used by the link of Download CSV (platform/csv-url.js). */
export function searchParams(query) {
  return query.search.trim() !== '' ? [['text_search', query.search]] : [];
}

/** The [key, value] of each filter that has selected values, in the order of the registry, as in the address. */
export function filterParams(query, filters = filterRegistry) {
  return filters
    .filter(filter => query.filters[filter.id] && query.filters[filter.id].length)
    .map(filter => [filter.id, query.filters[filter.id].join(',')]);
}

/** [key, value] pairs as a query string, encoded like the legacy page's. */
export function encodeParams(params) {
  return params.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
}

/**
 * The address hash for a query: search, filters (in the order of the registry), sort, page, and the ticked columns when
 * the user has chosen them. Values are encoded like the legacy page's.
 */
export function buildHash({ query, visibleColumns }, { filters = filterRegistry } = {}) {
  const params = [...searchParams(query)];
  if (query.timeframe && query.timeframe.range !== 'all') {
    params.push(['timeframe', query.timeframe.range]);
    ['from', 'to'].filter(field => query.timeframe[field]).forEach(field => params.push([field, query.timeframe[field]]));
  }
  params.push(...filterParams(query, filters));
  params.push(['sortKey', query.sort.key], ['order', query.sort.dir], ['page', String(query.page)]);
  if (visibleColumns) {
    params.push(['cols', visibleColumns.join(',')]);
  }
  return `#?${encodeParams(params)}`;
}

/**
 * Keeps the store and the page's address in step. On start, and whenever the address changes by itself (the user edits
 * it, follows a link, or uses Back), the address is read into the store; whenever the store changes, the address is
 * rewritten (history.replaceState, so the history doesn't fill with every keystroke), once the view has stopped
 * changing for a moment. Returns a function that stops it. While the address is invalid it is left as it is, with the
 * message shown, until the user changes something.
 *
 * An address that is not the course list's (nothing, or "#?..." as written here) is not ours to read: the header's skip
 * link, for one, sets the hash to "#content", which must not reset the view.
 *
 * @param {Object} store - The course list store.
 * @param {Object} [options] - { switches } the page's waffle switches; `win` the window and `delay` the wait before
 *   the address is rewritten (for tests).
 */
export default function connectUrlStateToStore(store, { switches = {}, win = window, delay = WRITE_DELAY } = {}) {
  let restoredQuery = null;
  let restoredColumns = null;
  let restoring = false;
  let timer = null;
  // The filters whose options come from the data (Program, Course) can only be checked once the course rows are in
  // (status 'ready'). If the address is read before (the data is still loading, or the page had none at first and gets
  // it later), it is read again, as it was then, when the data comes, unless the user changed the view meanwhile.
  let waitingForData = store.getState().courses.status !== 'ready';
  let readHash = win.location.hash;

  const restore = (hash = win.location.hash) => {
    readHash = hash;
    const state = store.getState();
    const dataColumnIds = selectAvailableColumns(state, switches)
      .filter(column => column.hasData)
      .map(column => column.id);
    const { query, visibleColumns, invalid } = parseHash(hash, {
      switches, dataColumnIds, filters: selectFilters(state, switches.pendingFiltersShown),
    });
    // The two dispatches are one change: the address isn't rewritten in between.
    restoring = true;
    store.dispatch(queryRestored(query));
    store.dispatch(viewRestored({ visibleColumns, invalid }));
    restoring = false;
    restoredQuery = store.getState().query;
    restoredColumns = store.getState().view.visibleColumns;
  };

  // The user changed the view before the course data came: their changes stay, and the filters of the address that
  // were left out when it was first read, because their options weren't known yet (Program, Course), are added unless
  // the user has set them since.
  const addDataFilters = (state) => {
    const { query } = parseHash(readHash, { switches, filters: selectFilters(state, switches.pendingFiltersShown) });
    const added = {};
    Object.keys(query.filters || {}).forEach((id) => {
      if (!restoredQuery.filters[id] && !state.query.filters[id]) {
        added[id] = query.filters[id];
      }
    });
    if (Object.keys(added).length) {
      restoring = true;
      store.dispatch(queryRestored({ ...state.query, filters: { ...state.query.filters, ...added } }));
      restoring = false;
    }
  };

  const write = () => {
    timer = null;
    const state = store.getState();
    if (state.view.urlInvalid) {
      return;
    }
    // The page written is the one shown: a page past the end is the last one. Before the course rows are loaded there
    // is no last page to know, so the page is written as it is.
    const page = state.courses.status === 'ready' ? selectCurrentPage(state) : state.query.page;
    try {
      const next = buildHash({ query: { ...state.query, page }, visibleColumns: state.view.visibleColumns });
      if (next !== win.location.hash) {
        win.history.replaceState(win.history.state, '', `${win.location.pathname}${win.location.search}${next}`);
      }
    } catch (error) {
      // The address couldn't be written (text that can't be encoded, or the browser limiting how often a page may
      // rewrite it). The view still works, so the address is left as it is rather than breaking the page.
    }
  };

  const onStoreChange = () => {
    if (restoring) {
      return;
    }
    let state = store.getState();
    if (waitingForData && state.courses.status === 'ready') {
      waitingForData = false;
      if (state.query === restoredQuery && state.view.visibleColumns === restoredColumns) {
        restore(readHash);
      } else {
        addDataFilters(state);
      }
      state = store.getState();
    }
    if (state.view.urlInvalid
      && (state.query !== restoredQuery || state.view.visibleColumns !== restoredColumns)) {
      // The user changed something: the address is theirs to rewrite now, and the message goes away.
      store.dispatch(viewRestored({ visibleColumns: state.view.visibleColumns, invalid: false }));
    }
    clearTimeout(timer);
    timer = setTimeout(write, delay);
  };

  const onHashChange = () => {
    const { hash } = win.location;
    if (hash !== '' && hash !== '#' && hash.indexOf('#?') !== 0) {
      return;
    }
    restore();
    write();
  };

  restore();
  const unsubscribe = store.subscribe(onStoreChange);
  win.addEventListener('hashchange', onHashChange);
  write();
  return () => {
    clearTimeout(timer);
    unsubscribe();
    win.removeEventListener('hashchange', onHashChange);
  };
}
