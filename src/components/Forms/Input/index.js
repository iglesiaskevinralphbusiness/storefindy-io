import styles from '../Forms.module.scss';

export default function Input({ label, type, name, value, maxlength=500, onChange, onKeyDown, placeholder, required, note=null, error=null }) {
    return (
        <div className={`${styles.input} ${error ? styles.errorForm : ''}`}>
            <label htmlFor={name}>{label} {required ? <span className={styles.required}>*</span> : ''}</label>
            <input type={type} name={name} value={value} maxlength={maxlength} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} required={required} />
            { note ? <p className={styles.note}>{note}</p> : '' }
            { error ? <p className={styles.error}>{error}</p> : '' }
        </div>
    );
}