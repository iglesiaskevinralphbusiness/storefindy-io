import Link from 'next/link';
import Button from '@/components/Forms/Button';
import { LuChevronRight } from "react-icons/lu";

export default function LimitReached({ msg="You've reached your limit. To add more locations, please subscribe to Pro or Business." }) {
    return (
        <div className="empty">
            <h2>Limit Reached</h2>
            <p>{ msg }</p>
            <Link href="/dashboard/billing"><Button value="See Your Subscription" icon={<LuChevronRight />} iconPosition="right" primary={true} /></Link>
        </div>
    );
}