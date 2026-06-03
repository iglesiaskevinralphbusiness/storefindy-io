export const LOCALES = [
	{ code: 'en', label: 'English' },
	{ code: 'fr', label: 'Français' },
];

export { COUNTRIES } from './countries';

export const ZOOM_LEVELS = [
	{ code: '10', label: 'City level (zoom 10)' },
	{ code: '7', label: 'State level (zoom 7)' },
	{ code: '5', label: 'Country level (zoom 5)' },
	{ code: '2', label: 'World level (zoom 2)' },
];

export const SEARCH_RADII = [
	{ code: '10', label: '10 miles' },
	{ code: '25', label: '25 miles' },
	{ code: '50', label: '50 miles' },
	{ code: '100', label: '100 miles' },
];

export const MAXIMUM_RESULTS_SHOWN = [
	{ code: '5', label: '5 results' },
	{ code: '10', label: '10 results' },
	{ code: '25', label: '25 results' },
	{ code: '50', label: '50 results' },
	{ code: '5000', label: 'All results' },
];




// Dummy data — replace with real locations once getLocations is wired up.
const DUMMY_LOCATIONS = [
    { id: 1,  name: 'SM Mall of Asia',       address: 'Seaside Blvd, Pasay City',        locator: 'Main Store Locator', status: 'published', views: 842 },
    { id: 2,  name: 'Robinsons Galleria',    address: 'EDSA, Ortigas, Pasig City',       locator: 'Branch Finder',      status: 'published', views: 310 },
    { id: 3,  name: 'Mercury Drug Makati',   address: 'Ayala Ave, Makati City',          locator: 'Main Store Locator', status: 'published', views: 254 },
    { id: 4,  name: 'Puregold Cubao',        address: 'P. Tuazon Blvd, Quezon City',     locator: 'Main Store Locator', status: 'published', views: 198 },
    { id: 5,  name: 'Ayala Center Cebu',     address: 'Cebu Business Park, Cebu City',   locator: 'Branch Finder',      status: 'published', views: 432 },
    { id: 6,  name: 'Rose Pharmacy Cebu',    address: 'Colon St, Cebu City',             locator: 'Branch Finder',      status: 'published', views: 112 },
    { id: 7,  name: 'Abreeza Mall Davao',    address: 'JP Laurel Ave, Davao City',       locator: 'Branch Finder',      status: 'published', views: 287 },
    { id: 8,  name: 'Bench BGC',             address: 'BGC High Street, Taguig City',    locator: 'Main Store Locator', status: 'published', views: 174 },
    { id: 9,  name: 'SM Megamall',           address: 'EDSA, Mandaluyong City',          locator: 'Main Store Locator', status: 'published', views: 521 },
    { id: 10, name: 'Jollibee Ortigas',      address: 'Ortigas Ave, Pasig City',         locator: 'Pop-up Stores',      status: 'published', views: 89  },
    { id: 11, name: "Watson's Alabang",      address: 'Alabang Town Center, Muntinlupa', locator: 'Main Store Locator', status: 'draft',     views: 0   },
    { id: 12, name: 'Landmark Trinoma',      address: 'North Ave, Quezon City',          locator: 'Branch Finder',      status: 'published', views: 203 },
    { id: 13, name: 'H&M Glorietta',         address: 'Ayala Center, Makati City',       locator: 'Main Store Locator', status: 'draft',     views: 0   },
    { id: 14, name: 'National Bookstore',    address: 'SM City Cebu, Cebu City',         locator: 'Branch Finder',      status: 'published', views: 67  },
    { id: 15, name: 'Mercury Drug Davao',    address: 'San Pedro St, Davao City',        locator: 'Branch Finder',      status: 'published', views: 145 },
    { id: 16, name: 'Pop-up Store BGC',      address: 'Bonifacio High Street, Taguig',   locator: 'Pop-up Stores',      status: 'draft',     views: 0   },
    { id: 17, name: 'Savemore Marikina',     address: 'Rizal Ave, Marikina City',        locator: 'Main Store Locator', status: 'published', views: 178 },
    { id: 18, name: 'Pop-up Eastwood',       address: 'Eastwood City, Quezon City',      locator: 'Pop-up Stores',      status: 'draft',     views: 0   },
    { id: 19, name: 'SM City Iloilo',        address: 'Benigno Aquino Ave, Iloilo City', locator: 'Branch Finder',      status: 'published', views: 234 },
    { id: 20, name: 'Jollibee Makati CBD',   address: 'Dela Rosa St, Makati City',       locator: 'Pop-up Stores',      status: 'published', views: 156 },
    { id: 21, name: 'Robinson Place Manila', address: 'Pedro Gil St, Manila',            locator: 'Main Store Locator', status: 'published', views: 312 },
    { id: 22, name: 'Splash Salon Cebu',     address: 'IT Park, Lahug, Cebu City',       locator: 'Branch Finder',      status: 'published', views: 88  },
    { id: 23, name: 'S&R Membership',        address: 'Mindanao Ave, Quezon City',       locator: 'Main Store Locator', status: 'published', views: 421 },
    { id: 24, name: 'Snack Shack BGC',       address: '26th St, BGC, Taguig City',       locator: 'Pop-up Stores',      status: 'draft',     views: 0   },
];