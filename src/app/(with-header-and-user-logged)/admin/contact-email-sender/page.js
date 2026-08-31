import styles from '../Admin.module.scss';
import SidebarAdmin from '@/components/Admin/Sidebar';
import { RiArrowRightLine } from 'react-icons/ri';
import SendForm from '@/components/Admin/ContactEmailSender/SendForm';

export default function ContactEmailSenderPage() {
    return (
        <div className={styles.admin}>
            <SidebarAdmin />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Email Sender</h1>
                    <p>Admin <RiArrowRightLine /> Email Sender</p>
                </div>
                <div className={styles.body}>
                    <SendForm />
                </div>
            </div>
        </div>
    );
}
