import Link from 'next/link';
import Button from '@/components/Forms/Button';
import { LuChevronRight } from "react-icons/lu";

export default function LimitReached({
    heading="",
    msg="You've reached your limit. To add more locations, please subscribe to Pro or Business.",
    href="/dashboard/billing",
    buttonText="See Your Subscription"
}) {
    return (
        <div className="empty">
            { heading !== "" && <h2>{ heading }</h2> }
            <p>{ msg }</p>
            <Link href={href}>
                <Button value={buttonText} icon={<LuChevronRight />} iconPosition="right" primary={true} />
            </Link>
        </div>
    );
}