import { useEffect, useState } from 'react';
import Locator from '@/components/Locator';

type LocatorWidgetProps = {
	locator?: string;
};

type LocatorData = {
	_id: string;
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
	const [data, setData] = useState<LocatorData | null>(null);
	const [available_countries, setAvailableCountries] = useState<string[]>([]);
	const [settings, setSettings] = useState<LocatorData['settings']>({});
	const [features, setFeatures] = useState<LocatorData['features']>({});

	useEffect(() => {
		if (!locator) return;

		fetch(`/api/get-locator/${locator}`)
			.then((response) => response.json())
			.then((data) => {
				// The API responds with `{ status, locator, countries }`. Every
				// display setting and feature flag lives on `data.locator`, so we
				// read them off that document — not the raw response. Reading them
				// off `data` left every `features.*` flag undefined, which hid the
				// search form, filters, radius, store list, and directions.
				const locator = data.locator;
				const { settings } = locator;
				setData(locator);
				setSettings({
					height: settings.height,
					background: settings.background,
					text_color: settings.text_color,
					font_family: settings.font_family,
					font_size: settings.font_size,
					searchInput: {
						border: settings.searchInput.border,
						background: settings.searchInput.background,
						text_color: settings.searchInput.text_color,
						border_color: settings.searchInput.border_color,
						placeholder: settings.searchInput.placeholder,
					},
					search: {
						border: settings.search.border,
						background: settings.search.background,
						label: settings.search.label,
						text_color: settings.search.text_color,
						icon: settings.search.icon,
					},
					filter: {
						border: settings.filter.border,
						background: settings.filter.background,
						label: settings.filter.label,
						text_color: settings.filter.text_color,
						icon: settings.filter.icon,
					},
					filterList: {
						border_color: settings.filterList.border_color,
						background: settings.filterList.background,
						text_color: settings.filterList.text_color,
						active_background: settings.filterList.active_background,
						active_text_color: settings.filterList.active_text_color,
					},
					resultItem: {
						active_border_color: settings.resultItem.active_border_color,
						border_color: settings.resultItem.border_color,
						background: settings.resultItem.background,
					},
					getDirections: {
						border: settings.getDirections.border,
						background: settings.getDirections.background,
						label: settings.getDirections.label,
						text_color: settings.getDirections.text_color,
						icon: settings.getDirections.icon,
					},
					viewLocation: {
						border: settings.viewLocation.border,
						background: settings.viewLocation.background,
						label: settings.viewLocation.label,
						text_color: settings.viewLocation.text_color,
						icon: settings.viewLocation.icon,
					},
					pin: {
						color: settings.pin.color,
						size: settings.pin.size,
						text_color: settings.pin.text_color,
						text_size: settings.pin.text_size,
						image: settings.pin.image,
					}
				});
				setFeatures({
					//
					show_map_radius_indicator: locator.show_map_radius_indicator,
					show_map_pin_number: locator.show_map_pin_number,
					form_style: locator.form_style,
					focused_zoom: locator.focused_zoom,

					//
					show_search_bar: locator.show_search_bar,
					detect_location: locator.detect_location,
					show_filters: locator.show_filters,
					show_radius: locator.show_radius,
					show_store_list: locator.show_store_list,
					show_directions: locator.show_directions,
					show_store_hours: locator.show_store_hours,
					powered_by_storefindy: locator.powered_by_storefindy,
				});
				setAvailableCountries(data.countries);
				setLoading(false);
			})
			.catch((error) => {
				console.error('Error fetching locator:', error);
			});
	}, [locator]);

	if (loading) return <div>Loading...</div>;
	if (!data) return null;

	return <>
		 <Locator
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
