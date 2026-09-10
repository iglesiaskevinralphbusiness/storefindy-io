import {
    FaFacebook,
    FaTwitter,
    FaInstagram,
    FaLinkedin,
    FaYoutube,
    FaTiktok,
    FaPinterest,
    FaSnapchat,
    FaReddit,
    FaTelegram,
    FaWhatsapp,
    FaViber,
    FaWeibo,
    FaQq,
    FaLine,
    FaSkype
} from 'react-icons/fa';
import { SOCIAL_MEDIA } from './social-media';

export const LOCALES = [
	{ code: 'en', label: 'English' },
	{ code: 'fr', label: 'Français' },
    { code: 'es', label: 'Español' },
    { code: 'de', label: 'Deutsch' },
    { code: 'it', label: 'Italiano' },
    { code: 'pt', label: 'Português' },
    { code: 'nl', label: 'Nederlands' },
    { code: 'ja', label: '日本語' },
    { code: 'ko', label: '한국어' },
    { code: 'zh-CN', label: '简体中文' },
    { code: 'zh-TW', label: '繁體中文' },
    { code: 'ar', label: 'العربية' },
];

export { COUNTRIES } from './countries';
export { LOCATOR_LANGUAGES, getLocatorLabels, formatLocationsFound } from './locator-languages';

export const TIMEZONES = [
	{ code: 'Pacific/Midway', label: '(GMT-11:00) Midway Island, Samoa' },
	{ code: 'Pacific/Honolulu', label: '(GMT-10:00) Hawaii' },
	{ code: 'America/Anchorage', label: '(GMT-09:00) Alaska' },
	{ code: 'America/Los_Angeles', label: '(GMT-08:00) Pacific Time (US & Canada)' },
	{ code: 'America/Denver', label: '(GMT-07:00) Mountain Time (US & Canada)' },
	{ code: 'America/Chicago', label: '(GMT-06:00) Central Time (US & Canada)' },
	{ code: 'America/New_York', label: '(GMT-05:00) Eastern Time (US & Canada)' },
	{ code: 'America/Halifax', label: '(GMT-04:00) Atlantic Time (Canada)' },
	{ code: 'America/Sao_Paulo', label: '(GMT-03:00) Brasilia, Buenos Aires' },
	{ code: 'Atlantic/Azores', label: '(GMT-01:00) Azores' },
	{ code: 'Etc/UTC', label: '(GMT+00:00) UTC' },
	{ code: 'Europe/London', label: '(GMT+00:00) London, Dublin, Lisbon' },
	{ code: 'Europe/Paris', label: '(GMT+01:00) Paris, Berlin, Madrid, Rome' },
	{ code: 'Europe/Athens', label: '(GMT+02:00) Athens, Cairo, Johannesburg' },
	{ code: 'Europe/Moscow', label: '(GMT+03:00) Moscow, Istanbul, Nairobi' },
	{ code: 'Asia/Dubai', label: '(GMT+04:00) Dubai, Abu Dhabi' },
	{ code: 'Asia/Karachi', label: '(GMT+05:00) Karachi, Tashkent' },
	{ code: 'Asia/Kolkata', label: '(GMT+05:30) Mumbai, New Delhi, Kolkata' },
	{ code: 'Asia/Dhaka', label: '(GMT+06:00) Dhaka, Almaty' },
	{ code: 'Asia/Bangkok', label: '(GMT+07:00) Bangkok, Jakarta, Hanoi' },
	{ code: 'Asia/Shanghai', label: '(GMT+08:00) Beijing, Singapore, Hong Kong' },
	{ code: 'Asia/Manila', label: '(GMT+08:00) Manila, Kuala Lumpur, Perth' },
	{ code: 'Asia/Tokyo', label: '(GMT+09:00) Tokyo, Seoul, Osaka' },
	{ code: 'Australia/Sydney', label: '(GMT+10:00) Sydney, Melbourne, Brisbane' },
	{ code: 'Pacific/Auckland', label: '(GMT+12:00) Auckland, Wellington, Fiji' },
];

export const ZOOM_LEVELS = [
	{ code: '15', label: 'City level (zoom 15)' },
	{ code: '10', label: 'State level (zoom 10)' },
	{ code: '7', label: 'Country level (zoom 7)' },
	{ code: '5', label: 'World level (zoom 5)' },
];

export const SEARCH_RADII = [
	{ code: '10', label: '10 miles' },
	{ code: '25', label: '25 miles' },
	{ code: '50', label: '50 miles' },
	{ code: '100', label: '100 miles' },
    { code: '300', label: '300 miles' },
    { code: '500', label: '500 miles' },
    { code: '1000', label: '1000 miles' },
    { code: '2000', label: '2000 miles' },
];

export const MAXIMUM_RESULTS_SHOWN = [
	{ code: '5', label: '5 results' },
	{ code: '10', label: '10 results' },
	{ code: '25', label: '25 results' },
	{ code: '50', label: '50 results' },
    { code: '100', label: '100 results' },
    { code: '200', label: '200 results' },
    { code: '500', label: '500 results' },
	{ code: '999999', label: 'All results' },
];

// Icon per network code. The list itself — codes, labels and colours — lives in
// ./social-media so server code can read it without importing react-icons.
const SOCIAL_MEDIA_ICONS = {
	facebook: FaFacebook,
	twitter: FaTwitter,
	instagram: FaInstagram,
	linkedin: FaLinkedin,
	youtube: FaYoutube,
	tiktok: FaTiktok,
	pinterest: FaPinterest,
	snapchat: FaSnapchat,
	reddit: FaReddit,
	telegram: FaTelegram,
	whatsapp: FaWhatsapp,
	viber: FaViber,
	weibo: FaWeibo,
	qq: FaQq,
	line: FaLine,
	skype: FaSkype,
};

export const SOCIAL_MEDIA_LINKS = SOCIAL_MEDIA.map(({ code, label, color }) => {
	const Icon = SOCIAL_MEDIA_ICONS[code];
	return { code, label, color, icon: <Icon color={color} /> };
});




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

export const HEAT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];