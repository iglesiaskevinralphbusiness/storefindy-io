import styles from '../Forms.module.scss';
import { AiOutlineLoading3Quarters } from "react-icons/ai";

export default function Button({ type='button', name, value, onClick, icon=null, iconPosition='left', primary=false, disabled=false, pending=false }) {
    return (
        <button
            className={`${styles.button} ${primary ? styles.primary : styles.secondary} ${pending ? styles.pending : ''}`}
            type={type}
            name={name}
            value={value}
            onClick={onClick}
            disabled={disabled || pending}
        >
            {iconPosition === 'left' ? pending ? <AiOutlineLoading3Quarters /> : icon : ''}
            {value}
            {iconPosition === 'right' ? pending ? <AiOutlineLoading3Quarters /> : icon : ''}
        </button>
    );
}