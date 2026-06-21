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

export const LOCALES = [
	{ code: 'en', label: 'English' },
	{ code: 'fr', label: 'Français' },
];

export { COUNTRIES } from './countries';

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
];

export const MAXIMUM_RESULTS_SHOWN = [
	{ code: '5', label: '5 results' },
	{ code: '10', label: '10 results' },
	{ code: '25', label: '25 results' },
	{ code: '50', label: '50 results' },
	{ code: '5000', label: 'All results' },
];

export const SOCIAL_MEDIA_LINKS = [
	{ code: 'facebook', label: 'Facebook', color: '#1877F2', icon: <FaFacebook color="#1877F2" /> },
	{ code: 'twitter', label: 'Twitter', color: '#1DA1F2', icon: <FaTwitter color="#1DA1F2" /> },
	{ code: 'instagram', label: 'Instagram', color: '#E4405F', icon: <FaInstagram color="#E4405F" /> },
    { code: 'linkedin', label: 'LinkedIn', color: '#0A66C2', icon: <FaLinkedin color="#0A66C2" /> },
    { code: 'youtube', label: 'YouTube', color: '#FF0000', icon: <FaYoutube color="#FF0000" /> },
    { code: 'tiktok', label: 'TikTok', color: '#010101', icon: <FaTiktok color="#010101" /> },
    { code: 'pinterest', label: 'Pinterest', color: '#BD081C', icon: <FaPinterest color="#BD081C" /> },
    { code: 'snapchat', label: 'Snapchat', color: '#FFFC00', icon: <FaSnapchat color="#FFFC00" /> },
    { code: 'reddit', label: 'Reddit', color: '#FF4500', icon: <FaReddit color="#FF4500" /> },
    { code: 'telegram', label: 'Telegram', color: '#26A5E4', icon: <FaTelegram color="#26A5E4" /> },
    { code: 'whatsapp', label: 'WhatsApp', color: '#25D366', icon: <FaWhatsapp color="#25D366" /> },
    { code: 'viber', label: 'Viber', color: '#7360F2', icon: <FaViber color="#7360F2" /> },
    { code: 'weibo', label: 'Weibo', color: '#E6162D', icon: <FaWeibo color="#E6162D" /> },
    { code: 'qq', label: 'QQ', color: '#12B7F5', icon: <FaQq color="#12B7F5" /> },
    { code: 'line', label: 'Line', color: '#06C755', icon: <FaLine color="#06C755" /> },
    { code: 'skype', label: 'Skype', color: '#00AFF0', icon: <FaSkype color="#00AFF0" /> },
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