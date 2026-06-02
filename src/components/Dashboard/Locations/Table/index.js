'use client';
import { useState } from 'react';
import styles from './LocationsTable.module.scss';
import Button from '@/components/Forms/Button';
import { LuPencil, LuMap, LuEye, LuEyeOff, LuTrash2, LuArrowUpDown, LuMapPinOff } from 'react-icons/lu';

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

export default function LocationsTable() {
    const [locations] = useState(DUMMY_LOCATIONS);
    const [selected, setSelected] = useState(new Set());

    // Sort headers don't sort — they just log the clicked column for now.
    const handleSort = (column) => {
        console.log('sort column clicked:', column);
    };

    const toggleRow = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = (e) => {
        setSelected(e.target.checked ? new Set(locations.map(l => l.id)) : new Set());
    };

    const allSelected = locations.length > 0 && selected.size === locations.length;

    // The full data objects for the currently checked rows.
    const selectedLocations = locations.filter(l => selected.has(l.id));

    const handleBulkPublish = () => {
        console.log('publish:', selectedLocations);
    };
    const handleBulkUnpublish = () => {
        console.log('unpublish:', selectedLocations);
    };
    const handleBulkDelete = () => {
        console.log('delete:', selectedLocations);
    };

    return (
        <>
            {selected.size > 0 && (
                <div className={styles.bulkBar}>
                    <span className={styles.bulkCount}>{selected.size} selected</span>
                    <Button value="Publish" icon={<LuEye />} onClick={handleBulkPublish} />
                    <Button value="Unpublish" icon={<LuEyeOff />} onClick={handleBulkUnpublish} />
                    <Button value="Delete" icon={<LuTrash2 />} onClick={handleBulkDelete} />
                </div>
            )}
            <div className={styles.tableWrap}>
                <div className={styles.tableScroll}>
                    <table>
                    <thead>
                        <tr>
                            <th style={{ width: '36px', cursor: 'default' }}>
                                <input type="checkbox" className={styles.cb} checked={allSelected} onChange={toggleAll} />
                            </th>
                            <th onClick={() => handleSort('name')}>Store Name <LuArrowUpDown /></th>
                            <th onClick={() => handleSort('address')}>Address <LuArrowUpDown /></th>
                            <th onClick={() => handleSort('locator')}>Locator <LuArrowUpDown /></th>
                            <th onClick={() => handleSort('status')}>Status <LuArrowUpDown /></th>
                            <th onClick={() => handleSort('views')}>Views <LuArrowUpDown /></th>
                            <th style={{ width: '90px', cursor: 'default' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {locations.length === 0 ? (
                            <tr>
                                <td colSpan={7}>
                                    <div className={styles.emptyState}>
                                        <LuMapPinOff />
                                        <p>No locations found.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : locations.map(l => (
                            <tr key={l.id} className={selected.has(l.id) ? styles.selected : ''}>
                                <td>
                                    <input
                                        type="checkbox"
                                        className={styles.cb}
                                        checked={selected.has(l.id)}
                                        onChange={() => toggleRow(l.id)}
                                    />
                                </td>
                                <td><span className={styles.storeName}>{l.name}</span></td>
                                <td className={styles.address}>{l.address}</td>
                                <td><span className={styles.locatorPill}>{l.locator}</span></td>
                                <td>
                                    <span className={`${styles.badge} ${l.status === 'published' ? styles.published : styles.draft}`}>
                                        <span className={styles.badgeDot}></span>
                                        {l.status === 'published' ? 'Published' : 'Draft'}
                                    </span>
                                </td>
                                <td className={styles.views}>{l.views > 0 ? l.views.toLocaleString() : '—'}</td>
                                <td>
                                    <div className={styles.actions}>
                                        <button
                                            className={`${styles.actBtn} ${styles.edit}`}
                                            title="Edit"
                                            onClick={() => console.log('edit location:', l.id)}
                                        ><LuPencil /></button>
                                        <button
                                            className={styles.actBtn}
                                            title="View on map"
                                            onClick={() => console.log('view on map:', l.id)}
                                        ><LuMap /></button>
                                        <button
                                            className={styles.actBtn}
                                            title={l.status === 'published' ? 'Unpublish' : 'Publish'}
                                            onClick={() => console.log('toggle publish:', l.id)}
                                        >{l.status === 'published' ? <LuEyeOff /> : <LuEye />}</button>
                                        <button
                                            className={`${styles.actBtn} ${styles.danger}`}
                                            title="Delete"
                                            onClick={() => console.log('delete location:', l.id)}
                                        ><LuTrash2 /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            </div>
        </>
    );
}
