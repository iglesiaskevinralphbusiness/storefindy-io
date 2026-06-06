'use client';
import { useEffect, useRef, useState } from 'react';
import styles from '../Forms.module.scss';

export default function SelectMulti({ label, name, value = [], onChange, placeholder = 'Select...', required, note = null, options = [], error = null }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleClickOutside = e => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const allChecked = options.length > 0 && value.length === options.length;

    const toggleOption = code => {
        const newValue = value.includes(code)
            ? value.filter(v => v !== code)
            : [...value, code];
        onChange(newValue);
    };

    const toggleAll = () => {
        onChange(allChecked ? [] : options.map(option => option.code));
    };

    const selectedLabels = options
        .filter(option => value.includes(option.code))
        .map(option => option.label);

    return (
        <div className={`${styles.select} ${styles.selectMulti} ${error ? styles.errorForm : ''}`} ref={ref}>
            <label htmlFor={name}>{label} {required ? <span className={styles.required}>*</span> : ''}</label>
            <div className={styles.control} onClick={() => setOpen(prev => !prev)}>
                <span className={selectedLabels.length ? styles.value : styles.placeholder}>
                    {selectedLabels.length ? selectedLabels.join(', ') : placeholder}
                </span>
                <span className={styles.arrow}>▾</span>
            </div>
            { open ? (
                <ul className={styles.menu}>
                    <li
                        className={`${styles.option} ${styles.allOption} ${allChecked ? styles.selected : ''}`}
                        onClick={toggleAll}
                    >
                        <input
                            type="checkbox"
                            checked={allChecked}
                            onChange={() => {}}
                            tabIndex={-1}
                        />
                        <span>All</span>
                    </li>
                    { options.map(option => (
                        <li
                            key={option.code}
                            className={`${styles.option} ${value.includes(option.code) ? styles.selected : ''}`}
                            onClick={() => toggleOption(option.code)}
                        >
                            <input
                                type="checkbox"
                                checked={value.includes(option.code)}
                                onChange={() => {}}
                                tabIndex={-1}
                            />
                            <span>{option.label}</span>
                        </li>
                    )) }
                </ul>
            ) : '' }
            { note ? <p className={styles.note}>{note}</p> : '' }
            { error ? <p className={styles.error}>{error}</p> : '' }
        </div>
    );
}
