'use server';
import { getLocators } from '@/actions/locator';
import LocatorsEmbedPageClient from './embed-client';

export default async function LocatorsEmbedPage({ searchParams }) {
    const { id } = await searchParams;
    const locators = await getLocators();

    return <LocatorsEmbedPageClient
        activeLocatorId={id}
        locators={locators}
    />
}
