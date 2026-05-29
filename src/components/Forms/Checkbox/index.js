import styles from '../Forms.module.scss';

export default function Checkbox({ label, name, description = null, checked, onChange, disabled = false }) {
    return (
        <label className={`${styles.checkbox} ${disabled ? styles.disabled : ''}`} htmlFor={name}>
            <div className={styles.text}>
                <span className={styles.label}>{label}</span>
                { description ? <span className={styles.description}>{description}</span> : '' }
            </div>
            <span className={styles.toggle}>
                <input
                    type="checkbox"
                    id={name}
                    name={name}
                    checked={checked}
                    onChange={onChange}
                    disabled={disabled}
                />
                <span className={styles.slider}></span>
            </span>
        </label>
    );
}
