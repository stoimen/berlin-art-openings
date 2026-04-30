import type { LocationPermissionStatus } from '../types';
import { useI18n } from '../i18n-context';

type LocationPermissionProps = {
  status: LocationPermissionStatus;
  errorMessage?: string;
  onRequest: () => void;
};

function getCopy(status: LocationPermissionStatus, errorMessage: string | undefined, fallbackCopy: ReturnType<typeof useI18n>['copy']) {
  switch (status) {
    case 'granted':
      return fallbackCopy.location.granted;
    case 'loading':
      return fallbackCopy.location.loading;
    case 'denied':
      return fallbackCopy.location.denied;
    case 'error':
      return errorMessage ?? fallbackCopy.location.errorFallback;
    case 'unsupported':
      return fallbackCopy.location.unsupported;
    case 'prompt':
    case 'idle':
    default:
      return fallbackCopy.location.prompt;
  }
}

export function LocationPermission({ status, errorMessage, onRequest }: LocationPermissionProps) {
  const { copy } = useI18n();

  return (
    <section className="location-panel" aria-labelledby="location-panel-title">
      <div>
        <p className="eyebrow">{copy.location.eyebrow}</p>
        <h2 id="location-panel-title">{copy.location.title}</h2>
        <p>{getCopy(status, errorMessage, copy)}</p>
      </div>

      <button type="button" className="primary-button" onClick={onRequest} disabled={status === 'loading'}>
        {status === 'granted' ? copy.location.refresh : status === 'loading' ? copy.location.locating : copy.location.useMyLocation}
      </button>
    </section>
  );
}
