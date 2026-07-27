'use server';
import { getLocators } from '@/actions/locator';
import LocatorsEmbedPageClient from './embed-client';

export async function generateMetadata() {
    return {
        title: 'Embed Your Locator | Store Findy',
        description: 'Copy the one-line embed code and add your store locator to any website with Store Findy.',
    };
}

export default async function LocatorsEmbedPage({ searchParams }) {
    const { id } = await searchParams;
    const locators = await getLocators();

    return <LocatorsEmbedPageClient
        activeLocatorId={id}
        locators={locators}
    />
}
