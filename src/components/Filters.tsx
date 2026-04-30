import type { FilterState } from '../types';
import { sourceLabels } from '../api/events';
import { useI18n } from '../i18n-context';
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
  const { locale, copy } = useI18n();
  const timeframeOptions = getTimeframeOptions(locale);

  return (
    <section className="filters-panel" aria-labelledby="filters-title">
      <div className="filters-head">
        <div>
          <p className="eyebrow">{copy.filters.eyebrow}</p>
          <h2 id="filters-title">{copy.filters.title}</h2>
        </div>
        <button type="button" className="ghost-button" onClick={onReset}>
          {copy.filters.reset}
        </button>
      </div>

      <div className="filter-grid">
        <fieldset className="chip-group">
          <legend className="chip-legend">{copy.filters.dates}</legend>
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
          <span>{copy.filters.search}</span>
          <input
            type="search"
            placeholder={copy.filters.searchPlaceholder}
            value={value.search}
            onChange={(event) => onChange({ ...value, search: event.target.value })}
          />
        </label>

        <label className="field">
          <span>{copy.filters.source}</span>
          <select
            value={value.source}
            onChange={(event) => onChange({ ...value, source: event.target.value as FilterState['source'] })}
          >
            <option value="all">{copy.filters.allSources}</option>
            {Object.entries(sourceLabels).map(([source, label]) => (
              <option key={source} value={source}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>{copy.filters.maxDistance}</span>
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
                {option === 'all' ? copy.filters.anyDistance : `${option} km`}
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
          <span>{copy.filters.openingsOnly}</span>
        </label>

        <label className="toggle-field">
          <input
            type="checkbox"
            checked={value.savedOnly}
            onChange={(event) => onChange({ ...value, savedOnly: event.target.checked })}
          />
          <span>{copy.filters.savedOnly}</span>
        </label>
      </div>
    </section>
  );
}
