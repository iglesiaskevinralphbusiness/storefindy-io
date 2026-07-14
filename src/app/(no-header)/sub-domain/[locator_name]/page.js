import { getLocatorByName } from '@/actions/locator';
import { notFound } from 'next/navigation';
import Script from "next/script";

export async function generateMetadata({ params }) {
    const { locator_name } = await params;

    const locator = await getLocatorByName(locator_name, false);

    if (!locator) {
        return {
            title: 'Not Found',
            description: 'The requested page could not be found.',
        };
    }

    const metadata = {
        title: locator.sub_domain.meta_title,
        description: locator.sub_domain.meta_description,
    };

    // use the custom favicon (stored as a data-URL) when one is set
    if (locator.sub_domain.favicon) {
        metadata.icons = { icon: locator.sub_domain.favicon };
    }

    return metadata;
}

export default async function SubDomainPage({ params }) {
    const { locator_name } = await params;

    const data = await getLocatorByName(locator_name, true);
    if (!data) {
        notFound();
    }

    return <>
        {data.sub_domain.custom_html_header && <div dangerouslySetInnerHTML={{ __html: data.sub_domain.custom_html_header }} />}
        <locator-widget locator={data.locator._id.toString()}></locator-widget>
        {data.sub_domain.custom_html_footer && <div dangerouslySetInnerHTML={{ __html: data.sub_domain.custom_html_footer }} />}

        <Script src={`https://www.storefindy.com/widgets.js`} defer></Script>
        <Script id="custom-js" strategy="afterInteractive">
            {data.sub_domain.custom_js}
        </Script>
        <style dangerouslySetInnerHTML={{ __html: data.sub_domain.custom_css }} />
    </>;
}