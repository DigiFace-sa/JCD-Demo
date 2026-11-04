import type { AttractionId } from './attractions';
import type { DistrictId } from './districts';
import type { MarketingImage } from './marketing';
import { DESTINATION_STATS, type Stat } from './site';

/** Official district concepts; source provenance is recorded in assets/official-images.json. */
export const DESTINATION_DISTRICT_IMAGES: Readonly<Record<DistrictId, MarketingImage>> = {
  central: 'central-hub',
  marina: 'marina',
  beach: 'beach-loungers',
  'sports-park': 'stadium-villages',
  culture: 'culture-forum',
  wellness: 'wellness-street',
};

/** Only the named attractions from the brief are shown; images are official concept renders. */
export const DESTINATION_ATTRACTIONS: readonly {
  readonly id: AttractionId;
  readonly image: MarketingImage;
}[] = [
  { id: 'entertainment-pier', image: 'entertainment-pier' },
  { id: 'public-beach', image: 'beach' },
  { id: 'cruise-terminal', image: 'cruise-terminal' },
];

/** Reuse approved facts rather than duplicating their values or translation keys. */
export const DESTINATION_FACTS: readonly Stat[] = DESTINATION_STATS.filter(
  ({ valueKey }) =>
    valueKey === 'stats.area.value' ||
    valueKey === 'stats.shoreline.value' ||
    valueKey === 'stats.beach.value',
);
