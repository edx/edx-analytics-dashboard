import columns from 'course-list/react/registries/columns';
import filters from 'course-list/react/registries/filters';
import metrics from 'course-list/react/registries/metrics';

// Every entry that is added to a registry must have the keys the page reads (see the comment of each registry).
describe('registries', () => {
  const REQUIRED = {
    filters: ['id', 'label', 'options', 'matches'],
    columns: ['id', 'label', 'cell', 'sortValue', 'csvField', 'alwaysVisible', 'defaultVisible', 'requires'],
    metrics: ['id', 'textKey', 'reduce'],
  };

  Object.keys(REQUIRED).forEach((name) => {
    const registry = { filters, columns, metrics }[name];

    describe(name, () => {
      it('is a list', () => {
        expect(Array.isArray(registry)).toBe(true);
      });

      it('has entries with every required key', () => {
        registry.forEach((entry) => {
          expect(Object.keys(entry)).toEqual(jasmine.arrayContaining(REQUIRED[name]));
        });
      });

      it('has unique ids', () => {
        const ids = registry.map(entry => entry.id);

        expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
      });
    });
  });
});
