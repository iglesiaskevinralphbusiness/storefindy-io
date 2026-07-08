'use client';
import styles from './CreateAndIndicator.module.scss';
import Button from '@/components/Forms/Button';
import { LuPlus } from "react-icons/lu";
import { useRouter } from 'next/navigation';

export default function CreateAndIndicator({
    buttonIcon=<LuPlus />,
    buttonValue='Create',
    buttonHref='',
    used=null,
}) {
    const router = useRouter();
    return (
        <div className={styles.indicator}>
            <Button
                primary={true}
                icon={buttonIcon}
                value={buttonValue}
                onClick={() => {
                    if(buttonHref) {
                        router.push(buttonHref);
                    }
                }}
            />
            { used && <div className={styles.used}>{used}</div> }
        </div>
    );
}