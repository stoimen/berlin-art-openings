import { getIntlLocale, translations, type Locale } from '../i18n';

const EARTH_RADIUS_KM = 6371;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function haversineDistanceKm(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
) {
  const latitudeDelta = toRadians(toLatitude - fromLatitude);
  const longitudeDelta = toRadians(toLongitude - fromLongitude);

  const originLatitude = toRadians(fromLatitude);
  const destinationLatitude = toRadians(toLatitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

type FormatDistanceOptions = {
  locationEnabled: boolean;
  hasCoordinates: boolean;
};

export function formatDistanceForLocale(
  distanceKm: number | undefined,
  options: FormatDistanceOptions,
  locale: Locale,
) {
  if (distanceKm === undefined) {
    if (!options.locationEnabled) {
      return translations[locale].distance.shareLocation;
    }

    if (!options.hasCoordinates) {
      return translations[locale].distance.coordinatesUnavailable;
    }

    return translations[locale].distance.distanceUnavailable;
  }

  if (distanceKm < 1) {
    return translations[locale].distance.metersAway(Math.round(distanceKm * 1000));
  }

  const formattedDistance = new Intl.NumberFormat(getIntlLocale(locale), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(distanceKm);

  return translations[locale].distance.kilometersAway(formattedDistance);
}
