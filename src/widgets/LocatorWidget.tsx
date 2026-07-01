import { useEffect, useState } from 'react';
import Locator from '@/components/Locator';
import { generateSettingsDefault, generateFeaturesDefault } from '@/utils/helpers';

type LocatorWidgetProps = {
	locator?: string;
};

type LocatorData = {
	_id: string;
	user_plan?: 'free' | 'pro' | 'business';
	status?: 'active' | 'inactive';
	filters?: any[];
	search_radius?: number;
	default_zoom_level?: number;
	detect_location?: boolean;
	default_country?: string;
	show_search_bar?: boolean;
	show_filters?: boolean;
	show_radius?: boolean;
	show_store_list?: boolean;
	show_store_hours?: boolean;
	show_directions?: boolean;
	show_website_link?: boolean;
	settings?: Record<string, unknown>;
	features?: Record<string, unknown>;
};

export default function LocatorWidget({ locator }: LocatorWidgetProps) {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const [data, setData] = useState<LocatorData | null>(null);
	const [available_countries, setAvailableCountries] = useState<string[]>([]);
	const [settings, setSettings] = useState<LocatorData['settings']>({});
	const [features, setFeatures] = useState<LocatorData['features']>({});

	useEffect(() => {
		if (!locator) return;

		// Send the visitor's browser timezone offset so the analytics hour bucket
		// reflects the user's PC time rather than the server's timezone.
		const tzOffset = new Date().getTimezoneOffset();

		fetch(`https://www.storefindy.com/api/get-locator/${locator}?tz_offset=${tzOffset}`)
		// fetch(`http://localhost:3000/api/get-locator/${locator}?tz_offset=${tzOffset}`)
			.then((response) => response.json())
			.then((data) => {

				// The API responds with `{ status, locator, countries }`. Every
				// display setting and feature flag lives on `data.locator`, so we
				// read them off that document — not the raw response. Reading them
				// off `data` left every `features.*` flag undefined, which hid the
				// search form, filters, radius, store list, and directions.
				const locator = data.locator;
				if(!locator) {
					setError(true);
					setLoading(false);
					return;
				}
				const { settings } = locator;
				setData(locator);
				setSettings(generateSettingsDefault(settings));
				setFeatures(generateFeaturesDefault(locator));
				setAvailableCountries(data.countries);
				setLoading(false);
			})
			.catch((error) => {
				setError(true);
				setLoading(false);
				console.error('Error fetching locator:', error);
			});
	}, [locator]);

	const Inactive = () => {
		return <div className="inactive">
			<div className="inactive-content">
				<h2>Oops! Failed to load the Store locator.</h2>
				<p className="msg">The Store locator is either inactive or not found.</p>
				<p className="inactive-powered-by">Powered by <a href="https://storefindy.com" target="_blank">Storefindy</a></p>
			</div>
		</div>;
	};

	if(error) return <Inactive />;
	if (loading) return <div>Loading...</div>;
	if (!data) return null;

	console.log(data)

	return <>
		 <Locator
			// active/Inactive
			isInactive={error ? 'inactive' : data.status}
			inactiveForm={<Inactive />}
			user_plan={data.user_plan}
		 
			// locator data
			locator_id={data._id}
			filters={data.filters}
			available_countries={available_countries}

			// default settings
			search_radius={data.search_radius}
			default_zoom_level={data.default_zoom_level}
			detect_location={data.detect_location}
			default_country={data.default_country}
			show_search_bar={data.show_search_bar}
			show_filters={data.show_filters}
			show_radius={data.show_radius}
			show_store_list={data.show_store_list}
			show_store_hours={data.show_store_hours}
			show_directions={data.show_directions}
			show_website_link={data.show_website_link}

			// customize settings
			settings={settings}
			
			// features settings
			features={features}
		/>
	</>;
}
