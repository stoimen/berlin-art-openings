import { useI18n } from '../i18n-context';

type ErrorStateProps = {
  message: string;
  onRetry: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { copy } = useI18n();

  return (
    <section className="state-panel error-panel" role="alert">
      <h2>{copy.errorState.title}</h2>
      <p>{message}</p>
      <button type="button" className="primary-button" onClick={onRetry}>
        {copy.errorState.retry}
      </button>
    </section>
  );
}
