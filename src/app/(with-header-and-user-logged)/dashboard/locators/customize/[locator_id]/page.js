import { getLocatorById, getAvailableCountriesBasedOnLocations } from '@/actions/locator';
import { notFound } from 'next/navigation';
import CustomizeWrapper from '@/components/Dashboard/CustomizeWrapper';
import { getMapboxTokenForCustomize } from '@/utils/mapbox-token';

export const metadata = {
    title: 'Customize Locator | Store Findy',
    description: 'Customize the colors, map style, pins, and features of your store locator to match your brand with Store Findy.',
};

export default async function LocatorsCustomizePage({ params, searchParams }) {
    const { locator_id } = await params;
    const { preview } = await searchParams;
    const locator = await getLocatorById(locator_id);
    if(!locator) {
        return notFound();
    }
    const countries = await getAvailableCountriesBasedOnLocations(locator_id);
    const available_countries = countries.length > 0 ? countries : [locator.default_country];

    return <CustomizeWrapper
        data={locator}
        available_countries={available_countries}
        onPreview={preview === '1'}
        // Empty unless this locator's plan may use Mapbox — the live preview
        // needs the token before `map_library` has ever been saved.
        mapbox_token={getMapboxTokenForCustomize(locator.user_plan)}
    />;
}