import styles from '../Forms.module.scss';

export default function Select({ label, name, value, onChange, placeholder, required, note=null, options=[], error=null }) {
    return (
        <div className={`${styles.select} ${error ? styles.errorForm : ''}`}>
            <label htmlFor={name}>{label} {required ? <span className={styles.required}>*</span> : ''}</label>
            <select name={name} value={value} onChange={onChange} placeholder={placeholder} required={required}>
                { options.map(option => <option key={option.code} value={option.code}>{option.label}</option>) }
            </select>
            { note ? <p className={styles.note}>{note}</p> : '' }
            { error ? <p className={styles.error}>{error}</p> : '' }
        </div>
    );
}