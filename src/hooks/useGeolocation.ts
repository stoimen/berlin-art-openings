import { useCallback, useEffect, useRef, useState } from 'react';
import type { LocationPermissionStatus } from '../types';
import { GEOLOCATION_TIMEOUT_MS, LOCATION_CACHE_MS } from '../constants';

type GeolocationState = {
  status: LocationPermissionStatus;
  latitude?: number;
  longitude?: number;
  errorMessage?: string;
};

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({ status: 'idle' });
  const autoAttemptedRef = useRef(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'unsupported' });
      return;
    }

    let cancelled = false;
    let permissionStatus: PermissionStatus | undefined;

    async function inspectPermission() {
      if (!('permissions' in navigator) || !navigator.permissions.query) {
        setState((current) => ({
          ...current,
          status: current.status === 'idle' ? 'prompt' : current.status,
        }));
        return;
      }

      try {
        const nextPermissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        permissionStatus = nextPermissionStatus;
        if (cancelled) return;

        setState((current) => ({
          ...current,
          status: nextPermissionStatus.state === 'granted' ? 'granted' : nextPermissionStatus.state,
        }));

        nextPermissionStatus.onchange = () => {
          if (cancelled) return;
          setState((current) => ({
            ...current,
            status: nextPermissionStatus.state === 'granted' ? 'granted' : nextPermissionStatus.state,
          }));
        };
      } catch {
        setState((current) => ({
          ...current,
          status: current.status === 'idle' ? 'prompt' : current.status,
        }));
      }
    }

    void inspectPermission();

    return () => {
      cancelled = true;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, []);

  const requestLocation = useCallback((mode: 'auto' | 'manual' = 'manual') => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'unsupported' });
      return;
    }

    if (inFlightRef.current) return;

    if (mode === 'auto') {
      autoAttemptedRef.current = true;
    }

    inFlightRef.current = true;
    setState((current) => ({ ...current, status: 'loading', errorMessage: undefined }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        inFlightRef.current = false;
        setState({
          status: 'granted',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        inFlightRef.current = false;
        setState({
          status: error.code === error.PERMISSION_DENIED ? 'denied' : 'error',
          errorMessage: error.message,
        });
      },
      {
        enableHighAccuracy: false,
        timeout: GEOLOCATION_TIMEOUT_MS,
        maximumAge: LOCATION_CACHE_MS,
      },
    );
  }, []);

  useEffect(() => {
    if (!autoAttemptedRef.current && (state.status === 'prompt' || state.status === 'granted') && state.latitude === undefined) {
      requestLocation('auto');
    }
  }, [state.status, state.latitude, requestLocation]);

  return { ...state, requestLocation };
}
