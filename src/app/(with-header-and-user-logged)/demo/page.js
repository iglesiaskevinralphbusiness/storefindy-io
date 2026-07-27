import { getLocatorByIdDemoPage, getAvailableCountriesBasedOnLocationsDemoPage } from '@/actions/demo';
import CustomizeWrapper from '@/components/Dashboard/CustomizeWrapper';
import { notFound } from 'next/navigation';

export default async function DemoPage() {
    const locator_id = '6a62dc48ea08c051a7cb793e';
    const preview = null;

    const locator = await getLocatorByIdDemoPage(locator_id);
    if(!locator) {
        return notFound();
    }
    const countries = await getAvailableCountriesBasedOnLocationsDemoPage(locator_id);
    const available_countries = countries.length > 0 ? countries : [locator.default_country];

    return <CustomizeWrapper
        data={locator}
        available_countries={available_countries}
        onPreview={preview === '1'}
        demo={true}
    />;
}