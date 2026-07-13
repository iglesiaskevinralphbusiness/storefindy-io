import styles from '../Forms.module.scss';

export default function Input({ label, type, name, value, maxlength=500, min, max, onChange, onKeyDown, placeholder, required, note=null, error=null, readOnly=false }) {
    return (
        <div className={`${styles.input} ${error ? styles.errorForm : ''}`}>
            <label htmlFor={name}>{label} {required ? <span className={styles.required}>*</span> : ''}</label>
            <input type={type} name={name} value={value} maxLength={maxlength} min={min} max={max} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} required={required} readOnly={readOnly} />
            { note ? <p className={styles.note}>{note}</p> : '' }
            { error ? <p className={styles.error}>{error}</p> : '' }
        </div>
    );
}