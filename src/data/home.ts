import type { DistrictId } from './districts';
import type { MarketingImage } from './marketing';

/** Official concept renders selected for each district chapter; provenance is in the asset manifest. */
export const HOME_DISTRICT_IMAGES: Readonly<Record<DistrictId, MarketingImage>> = {
  central: 'central-hub',
  marina: 'marina',
  beach: 'beach',
  'sports-park': 'stadium-villages',
  culture: 'culture-forum',
  wellness: 'wellness-street',
};
