import { LuTriangleAlert, LuInfo } from "react-icons/lu";
import styles from './Information.module.scss';

export default function Information({ type='warning', message }) {

    const getIcon = () => {
        if (type === 'warning') {
            return <LuTriangleAlert />;
        }
        if (type === 'information') {
            return <LuInfo />;
        }
        return <LuTriangleAlert />;
    }

    return (
        <div className={styles[type]}>
            <div>{ getIcon() }</div>
            <div>{ message }</div>
        </div>
    );
}
