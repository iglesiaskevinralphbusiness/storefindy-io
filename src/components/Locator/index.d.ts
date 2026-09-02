import type { ComponentType, ReactNode } from 'react';

export type LocatorProps = {
	isInactive?: boolean | 'active' | 'inactive';
	inactiveForm?: ReactNode;
	user_plan?: 'free' | 'pro' | 'business';
	locator_id?: string;
	available_countries?: string[];
	search_radius?: number;
	distance_unit?: 'mi' | 'km';
	default_zoom_level?: number;
	detect_location?: boolean;
	default_country?: string;
	default_language?: string;
	filters?: unknown[];
	settings?: Record<string, unknown>;
	features?: Record<string, unknown>;
	/** Mapbox access token, injected server-side only for a locator whose plan may use Mapbox. */
	mapbox_token?: string;
	show_search_bar?: boolean;
	show_filters?: boolean;
	show_radius?: boolean;
	show_store_list?: boolean;
	show_store_hours?: boolean;
	show_directions?: boolean;
	show_website_link?: boolean;
	apiOrigin?: string;
};

declare const Locator: ComponentType<LocatorProps>;
export default Locator;

export const locatorStyles: string;
