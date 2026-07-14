'use client';
import Button from '@/components/Forms/Button';
import { LuChevronRight, LuChevronLeft } from "react-icons/lu";
import { useRouter } from 'next/navigation';

export default function LimitReached({
    heading="",
    msg="You've reached your limit. To add more locations, please subscribe to Pro or Business.",
    href="/dashboard/billing",
    buttonText="See Your Subscription"
}) {
    const router = useRouter();

    return (
        <div className="empty">
            { heading !== "" && <h2>{ heading }</h2> }
            <p>{ msg }</p>
            <div className="empty-buttons">
                <Button
                    value="Go Back"
                    icon={<LuChevronLeft />}
                    iconPosition="left"
                    primary={false}
                    onClick={() => router.back()}
                />
                <Button
                    value={buttonText}
                    icon={<LuChevronRight/>}
                    iconPosition="right"
                    primary={true}
                    onClick={() => router.push(href)}
                />
            </div>
        </div>
    );
}