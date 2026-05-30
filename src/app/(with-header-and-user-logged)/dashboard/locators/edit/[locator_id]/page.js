import LocatorsCreatePage from '../../create/page';
import { getLocatorById } from '@/actions/locator';
import { notFound } from 'next/navigation';

export default async function LocatorsEditPage({ params }) {
    const { locator_id } = await params;
    const locator = await getLocatorById(locator_id);
    if(!locator) {
        return notFound();
    }

    return <LocatorsCreatePage data={locator} />
}