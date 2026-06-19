import { getLocatorById, getAvailableCountriesBasedOnLocations } from '@/actions/locator';
import { notFound } from 'next/navigation';
import CustomizeWrapper from '@/components/Dashboard/CustomizeWrapper';

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
    />;
}