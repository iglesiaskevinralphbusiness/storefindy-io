import { getLocatorById } from '@/actions/locator';
import { notFound } from 'next/navigation';
import CustomizeWrapper from '@/components/Dashboard/CustomizeWrapper';

export default async function LocatorsCustomizePage({ params }) {
    const { locator_id } = await params;
    const locator = await getLocatorById(locator_id);
    if(!locator) {
        return notFound();
    }

    console.log(locator);

    return <CustomizeWrapper data={locator} />;
}