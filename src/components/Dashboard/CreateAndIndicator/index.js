import styles from './CreateAndIndicator.module.scss';
import Button from '@/components/Forms/Button';
import { LuPlus } from "react-icons/lu";

export default function CreateAndIndicator({
    buttonIcon=<LuPlus />,
    buttonValue='Create',
}) {
    return (
        <div className={styles.indicator}>
            <Button
                primary={true}
                icon={buttonIcon}
                value={buttonValue}
            />
            <div className={styles.used}>2 of 3 used</div>
        </div>
    );
}