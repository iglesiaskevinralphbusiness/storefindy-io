import { getLocatorByName } from '@/actions/locator';
import { notFound } from 'next/navigation';
import Script from "next/script";

export async function generateMetadata({ params }) {
    const { locator_name } = await params;

    const locator = await getLocatorByName(locator_name);

    if (!locator) {
        return {
            title: 'Not Found',
            description: 'The requested page could not be found.',
        };
    }

    return {
        title: locator.sub_domain.meta_title,
        description: locator.sub_domain.meta_description,
    };
}

export default async function SubDomainPage({ params }) {
    const { locator_name } = await params;

    const locator = await getLocatorByName(locator_name);

    if (!locator) {
        notFound();
    }

    return <>
        {locator.sub_domain.custom_html_header && <div dangerouslySetInnerHTML={{ __html: locator.sub_domain.custom_html_header }} />}
        <div>
            <h1>{locator.sub_domain.name}</h1>
        </div>
        {locator.sub_domain.custom_html_footer && <div dangerouslySetInnerHTML={{ __html: locator.sub_domain.custom_html_footer }} />}

        <Script id="custom-js" strategy="afterInteractive">
            {locator.sub_domain.custom_js}
        </Script>
        <style dangerouslySetInnerHTML={{ __html: locator.sub_domain.custom_css }} />
    </>;
}