import type { ComponentType, ReactNode } from 'react';

export type LocatorProps = {
	isInactive?: boolean | 'active' | 'inactive';
	inactiveForm?: ReactNode;
	locator_id?: string;
	available_countries?: string[];
	search_radius?: number;
	default_zoom_level?: number;
	detect_location?: boolean;
	default_country?: string;
	filters?: unknown[];
	settings?: Record<string, unknown>;
	features?: Record<string, unknown>;
	show_search_bar?: boolean;
	show_filters?: boolean;
	show_radius?: boolean;
	show_store_list?: boolean;
	show_store_hours?: boolean;
	show_directions?: boolean;
	show_website_link?: boolean;
};

declare const Locator: ComponentType<LocatorProps>;
export default Locator;

export const locatorStyles: string;
