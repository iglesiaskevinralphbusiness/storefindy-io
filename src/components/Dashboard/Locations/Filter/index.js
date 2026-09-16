'use client';
import styles from './LocationFilter.module.scss';
import Input from '@/components/Forms/Input';
import SelectMulti from '@/components/Forms/SelectMulti';
import { useEffect, useState } from 'react';
import { LuSearch, LuX, LuPlus } from "react-icons/lu";
import Button from '@/components/Forms/Button';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { FILTER_PARAM } from '@/lib/ai/location-filter';
import { TZ_PARAM } from '@/lib/ai/schedule-filter';

const Filter = ({ locators}) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState('');
    const [locatorIds, setLocatorIds] = useState([]);

    useEffect(() => {
        setSearch(searchParams.get('search') || '');
        const locatorsParam = searchParams.get('locators');
        setLocatorIds(locatorsParam ? locatorsParam.split(',').filter(Boolean) : []);
    }, [searchParams]);

    const locatorOptions = locators.map(locator => ({
        code: locator._id,
        label: locator.name
    }));

    const handleSubmit = (e) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams);

        // This form and the described search above it are alternatives, not
        // layers: submitting here clears the AI filter, so the chips never
        // describe conditions that are no longer the ones being applied. The
        // page number goes too — it belongs to the previous result set.
        params.delete(FILTER_PARAM);
        params.delete(TZ_PARAM);
        params.delete('page');

        if (search.trim()) {
            params.set('search', search.trim());
        } else {
            params.delete('search');
        }

        if (locatorIds.length > 0) {
            params.set('locators', locatorIds.join(','));
        } else {
            params.delete('locators');
        }

        router.push(`${pathname}?${params.toString()}`);
    };

    const handleClear = () => {
        setSearch('');
        setLocatorIds([]);
        const params = new URLSearchParams(searchParams);
        params.delete('search');
        params.delete('locators');
        params.delete(FILTER_PARAM);
        params.delete(TZ_PARAM);
        params.delete('page');
        router.push(`${pathname}?${params.toString()}`);
    };

    return <form className={styles.filter} onSubmit={handleSubmit}>
        <div className={styles.search}>
            <Input
                label="Search"
                type="text"
                name="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name or address..."
            />
            { search && <Button
                type="button"
                value=""
                icon={<LuX />}
                onClick={() => handleClear()}
            /> }
        </div>
        <div className={styles.locator}>
            <SelectMulti
                label="Locator"
                name="locators"
                value={locatorIds}
                onChange={setLocatorIds}
                placeholder="Select locators"
                options={locatorOptions}
            />
        </div>
        <div className={styles.actions}>
            <Button
                type="submit"
                value="Find"
                icon={<LuSearch />}
                primary={true}
            />
        </div>
    </form>
}

export default Filter;