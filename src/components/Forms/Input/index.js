import styles from '../Forms.module.scss';

export default function Input({ label, type, name, value, onChange, onKeyDown, placeholder, required, note=null }) {
    return (
        <div className={styles.input}>
            <label htmlFor={name}>{label} {required ? <span className={styles.required}>*</span> : ''}</label>
            <input type={type} name={name} value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} required={required} />
            { note ? <p className={styles.note}>{note}</p> : '' }
        </div>
    );
}