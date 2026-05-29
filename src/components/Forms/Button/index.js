import styles from '../Forms.module.scss';

export default function Button({ label, name, value, onClick, icon=null, iconPosition='left', primary=false }) {
    return (
        <button
            className={`${styles.button} ${primary ? styles.primary : styles.secondary}`}
            name={name}
            value={value}
            onClick={onClick}
        >
            {iconPosition === 'left' ? icon : ''}
            {value}
            {iconPosition === 'right' ? icon : ''}
        </button>
    );
}