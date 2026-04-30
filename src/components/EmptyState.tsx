import { useI18n } from '../i18n-context';

type EmptyStateProps = {
  hasFilters: boolean;
  savedOnly: boolean;
  favoriteCount: number;
};

export function EmptyState({ hasFilters, savedOnly, favoriteCount }: EmptyStateProps) {
  const { copy } = useI18n();
  const message = savedOnly
    ? favoriteCount > 0
      ? copy.emptyState.savedWithFilters
      : copy.emptyState.savedEmpty
    : hasFilters
      ? copy.emptyState.filtersOnly
      : copy.emptyState.datasetEmpty;

  return (
    <section className="state-panel" aria-live="polite">
      <h2>{copy.emptyState.title}</h2>
      <p>{message}</p>
    </section>
  );
}
