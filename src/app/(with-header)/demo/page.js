import { getLocatorByIdDemoPage, getAvailableCountriesBasedOnLocationsDemoPage } from '@/actions/demo';
import CustomizeWrapper from '@/components/Dashboard/CustomizeWrapper';
import { notFound } from 'next/navigation';

export const metadata = {
    title: 'Store Locator Demo | Store Findy',
    description: 'Explore a live, interactive demo of the Store Findy store locator and see the map-based find-a-store experience you can add to your website.',
};

export default async function DemoPage() {
    const locator_id = process.env.DEMO_LOCATOR_ID;
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