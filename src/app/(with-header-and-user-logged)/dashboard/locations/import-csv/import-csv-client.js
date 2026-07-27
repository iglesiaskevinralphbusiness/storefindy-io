'use client';
import { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { RiArrowRightLine } from "react-icons/ri";
import {
    LuMap, LuPlus, LuRefreshCw, LuPencil, LuFileSpreadsheet, LuDownload,
    LuCloudUpload, LuFileCheck, LuCircleCheck, LuAsterisk, LuCircleDashed,
    LuArrowLeftRight, LuArrowRight, LuArrowLeft, LuTable, LuTriangleAlert,
    LuCircleX, LuCircleAlert, LuCheck, LuList, LuEye,
} from 'react-icons/lu';
import Sidebar from '@/components/Dashboard/Sidebar';
import Button from '@/components/Forms/Button';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { getLocators } from '@/actions/locator';
import { importCSV } from '@/actions/locations';
import { COUNTRIES } from '@/utils/constant/countries';
import styles from '../../Dashboard.module.scss';
import csv from './ImportCsv.module.scss';

const SKIP = '— Skip this column —';

// Country code saved when the CSV country can't be matched to our list.
const DEFAULT_COUNTRY = 'us';

// Lookup keyed by both the full label and the code (both lowercased) -> country code.
// Lets a CSV provide either "Philippines" or "ph" and resolve to "ph".
const COUNTRY_LOOKUP = (() => {
    const map = new Map();
    for (const c of COUNTRIES) {
        map.set(c.label.toLowerCase(), c.code);
        map.set(c.code.toLowerCase(), c.code);
    }
    return map;
})();

// Reverse lookup: country code -> display label (e.g. "ph" -> "Philippines").
const CODE_TO_LABEL = (() => {
    const map = new Map();
    for (const c of COUNTRIES) map.set(c.code, c.label);
    return map;
})();

// Real US cities used to generate the localhost staging CSV. Each entry uses that
// city's City Hall — a real, navigable street address (and ZIP) that sits at the
// city-center lat/lng — so street/postal stay consistent with the coordinates
// (important once these feed the store-locator "Get Directions" button).
const US_CITIES = [
    { city: 'New York', state: 'New York', street: 'City Hall Park', postal: '10007', lat: 40.7128, lng: -74.0060 },
    { city: 'Los Angeles', state: 'California', street: '200 N Spring St', postal: '90012', lat: 34.0522, lng: -118.2437 },
    { city: 'Chicago', state: 'Illinois', street: '121 N LaSalle St', postal: '60602', lat: 41.8781, lng: -87.6298 },
    { city: 'Houston', state: 'Texas', street: '901 Bagby St', postal: '77002', lat: 29.7604, lng: -95.3698 },
    { city: 'Phoenix', state: 'Arizona', street: '200 W Washington St', postal: '85003', lat: 33.4484, lng: -112.0740 },
    { city: 'Philadelphia', state: 'Pennsylvania', street: '1400 John F Kennedy Blvd', postal: '19107', lat: 39.9526, lng: -75.1652 },
    { city: 'San Antonio', state: 'Texas', street: '100 Military Plaza', postal: '78205', lat: 29.4241, lng: -98.4936 },
    { city: 'San Diego', state: 'California', street: '202 C St', postal: '92101', lat: 32.7157, lng: -117.1611 },
    { city: 'Dallas', state: 'Texas', street: '1500 Marilla St', postal: '75201', lat: 32.7767, lng: -96.7970 },
    { city: 'San Jose', state: 'California', street: '200 E Santa Clara St', postal: '95113', lat: 37.3382, lng: -121.8863 },
    { city: 'Austin', state: 'Texas', street: '301 W 2nd St', postal: '78701', lat: 30.2672, lng: -97.7431 },
    { city: 'Jacksonville', state: 'Florida', street: '117 W Duval St', postal: '32202', lat: 30.3322, lng: -81.6557 },
    { city: 'Fort Worth', state: 'Texas', street: '200 Texas St', postal: '76102', lat: 32.7555, lng: -97.3308 },
    { city: 'Columbus', state: 'Ohio', street: '90 W Broad St', postal: '43215', lat: 39.9612, lng: -82.9988 },
    { city: 'Charlotte', state: 'North Carolina', street: '600 E 4th St', postal: '28202', lat: 35.2271, lng: -80.8431 },
    { city: 'San Francisco', state: 'California', street: '1 Dr Carlton B Goodlett Pl', postal: '94102', lat: 37.7749, lng: -122.4194 },
    { city: 'Indianapolis', state: 'Indiana', street: '200 E Washington St', postal: '46204', lat: 39.7684, lng: -86.1581 },
    { city: 'Seattle', state: 'Washington', street: '600 4th Ave', postal: '98104', lat: 47.6062, lng: -122.3321 },
    { city: 'Denver', state: 'Colorado', street: '1437 Bannock St', postal: '80202', lat: 39.7392, lng: -104.9903 },
    { city: 'Washington', state: 'District of Columbia', street: '1350 Pennsylvania Ave NW', postal: '20004', lat: 38.9072, lng: -77.0369 },
    { city: 'Boston', state: 'Massachusetts', street: '1 City Hall Square', postal: '02201', lat: 42.3601, lng: -71.0589 },
    { city: 'El Paso', state: 'Texas', street: '300 N Campbell St', postal: '79901', lat: 31.7619, lng: -106.4850 },
    { city: 'Nashville', state: 'Tennessee', street: '1 Public Square', postal: '37201', lat: 36.1627, lng: -86.7816 },
    { city: 'Detroit', state: 'Michigan', street: '2 Woodward Ave', postal: '48226', lat: 42.3314, lng: -83.0458 },
    { city: 'Oklahoma City', state: 'Oklahoma', street: '200 N Walker Ave', postal: '73102', lat: 35.4676, lng: -97.5164 },
    { city: 'Portland', state: 'Oregon', street: '1221 SW 4th Ave', postal: '97204', lat: 45.5152, lng: -122.6784 },
    { city: 'Las Vegas', state: 'Nevada', street: '495 S Main St', postal: '89101', lat: 36.1699, lng: -115.1398 },
    { city: 'Memphis', state: 'Tennessee', street: '125 N Main St', postal: '38103', lat: 35.1495, lng: -90.0490 },
    { city: 'Louisville', state: 'Kentucky', street: '601 W Jefferson St', postal: '40202', lat: 38.2527, lng: -85.7585 },
    { city: 'Baltimore', state: 'Maryland', street: '100 Holliday St', postal: '21202', lat: 39.2904, lng: -76.6122 },
    { city: 'Milwaukee', state: 'Wisconsin', street: '200 E Wells St', postal: '53202', lat: 43.0389, lng: -87.9065 },
    { city: 'Albuquerque', state: 'New Mexico', street: '1 Civic Plaza NW', postal: '87102', lat: 35.0844, lng: -106.6504 },
    { city: 'Tucson', state: 'Arizona', street: '255 W Alameda St', postal: '85701', lat: 32.2226, lng: -110.9747 },
    { city: 'Fresno', state: 'California', street: '2600 Fresno St', postal: '93721', lat: 36.7378, lng: -119.7871 },
    { city: 'Sacramento', state: 'California', street: '915 I St', postal: '95814', lat: 38.5816, lng: -121.4944 },
    { city: 'Kansas City', state: 'Missouri', street: '414 E 12th St', postal: '64106', lat: 39.0997, lng: -94.5786 },
    { city: 'Mesa', state: 'Arizona', street: '20 E Main St', postal: '85201', lat: 33.4152, lng: -111.8315 },
    { city: 'Atlanta', state: 'Georgia', street: '55 Trinity Ave SW', postal: '30303', lat: 33.7490, lng: -84.3880 },
    { city: 'Omaha', state: 'Nebraska', street: '1819 Farnam St', postal: '68183', lat: 41.2565, lng: -95.9345 },
    { city: 'Colorado Springs', state: 'Colorado', street: '107 N Nevada Ave', postal: '80903', lat: 38.8339, lng: -104.8214 },
    { city: 'Raleigh', state: 'North Carolina', street: '222 W Hargett St', postal: '27601', lat: 35.7796, lng: -78.6382 },
    { city: 'Long Beach', state: 'California', street: '411 W Ocean Blvd', postal: '90802', lat: 33.7701, lng: -118.1937 },
    { city: 'Virginia Beach', state: 'Virginia', street: '2401 Courthouse Dr', postal: '23456', lat: 36.8529, lng: -75.9780 },
    { city: 'Miami', state: 'Florida', street: '3500 Pan American Dr', postal: '33133', lat: 25.7617, lng: -80.1918 },
    { city: 'Oakland', state: 'California', street: '1 Frank H Ogawa Plaza', postal: '94612', lat: 37.8044, lng: -122.2712 },
    { city: 'Minneapolis', state: 'Minnesota', street: '350 S 5th St', postal: '55415', lat: 44.9778, lng: -93.2650 },
    { city: 'Tulsa', state: 'Oklahoma', street: '175 E 2nd St', postal: '74103', lat: 36.1540, lng: -95.9928 },
    { city: 'Bakersfield', state: 'California', street: '1600 Truxtun Ave', postal: '93301', lat: 35.3733, lng: -119.0187 },
    { city: 'Wichita', state: 'Kansas', street: '455 N Main St', postal: '67202', lat: 37.6872, lng: -97.3301 },
    { city: 'Arlington', state: 'Texas', street: '101 W Abram St', postal: '76010', lat: 32.7357, lng: -97.1081 },
    { city: 'Aurora', state: 'Colorado', street: '15151 E Alameda Pkwy', postal: '80012', lat: 39.7294, lng: -104.8319 },
    { city: 'Tampa', state: 'Florida', street: '315 E Kennedy Blvd', postal: '33602', lat: 27.9506, lng: -82.4572 },
    { city: 'New Orleans', state: 'Louisiana', street: '1300 Perdido St', postal: '70112', lat: 29.9511, lng: -90.0715 },
    { city: 'Cleveland', state: 'Ohio', street: '601 Lakeside Ave E', postal: '44114', lat: 41.4993, lng: -81.6944 },
    { city: 'Honolulu', state: 'Hawaii', street: '530 S King St', postal: '96813', lat: 21.3069, lng: -157.8583 },
    { city: 'Anaheim', state: 'California', street: '200 S Anaheim Blvd', postal: '92805', lat: 33.8366, lng: -117.9143 },
    { city: 'Lexington', state: 'Kentucky', street: '200 E Main St', postal: '40507', lat: 38.0406, lng: -84.5037 },
    { city: 'Stockton', state: 'California', street: '425 N El Dorado St', postal: '95202', lat: 37.9577, lng: -121.2908 },
    { city: 'Corpus Christi', state: 'Texas', street: '1201 Leopard St', postal: '78401', lat: 27.8006, lng: -97.3964 },
    { city: 'Henderson', state: 'Nevada', street: '240 Water St', postal: '89015', lat: 36.0395, lng: -114.9817 },
    { city: 'Riverside', state: 'California', street: '3900 Main St', postal: '92522', lat: 33.9806, lng: -117.3755 },
    { city: 'Newark', state: 'New Jersey', street: '920 Broad St', postal: '07102', lat: 40.7357, lng: -74.1724 },
    { city: 'Saint Paul', state: 'Minnesota', street: '15 W Kellogg Blvd', postal: '55102', lat: 44.9537, lng: -93.0900 },
    { city: 'Santa Ana', state: 'California', street: '20 Civic Center Plaza', postal: '92701', lat: 33.7455, lng: -117.8677 },
    { city: 'Cincinnati', state: 'Ohio', street: '801 Plum St', postal: '45202', lat: 39.1031, lng: -84.5120 },
    { city: 'Irvine', state: 'California', street: '1 Civic Center Plaza', postal: '92606', lat: 33.6846, lng: -117.8265 },
    { city: 'Orlando', state: 'Florida', street: '400 S Orange Ave', postal: '32801', lat: 28.5383, lng: -81.3792 },
    { city: 'Pittsburgh', state: 'Pennsylvania', street: '414 Grant St', postal: '15219', lat: 40.4406, lng: -79.9959 },
    { city: 'St. Louis', state: 'Missouri', street: '1200 Market St', postal: '63103', lat: 38.6270, lng: -90.1994 },
    { city: 'Greensboro', state: 'North Carolina', street: '300 W Washington St', postal: '27401', lat: 36.0726, lng: -79.7920 },
    { city: 'Jersey City', state: 'New Jersey', street: '280 Grove St', postal: '07302', lat: 40.7178, lng: -74.0431 },
    { city: 'Anchorage', state: 'Alaska', street: '632 W 6th Ave', postal: '99501', lat: 61.2181, lng: -149.9003 },
    { city: 'Lincoln', state: 'Nebraska', street: '555 S 10th St', postal: '68508', lat: 40.8136, lng: -96.7026 },
    { city: 'Plano', state: 'Texas', street: '1520 Avenue K', postal: '75074', lat: 33.0198, lng: -96.6989 },
    { city: 'Durham', state: 'North Carolina', street: '101 City Hall Plaza', postal: '27701', lat: 35.9940, lng: -78.8986 },
    { city: 'Buffalo', state: 'New York', street: '65 Niagara Square', postal: '14202', lat: 42.8864, lng: -78.8784 },
    { city: 'Chandler', state: 'Arizona', street: '175 S Arizona Ave', postal: '85225', lat: 33.3062, lng: -111.8413 },
    { city: 'Chula Vista', state: 'California', street: '276 4th Ave', postal: '91910', lat: 32.6401, lng: -117.0842 },
    { city: 'Toledo', state: 'Ohio', street: '1 Government Center', postal: '43604', lat: 41.6528, lng: -83.5379 },
    { city: 'Madison', state: 'Wisconsin', street: '210 Martin Luther King Jr Blvd', postal: '53703', lat: 43.0731, lng: -89.4012 },
    { city: 'Gilbert', state: 'Arizona', street: '50 E Civic Center Dr', postal: '85296', lat: 33.3528, lng: -111.7890 },
    { city: 'Reno', state: 'Nevada', street: '1 E 1st St', postal: '89501', lat: 39.5296, lng: -119.8138 },
    { city: 'Fort Wayne', state: 'Indiana', street: '200 E Berry St', postal: '46802', lat: 41.0793, lng: -85.1394 },
    { city: 'North Las Vegas', state: 'Nevada', street: '2250 Las Vegas Blvd N', postal: '89030', lat: 36.1989, lng: -115.1175 },
    { city: 'Lubbock', state: 'Texas', street: '1314 Avenue K', postal: '79401', lat: 33.5779, lng: -101.8552 },
    { city: 'St. Petersburg', state: 'Florida', street: '175 5th St N', postal: '33701', lat: 27.7676, lng: -82.6403 },
    { city: 'Laredo', state: 'Texas', street: '1110 Houston St', postal: '78040', lat: 27.5306, lng: -99.4803 },
    { city: 'Irving', state: 'Texas', street: '825 W Irving Blvd', postal: '75060', lat: 32.8140, lng: -96.9489 },
    { city: 'Chesapeake', state: 'Virginia', street: '306 Cedar Rd', postal: '23322', lat: 36.7682, lng: -76.2875 },
    { city: 'Glendale', state: 'Arizona', street: '5850 W Glendale Ave', postal: '85301', lat: 33.5387, lng: -112.1860 },
    { city: 'Winston-Salem', state: 'North Carolina', street: '101 N Main St', postal: '27101', lat: 36.0999, lng: -80.2442 },
    { city: 'Scottsdale', state: 'Arizona', street: '3939 N Drinkwater Blvd', postal: '85251', lat: 33.4942, lng: -111.9261 },
    { city: 'Garland', state: 'Texas', street: '200 N 5th St', postal: '75040', lat: 32.9126, lng: -96.6389 },
    { city: 'Boise', state: 'Idaho', street: '150 N Capitol Blvd', postal: '83702', lat: 43.6150, lng: -116.2023 },
    { city: 'Norfolk', state: 'Virginia', street: '810 Union St', postal: '23510', lat: 36.8508, lng: -76.2859 },
    { city: 'Spokane', state: 'Washington', street: '808 W Spokane Falls Blvd', postal: '99201', lat: 47.6588, lng: -117.4260 },
    { city: 'Fremont', state: 'California', street: '3300 Capitol Ave', postal: '94538', lat: 37.5485, lng: -121.9886 },
    { city: 'Richmond', state: 'Virginia', street: '900 E Broad St', postal: '23219', lat: 37.5407, lng: -77.4360 },
    { city: 'Santa Clarita', state: 'California', street: '23920 Valencia Blvd', postal: '91355', lat: 34.3917, lng: -118.5426 },
    { city: 'San Bernardino', state: 'California', street: '290 North D St', postal: '92401', lat: 34.1083, lng: -117.2898 },
    { city: 'Baton Rouge', state: 'Louisiana', street: '222 St Louis St', postal: '70802', lat: 30.4515, lng: -91.1871 },
    { city: 'Hialeah', state: 'Florida', street: '501 Palm Ave', postal: '33010', lat: 25.8576, lng: -80.2781 },
    { city: 'Tacoma', state: 'Washington', street: '747 Market St', postal: '98402', lat: 47.2529, lng: -122.4443 },
    { city: 'Modesto', state: 'California', street: '1010 10th St', postal: '95354', lat: 37.6391, lng: -120.9969 },
    { city: 'Port St. Lucie', state: 'Florida', street: '121 SW Port St Lucie Blvd', postal: '34984', lat: 27.2730, lng: -80.3582 },
    { city: 'Huntsville', state: 'Alabama', street: '308 Fountain Circle SW', postal: '35801', lat: 34.7304, lng: -86.5861 },
    { city: 'Des Moines', state: 'Iowa', street: '400 Robert D Ray Dr', postal: '50309', lat: 41.5868, lng: -93.6250 },
    { city: 'Moreno Valley', state: 'California', street: '14177 Frederick St', postal: '92552', lat: 33.9425, lng: -117.2297 },
    { city: 'Fontana', state: 'California', street: '8353 Sierra Ave', postal: '92335', lat: 34.0922, lng: -117.4350 },
    { city: 'Frisco', state: 'Texas', street: '6101 Frisco Square Blvd', postal: '75034', lat: 33.1507, lng: -96.8236 },
    { city: 'Rochester', state: 'New York', street: '30 Church St', postal: '14614', lat: 43.1566, lng: -77.6088 },
    { city: 'Yonkers', state: 'New York', street: '40 South Broadway', postal: '10701', lat: 40.9312, lng: -73.8987 },
    { city: 'Fayetteville', state: 'North Carolina', street: '433 Hay St', postal: '28301', lat: 35.0527, lng: -78.8784 },
    { city: 'Worcester', state: 'Massachusetts', street: '455 Main St', postal: '01608', lat: 42.2626, lng: -71.8023 },
    { city: 'Columbus', state: 'Georgia', street: '100 10th St', postal: '31901', lat: 32.4610, lng: -84.9877 },
    { city: 'Cape Coral', state: 'Florida', street: '1015 Cultural Park Blvd', postal: '33990', lat: 26.5629, lng: -81.9495 },
    { city: 'McKinney', state: 'Texas', street: '401 E Virginia St', postal: '75069', lat: 33.1972, lng: -96.6398 },
    { city: 'Salt Lake City', state: 'Utah', street: '451 S State St', postal: '84111', lat: 40.7608, lng: -111.8910 },
    { city: 'Little Rock', state: 'Arkansas', street: '500 W Markham St', postal: '72201', lat: 34.7465, lng: -92.2896 },
    { city: 'Amarillo', state: 'Texas', street: '601 S Buchanan St', postal: '79101', lat: 35.2220, lng: -101.8313 },
    { city: 'Augusta', state: 'Georgia', street: '535 Telfair St', postal: '30901', lat: 33.4735, lng: -82.0105 },
    { city: 'Grand Rapids', state: 'Michigan', street: '300 Monroe Ave NW', postal: '49503', lat: 42.9634, lng: -85.6681 },
    { city: 'Mobile', state: 'Alabama', street: '205 Government St', postal: '36602', lat: 30.6954, lng: -88.0399 },
    { city: 'Knoxville', state: 'Tennessee', street: '400 Main St', postal: '37902', lat: 35.9606, lng: -83.9207 },
    { city: 'Grand Prairie', state: 'Texas', street: '317 College St', postal: '75050', lat: 32.7459, lng: -96.9978 },
    { city: 'Overland Park', state: 'Kansas', street: '8500 Santa Fe Dr', postal: '66212', lat: 38.9822, lng: -94.6708 },
    { city: 'Brownsville', state: 'Texas', street: '1001 E Elizabeth St', postal: '78520', lat: 25.9017, lng: -97.4975 },
    { city: 'Newport News', state: 'Virginia', street: '2400 Washington Ave', postal: '23607', lat: 37.0871, lng: -76.4730 },
    { city: 'Santa Rosa', state: 'California', street: '100 Santa Rosa Ave', postal: '95404', lat: 38.4404, lng: -122.7141 },
    { city: 'Providence', state: 'Rhode Island', street: '25 Dorrance St', postal: '02903', lat: 41.8240, lng: -71.4128 },
    { city: 'Fort Lauderdale', state: 'Florida', street: '100 N Andrews Ave', postal: '33301', lat: 26.1224, lng: -80.1373 },
    { city: 'Chattanooga', state: 'Tennessee', street: '101 E 11th St', postal: '37402', lat: 35.0456, lng: -85.3097 },
    { city: 'Tempe', state: 'Arizona', street: '31 E 5th St', postal: '85281', lat: 33.4255, lng: -111.9400 },
    { city: 'Oceanside', state: 'California', street: '300 N Coast Hwy', postal: '92054', lat: 33.1959, lng: -117.3795 },
    { city: 'Garden Grove', state: 'California', street: '11222 Acacia Pkwy', postal: '92840', lat: 33.7739, lng: -117.9414 },
    { city: 'Rancho Cucamonga', state: 'California', street: '10500 Civic Center Dr', postal: '91730', lat: 34.1064, lng: -117.5931 },
    { city: 'Ontario', state: 'California', street: '303 East B St', postal: '91764', lat: 34.0633, lng: -117.6509 },
    { city: 'Vancouver', state: 'Washington', street: '415 W 6th St', postal: '98660', lat: 45.6387, lng: -122.6615 },
    { city: 'Sioux Falls', state: 'South Dakota', street: '224 W 9th St', postal: '57104', lat: 43.5446, lng: -96.7311 },
    { city: 'Peoria', state: 'Arizona', street: '8401 W Monroe St', postal: '85345', lat: 33.5806, lng: -112.2374 },
    { city: 'Springfield', state: 'Missouri', street: '840 Boonville Ave', postal: '65802', lat: 37.2090, lng: -93.2923 },
    { city: 'Pembroke Pines', state: 'Florida', street: '601 City Center Way', postal: '33025', lat: 26.0078, lng: -80.2963 },
    { city: 'Elk Grove', state: 'California', street: '8401 Laguna Palms Way', postal: '95758', lat: 38.4088, lng: -121.3716 },
    { city: 'Salem', state: 'Oregon', street: '555 Liberty St SE', postal: '97301', lat: 44.9429, lng: -123.0351 },
    { city: 'Corona', state: 'California', street: '400 S Vicentia Ave', postal: '92882', lat: 33.8753, lng: -117.5664 },
    { city: 'Eugene', state: 'Oregon', street: '500 E 4th Ave', postal: '97401', lat: 44.0521, lng: -123.0868 },
    { city: 'Jackson', state: 'Mississippi', street: '219 S President St', postal: '39201', lat: 32.2988, lng: -90.1848 },
    { city: 'Fort Collins', state: 'Colorado', street: '300 Laporte Ave', postal: '80521', lat: 40.5853, lng: -105.0844 },
    { city: 'Cary', state: 'North Carolina', street: '316 N Academy St', postal: '27513', lat: 35.7915, lng: -78.7811 },
    { city: 'Lancaster', state: 'California', street: '44933 Fern Ave', postal: '93534', lat: 34.6868, lng: -118.1542 },
    { city: 'Hayward', state: 'California', street: '777 B St', postal: '94541', lat: 37.6688, lng: -122.0808 },
    { city: 'Palmdale', state: 'California', street: '38300 Sierra Hwy', postal: '93550', lat: 34.5794, lng: -118.1165 },
    { city: 'Salinas', state: 'California', street: '200 Lincoln Ave', postal: '93901', lat: 36.6777, lng: -121.6555 },
    { city: 'Alexandria', state: 'Virginia', street: '301 King St', postal: '22314', lat: 38.8048, lng: -77.0469 },
    { city: 'Pomona', state: 'California', street: '505 S Garey Ave', postal: '91766', lat: 34.0551, lng: -117.7500 },
    { city: 'Sunnyvale', state: 'California', street: '456 W Olive Ave', postal: '94086', lat: 37.3688, lng: -122.0363 },
    { city: 'Escondido', state: 'California', street: '201 N Broadway', postal: '92025', lat: 33.1192, lng: -117.0864 },
    { city: 'Kansas City', state: 'Kansas', street: '701 N 7th St', postal: '66101', lat: 39.1155, lng: -94.6268 },
    { city: 'Rockford', state: 'Illinois', street: '425 E State St', postal: '61104', lat: 42.2711, lng: -89.0940 },
    { city: 'Joliet', state: 'Illinois', street: '150 W Jefferson St', postal: '60432', lat: 41.5250, lng: -88.0817 },
];

// Rotated place-type suffixes so generated store names stay distinct and read like
// real public locations (malls, plazas, town centers, etc.).
const PLACE_TYPES = ['Downtown', 'Grand Mall', 'City Plaza', 'Town Center', 'Marketplace', 'Galleria'];

// Build a staging CSV (used only on localhost) of US-only locations — one row per city.
// Each row keeps the city's real street/postal aligned to its exact lat/lng so the
// store-locator "Get Directions" button resolves to the correct place.
const STAGING_DATA = (() => {
    const header = 'name,street,city,state,postal,country,lat,lng,phone,email,website';
    const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, '');
    const website = 'https://www.storefindy.com';
    const lines = [header];
    US_CITIES.forEach((c, idx) => {
        const place = PLACE_TYPES[idx % PLACE_TYPES.length];
        const name = `StoreFindy ${c.city} ${place}`;
        // US-formatted phone: +1 (AAA) 555-XXXX
        const area = String(200 + (idx % 700));
        const phone = `+1 (${area}) 555-${String(1000 + idx).slice(-4)}`;
        // idx keeps the local-part unique across duplicate city names (e.g. two "Columbus").
        const email = `storefindy.${slug(c.city)}${idx}@example.com`;
        lines.push(`${name},${c.street},${c.city},${c.state},${c.postal},United States,${c.lat},${c.lng},${phone},${email},${website}`);
    });
    return lines.join('\n');
})();

// Resolve a raw CSV country value to a Storefindy country code.
// Returns { code, matched }; unmatched values fall back to DEFAULT_COUNTRY.
function resolveCountry(raw) {
    const key = (raw ?? '').trim().toLowerCase();
    const code = COUNTRY_LOOKUP.get(key);
    return code ? { code, matched: true } : { code: DEFAULT_COUNTRY, matched: false };
}

// Storefindy fields the CSV maps onto.
const REQUIRED_FIELDS = ['name', 'street', 'city', 'state', 'country', 'lat', 'lng'];
const OPTIONAL_FIELDS = ['postal', 'phone', 'email', 'website'];
const SF_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

const FIELD_LABELS = {
    name: 'Store name', street: 'Street address', city: 'City', state: 'State / Province', country: 'Country',
    lat: 'Latitude (decimal)', lng: 'Longitude (decimal)',
    postal: 'Postal / ZIP code', phone: 'Phone number', email: 'Email address', website: 'Website URL',
};

// Header synonyms used to auto-match a CSV column to a Storefindy field.
const SYNONYMS = {
    name: ['name', 'store_name', 'store', 'location', 'location_name', 'title'],
    street: ['street', 'address', 'street_address', 'address1', 'address_1', 'address_line_1', 'addr'],
    city: ['city', 'town'],
    state: ['state', 'province', 'region'],
    country: ['country', 'nation'],
    lat: ['lat', 'latitude'],
    lng: ['lng', 'lon', 'long', 'longitude'],
    postal: ['postal', 'postal_code', 'postalcode', 'zip', 'zipcode', 'zip_code', 'postcode', 'post_code'],
    phone: ['phone', 'phone_no', 'phone_number', 'tel', 'telephone', 'mobile'],
    email: ['email', 'email_addr', 'email_address', 'mail'],
    website: ['website', 'web', 'url', 'site', 'homepage'],
};

const STEP_HINTS = [
    'Select your locator and import mode',
    'Upload your CSV file',
    'Map your CSV columns to Storefindy fields',
    'Review the data then click Import',
];

const STEPS = [
    { label: 'Select Locator', sub: 'Choose target' },
    { label: 'Upload CSV', sub: 'Upload your file' },
    { label: 'Map Fields', sub: 'Match columns' },
    { label: 'Preview & Import', sub: 'Review then import' },
];

const IMPORT_MODES = [
    { id: 'append', title: 'Append', icon: <LuPlus />, desc: 'Add new locations to existing ones. Nothing gets deleted.' },
    { id: 'replace', title: 'Replace All', icon: <LuRefreshCw />, desc: 'Delete all existing locations and replace with CSV data.' },
    { id: 'update', title: 'Update Existing', icon: <LuPencil />, desc: 'Update matching locations by name. Add new ones.' },
];

// Minimal CSV parser supporting quoted fields and escaped quotes.
function parseCSV(text) {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') { field += '"'; i++; }
                else inQuotes = false;
            } else field += c;
        } else if (c === '"') {
            inQuotes = true;
        } else if (c === ',') {
            row.push(field); field = '';
        } else if (c === '\n') {
            row.push(field); rows.push(row); row = []; field = '';
        } else if (c !== '\r') {
            field += c;
        }
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    // Drop fully empty trailing rows.
    return rows.filter(r => r.some(v => v.trim() !== ''));
}

function autoMatch(header) {
    const norm = header.trim().toLowerCase().replace(/[\s-]+/g, '_');
    for (const field of SF_FIELDS) {
        if (SYNONYMS[field].includes(norm)) return field;
    }
    return '';
}

// Renders the 4-step progress header. `step` of 5 marks every step complete (success view).
function Stepper({ step }) {
    return (
        <div className={csv.steps}>
            {STEPS.map((s, idx) => {
                const num = idx + 1;
                const state = num < step ? 'done' : num === step ? 'active' : 'pending';
                return (
                    <Fragment key={s.label}>
                        <div className={csv.step}>
                            <div className={`${csv.stepNum} ${csv[state]}`}>
                                {state === 'done' ? <LuCheck /> : num}
                            </div>
                            <div className={csv.stepInfo}>
                                <div className={csv.stepLabel}>{s.label}</div>
                                <div className={csv.stepSub}>{s.sub}</div>
                            </div>
                        </div>
                        {num < 4 && <div className={`${csv.stepLine} ${num < step ? csv.done : ''}`} />}
                    </Fragment>
                );
            })}
        </div>
    );
}

// The 4-step CSV import wizard.
function ImportWizard({ locators }) {
    const router = useRouter();
    const fileInputRef = useRef(null);

    const [step, setStep] = useState(1);
    const [locatorId, setLocatorId] = useState(locators[0]?._id ?? '');
    const [mode, setMode] = useState('append');

    const [fileName, setFileName] = useState('');
    const [fileSize, setFileSize] = useState(0);
    const [headers, setHeaders] = useState([]);
    const [rows, setRows] = useState([]); // array of string[]
    const [mapping, setMapping] = useState({}); // header -> sf field
    const [dragging, setDragging] = useState(false);
    const [imported, setImported] = useState(false);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState(null); // server response on success
    const [tooltip, setTooltip] = useState(null); // { top, left, lines } for the status hover tooltip

    // Show the status tooltip anchored below the hovered badge (fixed-positioned so it isn't clipped).
    function showTooltip(e, lines) {
        const r = e.currentTarget.getBoundingClientRect();
        setTooltip({ top: r.bottom + 6, left: r.left, lines });
    }

    const selectedLocator = locators.find(l => l._id === locatorId);
    const selectedLocatorName = selectedLocator?.name ?? '';

    // Per-row validation: error if a required field is missing or lat/lng isn't numeric;
    // warning if an optional field is blank.
    const evaluated = useMemo(() => rows.map(row => {
        // Map the parsed row to a { field: value } object using the current mapping.
        const obj = {};
        headers.forEach((h, i) => {
            const field = mapping[h];
            if (field) obj[field] = (row[i] ?? '').trim();
        });

        // Resolve the country to a code. Keep the original label for the warning,
        // and store the resolved code (defaulting to "us" when no match is found).
        const countryRaw = obj.country || '';
        let countryUnmatched = false;
        if (countryRaw) {
            const { code, matched } = resolveCountry(countryRaw);
            obj.country = code;
            countryUnmatched = !matched;
        }

        // Collect specific issues so the status badge can explain itself on hover.
        const issues = [];
        const missingRequired = REQUIRED_FIELDS.filter(f => !obj[f]);
        if (missingRequired.length) {
            issues.push(`Missing required field(s): ${missingRequired.map(f => FIELD_LABELS[f]).join(', ')}`);
        }
        if (obj.lat && isNaN(Number(obj.lat))) issues.push('Latitude is not a valid number');
        if (obj.lng && isNaN(Number(obj.lng))) issues.push('Longitude is not a valid number');
        if (countryUnmatched) {
            issues.push(`Country "${countryRaw}" didn't match our list — defaulting to ${CODE_TO_LABEL.get(DEFAULT_COUNTRY)}`);
        }
        const missingOptional = OPTIONAL_FIELDS.filter(f => !obj[f]);
        if (missingOptional.length) {
            issues.push(`Missing optional field(s): ${missingOptional.map(f => FIELD_LABELS[f]).join(', ')}`);
        }

        let status = 'ok';
        if (missingRequired.length || (obj.lat && isNaN(Number(obj.lat))) || (obj.lng && isNaN(Number(obj.lng)))) {
            status = 'err';
        } else if (countryUnmatched || missingOptional.length) {
            status = 'warn';
        }
        return { obj, status, countryRaw, countryUnmatched, issues };
    }), [rows, mapping, headers]);

    const counts = useMemo(() => ({
        ok: evaluated.filter(r => r.status === 'ok').length,
        warn: evaluated.filter(r => r.status === 'warn').length,
        err: evaluated.filter(r => r.status === 'err').length,
        // Rows whose country couldn't be matched and fell back to the default.
        countryUnmatched: evaluated.filter(r => r.status !== 'err' && r.countryUnmatched).length,
    }), [evaluated]);

    const validRows = counts.ok + counts.warn;

    // Required fields all mapped? (needed to leave the mapping step)
    const allRequiredMapped = REQUIRED_FIELDS.every(f => Object.values(mapping).includes(f));

    function handleFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const parsed = parseCSV(String(e.target.result));
            if (!parsed.length) return;
            const head = parsed[0].map(h => h.trim());
            const dataRows = parsed.slice(1);
            const auto = {};
            head.forEach(h => { auto[h] = autoMatch(h); });
            setHeaders(head);
            setRows(dataRows);
            setMapping(auto);
            setFileName(file.name);
            setFileSize(file.size);
        };
        reader.readAsText(file);
    }

    function onDrop(e) {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files?.[0]);
    }

    function downloadTemplate() {
        const data =
            'name,street,city,state,postal,country,lat,lng,phone,email,website\n' +
            'SM Mall of Asia,Seaside Blvd,Pasay City,Metro Manila,1300,Philippines,14.5353,120.9822,+63 2 8556 0100,sm@sm.ph,https://sm.ph\n' +
            'Robinsons Galleria,EDSA cor Ortigas Ave,Quezon City,Metro Manila,1100,Philippines,14.5856,121.0567,+63 2 8633 9888,,https://robinsons.ph';
        const stagingData = STAGING_DATA;

        const a = document.createElement('a');
        a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(process.env.NEXT_PUBLIC_ROOT_URL === 'http://localhost:3000' ? stagingData : data);
        a.download = 'storefindy_template.csv';
        a.click();
    }

    function next() {
        if (step === 2 && !fileName) return;
        if (step === 3 && !allRequiredMapped) return;
        setStep(s => Math.min(4, s + 1));
    }
    function back() {
        setStep(s => Math.max(1, s - 1));
    }

    async function doImport() {
        if (importing) return;
        setImporting(true);
        // Send only the rows that passed client-side validation; the server re-validates anyway.
        const records = evaluated.filter(e => e.status !== 'err').map(e => e.obj);
        const res = await importCSV(locatorId, mode, records);
        setImporting(false);
        if (res?.status === 'success') {
            setResult(res);
            setImported(true);
        } else {
            toast.error(res?.message || 'Import failed. Please try again.');
        }
    }

    function reset() {
        setStep(1);
        setFileName('');
        setHeaders([]);
        setRows([]);
        setMapping({});
        setImported(false);
        setResult(null);
    }

    const fmtSize = (b) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

    /* ---------- SUCCESS ---------- */
    if (imported) {
        return (
            <div className={csv.wizard}>
                <Stepper step={5} />
                <div className={csv.successBox}>
                    <div className={csv.successIcon}><LuCircleCheck /></div>
                    <div className={csv.successTitle}>Import Successful!</div>
                    <div className={csv.successSub}>Locations have been saved to <strong>{selectedLocatorName}</strong></div>
                    <div className={csv.successStats}>
                        <div>
                            <div className={csv.successStatVal}>{result?.imported ?? 0}</div>
                            <div className={csv.successStatLabel}>{mode === 'replace' ? 'Imported (replaced)' : 'Imported (new)'}</div>
                        </div>
                        {mode === 'update' && (
                            <div>
                                <div className={csv.successStatVal}>{result?.updated ?? 0}</div>
                                <div className={csv.successStatLabel}>Updated</div>
                            </div>
                        )}
                        <div>
                            <div className={csv.successStatVal}>{result?.skipped ?? 0}</div>
                            <div className={csv.successStatLabel}>Skipped (error)</div>
                        </div>
                    </div>
                    <div className={csv.successActions}>
                        <Button value="View All Locations" icon={<LuList />} primary onClick={() => router.push('/dashboard/locations')} />
                        <Button value="Import Another CSV" icon={<LuCloudUpload />} onClick={reset} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={csv.wizard}>
            <Stepper step={step} />

            {/* Status hover tooltip (fixed so it escapes the scrollable preview table). */}
            {tooltip && (
                <div className={csv.statusTooltip} style={{ top: tooltip.top, left: tooltip.left }}>
                    {tooltip.lines.map((line, i) => (
                        <div key={i} className={csv.statusTooltipLine}>• {line}</div>
                    ))}
                </div>
            )}

            {/* STEP 1 — Select locator + mode */}
            {step === 1 && (
                <div className={csv.card}>
                    <div className={csv.cardTitle}>
                        <LuMap /> Select Target Locator
                        <span className={csv.badgeInfo}>1 CSV per locator</span>
                    </div>
                    <p className={csv.cardDesc}>
                        Each CSV is imported into <strong>one specific locator</strong>. All locations from the file will be
                        assigned to the locator you select. If you have multiple locators, import a separate CSV for each.
                    </p>
                    <div className={csv.locatorOptions}>
                        {locators.map(loc => (
                            <div
                                key={loc._id}
                                className={`${csv.locatorOpt} ${locatorId === loc._id ? csv.selected : ''}`}
                                onClick={() => setLocatorId(loc._id)}
                            >
                                <div className={csv.locatorOptIcon}><LuMap /></div>
                                <div className={csv.locatorOptName}>{loc.name}</div>
                                <div className={csv.locatorOptMeta}>{loc.default_country?.toUpperCase() || 'Locator'}</div>
                                <div className={csv.locatorOptCheck}>{locatorId === loc._id && <LuCheck />}</div>
                            </div>
                        ))}
                    </div>
                    <div className={csv.importMode}>
                        {IMPORT_MODES.map(m => (
                            <div
                                key={m.id}
                                className={`${csv.modeOpt} ${mode === m.id ? csv.selected : ''}`}
                                onClick={() => setMode(m.id)}
                            >
                                <div className={csv.modeOptTitle}>{m.icon} {m.title}</div>
                                <div className={csv.modeOptDesc}>{m.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* STEP 2 — Upload */}
            {step === 2 && (
                <div className={csv.card}>
                    <div className={csv.cardTitle}><LuFileSpreadsheet /> Upload Your CSV File</div>
                    <div className={csv.templateBox}>
                        <div className={csv.templateIcon}><LuDownload /></div>
                        <div className={csv.templateInfo}>
                            <div className={csv.templateName}>Download CSV Template</div>
                            <div className={csv.templateDesc}>Pre-formatted with all required and optional columns — open in Excel or Google Sheets.</div>
                        </div>
                        <button type="button" className={csv.templateBtn} onClick={downloadTemplate}>
                            <LuDownload /> Download Template
                        </button>
                    </div>
                    <div
                        className={`${csv.uploadZone} ${dragging ? csv.drag : ''} ${fileName ? csv.hasFile : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={onDrop}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={(e) => handleFile(e.target.files?.[0])}
                        />
                        {fileName ? <LuFileCheck className={csv.uploadIcon} /> : <LuCloudUpload className={csv.uploadIcon} />}
                        <div className={csv.uploadTitle}>{fileName || 'Drag & drop your CSV here'}</div>
                        <div className={csv.uploadSub}>
                            {fileName
                                ? `${rows.length} rows detected · ${headers.length} columns found · ${fmtSize(fileSize)}`
                                : 'or click to browse · Max 5MB · .csv files only'}
                        </div>
                        {fileName && (
                            <div>
                                <span className={csv.uploadBadge}><LuCircleCheck /> File ready to process</span>
                            </div>
                        )}
                    </div>
                    <div className={csv.columnsGrid}>
                        <div className={`${csv.colBox} ${csv.required}`}>
                            <div className={csv.colBoxTitle}><LuAsterisk /> Required Columns</div>
                            {REQUIRED_FIELDS.map(f => (
                                <div key={f} className={csv.colItem}>
                                    <span className={csv.colName}>{f}</span>
                                    <span className={csv.colDesc}>{FIELD_LABELS[f]}</span>
                                </div>
                            ))}
                        </div>
                        <div className={`${csv.colBox} ${csv.optional}`}>
                            <div className={csv.colBoxTitle}><LuCircleDashed /> Optional Columns</div>
                            {OPTIONAL_FIELDS.map(f => (
                                <div key={f} className={csv.colItem}>
                                    <span className={csv.colName}>{f}</span>
                                    <span className={csv.colDesc}>{FIELD_LABELS[f]}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 3 — Map fields */}
            {step === 3 && (
                <div className={csv.card}>
                    <div className={csv.cardTitle}>
                        <LuArrowLeftRight /> Map CSV Columns to Storefindy Fields
                        <span className={csv.badgeInfo}>Auto-matched where possible</span>
                    </div>
                    <p className={csv.cardDesc}>
                        We detected your CSV columns below. Match each to the correct Storefindy field. All{' '}
                        <span className={csv.reqHl}>required</span> fields must be mapped before proceeding.
                    </p>
                    <table className={csv.mappingTable}>
                        <thead>
                            <tr>
                                <th>Your CSV Column</th>
                                <th>Sample Data</th>
                                <th style={{ width: 24 }}></th>
                                <th>Storefindy Field</th>
                                <th>Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {headers.map((h, i) => {
                                const field = mapping[h] || '';
                                const isReq = REQUIRED_FIELDS.includes(field);
                                const isOpt = OPTIONAL_FIELDS.includes(field);
                                return (
                                    <tr key={h + i}>
                                        <td><span className={csv.csvColBadge}>{h}</span></td>
                                        <td><span className={csv.mapPreview}>{rows[0]?.[i] || '—'}</span></td>
                                        <td className={csv.mapArrow}><LuArrowRight /></td>
                                        <td>
                                            <select
                                                className={`${csv.mapSelect} ${field ? csv.matched : ''}`}
                                                value={field}
                                                onChange={(e) => setMapping(m => ({ ...m, [h]: e.target.value }))}
                                            >
                                                <option value="">{SKIP}</option>
                                                {SF_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                                            </select>
                                        </td>
                                        <td>
                                            {isReq ? <span className={csv.mapBadgeReq}>Required</span>
                                                : isOpt ? <span className={csv.mapBadgeOpt}>Optional</span>
                                                    : <span className={csv.mapBadgeOpt}>—</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* STEP 4 — Preview */}
            {step === 4 && (
                <div className={csv.card}>
                    <div className={csv.cardTitle}><LuTable /> Preview Import Data</div>
                    <div className={csv.previewHeader}>
                        <div className={csv.previewStats}>
                            <div className={`${csv.previewStat} ${csv.ok}`}><LuCircleCheck /> {counts.ok} ready</div>
                            <div className={`${csv.previewStat} ${csv.warn}`}><LuTriangleAlert /> {counts.warn} warning</div>
                            <div className={`${csv.previewStat} ${csv.err}`}><LuCircleX /> {counts.err} error</div>
                        </div>
                        <span className={csv.previewCount}>
                            Showing first {Math.min(10, rows.length)} rows · {rows.length} total
                        </span>
                    </div>
                    <div className={csv.previewScroll}>
                        <table className={csv.previewTable}>
                            <thead>
                                <tr>
                                    <th>#</th><th>Status</th>
                                    {SF_FIELDS.map(f => <th key={f}>{f}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {evaluated.slice(0, 10).map(({ obj, status, countryRaw, countryUnmatched, issues }, i) => (
                                    <tr key={i} className={status === 'ok' ? csv.rowOk : status === 'warn' ? csv.rowWarn : csv.rowErr}>
                                        <td className={csv.rowIndex}>{i + 1}</td>
                                        <td>
                                            <span
                                                className={`${csv.rowBadge} ${csv[status]}`}
                                                style={issues.length ? { cursor: 'help' } : undefined}
                                                onMouseEnter={issues.length ? (e) => showTooltip(e, issues) : undefined}
                                                onMouseLeave={issues.length ? () => setTooltip(null) : undefined}
                                            >
                                                {status === 'ok' ? <><LuCircleCheck /> Ready</> : status === 'warn' ? <><LuTriangleAlert /> Warning</> : <><LuCircleX /> Error</>}
                                            </span>
                                        </td>
                                        {SF_FIELDS.map(f => {
                                            const v = obj[f];
                                            const invalid = (f === 'lat' || f === 'lng') && v && isNaN(Number(v));
                                            const countryWarn = f === 'country' && countryUnmatched;
                                            const cls = invalid ? csv.cellInvalid
                                                : countryWarn ? csv.cellInvalid
                                                    : !v ? csv.cellEmpty
                                                        : f === 'website' ? csv.cellLink
                                                            : f === 'name' ? csv.rowName
                                                                : csv.cellMuted;
                                            // Country is stored as a code but shown as its label in the preview.
                                            // Unmatched countries show the original value struck out, then the default.
                                            if (f === 'country') {
                                                return (
                                                    <td
                                                        key={f}
                                                        className={cls}
                                                        title={countryWarn ? `"${countryRaw}" didn't match any country in our list — saving as "${CODE_TO_LABEL.get(DEFAULT_COUNTRY)}"` : undefined}
                                                    >
                                                        {!v ? '—' : countryWarn ? (
                                                            <>
                                                                <LuTriangleAlert />{' '}
                                                                <s>{countryRaw}</s>{' '}
                                                                <span className={csv.rowName}>{CODE_TO_LABEL.get(v) || v}</span>
                                                            </>
                                                        ) : (CODE_TO_LABEL.get(v) || v)}
                                                    </td>
                                                );
                                            }
                                            return <td key={f} className={cls}>{v || '—'}</td>;
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {(counts.err > 0 || counts.warn > 0) && (
                        <div className={csv.notesBox}>
                            <div className={csv.notesBoxTitle}><LuCircleAlert /> Import Notes</div>
                            <p>
                                {counts.err > 0 && <>• <strong>{counts.err}</strong> row(s) have missing required fields or an invalid latitude/longitude — they will be <strong>skipped</strong>.<br /></>}
                                {counts.countryUnmatched > 0 && <>• <strong>{counts.countryUnmatched}</strong> row(s) have a country that doesn&apos;t match our country list — they will default to <strong>{CODE_TO_LABEL.get(DEFAULT_COUNTRY)}</strong>. Use the full country name (e.g. <em>Philippines</em>) or its 2-letter code (e.g. <em>ph</em>).<br /></>}
                                {counts.warn > 0 && <>• <strong>{counts.warn}</strong> row(s) are missing optional fields or have an unmatched country — they will still be <strong>imported</strong>.<br /></>}
                                • <strong>{validRows} valid row(s)</strong> will be added to <strong>{selectedLocatorName}</strong>.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* BOTTOM BAR */}
            <div className={csv.bottomBar}>
                <div className={csv.bottomHint}>Step {step} of 4 — {STEP_HINTS[step - 1]}</div>
                <div className={csv.bottomRight}>
                    {step > 1 && <Button value="Back" icon={<LuArrowLeft />} onClick={back} />}
                    {step < 4 ? (
                        <Button
                            value={step === 3 ? 'Preview' : 'Next'}
                            icon={step === 3 ? <LuEye /> : <LuArrowRight />}
                            iconPosition="right"
                            primary
                            disabled={(step === 2 && !fileName) || (step === 3 && !allRequiredMapped)}
                            onClick={next}
                        />
                    ) : (
                        <Button
                            value={`Import ${validRows} Location${validRows === 1 ? '' : 's'}`}
                            icon={<LuCloudUpload />}
                            primary
                            disabled={validRows === 0}
                            pending={importing}
                            onClick={doImport}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ImportCSVPageClient() {

    const [locators, setLocators] = useState(null);

    useEffect(() => {
        getLocators().then(setLocators);
    }, []);

    return (
        <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Import CSV</h1>
                    <p>Dashboard <RiArrowRightLine /> Locations <RiArrowRightLine /> All Locations <RiArrowRightLine /> Import CSV</p>
                </div>
                <div className={styles.body}>
                    {
                        locators === null ? null
                            : locators.length === 0 ? (
                                <LimitReached
                                    msg="You don't have any locators yet. Please create a locator first."
                                    href="/dashboard/locators/create"
                                    buttonText={<><LuPlus /> Create Locator</>}
                                />
                            ) : <ImportWizard locators={locators} />
                    }
                </div>
            </div>
        </div>
    );
}
