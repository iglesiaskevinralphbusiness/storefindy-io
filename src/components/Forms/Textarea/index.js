import styles from '../Forms.module.scss';

export default function Textarea({ label, name, value, onChange, placeholder, required, note=null }) {
    return (
        <div className={styles.textarea}>
            <label htmlFor={name}>{label} {required ? <span className={styles.required}>*</span> : ''}</label>
            <textarea name={name} value={value} onChange={onChange} placeholder={placeholder} required={required} />
            { note ? <p className={styles.note}>{note}</p> : '' }
        </div>
    );
}