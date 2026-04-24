type EmptyStateProps = {
  hasFilters: boolean;
};

export function EmptyState({ hasFilters }: EmptyStateProps) {
  return (
    <section className="state-panel" aria-live="polite">
      <h2>No matching events</h2>
      <p>
        {hasFilters
          ? 'Try widening the date window, source selection, or distance filter.'
          : 'The local dataset is empty right now. Refresh or update public/data/events.json.'}
      </p>
    </section>
  );
}
