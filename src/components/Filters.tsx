import type { FilterState } from '../types';
import { sourceLabels } from '../api/events';
import { getTimeframeOptions } from '../utils/date';

export type { FilterState };

type FiltersProps = {
  value: FilterState;
  hasLocation: boolean;
  onChange: (nextValue: FilterState) => void;
  onReset: () => void;
};

const distanceOptions = ['all', 1, 3, 5, 10, 20] as const;

export function Filters({ value, hasLocation, onChange, onReset }: FiltersProps) {
  const timeframeOptions = getTimeframeOptions();

  return (
    <section className="filters-panel" aria-labelledby="filters-title">
      <div className="filters-head">
        <div>
          <p className="eyebrow">Filters</p>
          <h2 id="filters-title">Focus the list</h2>
        </div>
        <button type="button" className="ghost-button" onClick={onReset}>
          Reset
        </button>
      </div>

      <div className="filter-grid">
        <fieldset className="chip-group">
          <legend className="chip-legend">Dates</legend>
          {timeframeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={option.value === value.timeframe ? 'chip-button active' : 'chip-button'}
              aria-pressed={option.value === value.timeframe}
              onClick={() => onChange({ ...value, timeframe: option.value })}
            >
              {option.label}
            </button>
          ))}
        </fieldset>

        <label className="field">
          <span>Search</span>
          <input
            type="search"
            placeholder="Artist, venue, neighborhood…"
            value={value.search}
            onChange={(event) => onChange({ ...value, search: event.target.value })}
          />
        </label>

        <label className="field">
          <span>Source</span>
          <select
            value={value.source}
            onChange={(event) => onChange({ ...value, source: event.target.value as FilterState['source'] })}
          >
            <option value="all">All sources</option>
            {Object.entries(sourceLabels).map(([source, label]) => (
              <option key={source} value={source}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Max distance</span>
          <select
            value={String(value.maxDistanceKm)}
            disabled={!hasLocation}
            onChange={(event) =>
              onChange({
                ...value,
                maxDistanceKm: event.target.value === 'all' ? 'all' : Number(event.target.value),
              })
            }
          >
            {distanceOptions.map((option) => (
              <option key={String(option)} value={String(option)}>
                {option === 'all' ? 'Any distance' : `${option} km`}
              </option>
            ))}
          </select>
        </label>

        <label className="toggle-field">
          <input
            type="checkbox"
            checked={value.openingsOnly}
            onChange={(event) => onChange({ ...value, openingsOnly: event.target.checked })}
          />
          <span>Openings only</span>
        </label>

        <label className="toggle-field">
          <input
            type="checkbox"
            checked={value.savedOnly}
            onChange={(event) => onChange({ ...value, savedOnly: event.target.checked })}
          />
          <span>Saved only</span>
        </label>
      </div>
    </section>
  );
}
