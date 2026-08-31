'use client';

import { useActionState, useState } from 'react';
import { LuMail, LuCircleCheck, LuCircleAlert } from 'react-icons/lu';
import Input from '@/components/Forms/Input';
import Button from '@/components/Forms/Button';
import { sendContactEmail } from '@/actions/admin/contactEmailSender';
import styles from './SendForm.module.scss';

function ResultPanel({ result }) {
    if (!result) return null;

    if (!result.success) {
        return (
            <div className={`${styles.result} ${styles.error}`}>
                <LuCircleAlert aria-hidden="true" />
                <div>
                    <h3>Send failed</h3>
                    <p>{result.error}</p>
                    {result.detail ? <p className={styles.errorDetail}>{result.detail}</p> : null}
                </div>
            </div>
        );
    }

    return (
        <div className={`${styles.result} ${styles.success}`}>
            <LuCircleCheck aria-hidden="true" />
            <div>
                <h3>Email sent</h3>
                <p>
                    The Storefindy outreach email was sent to <strong>{result.email}</strong>.
                    It should also appear in your Titan Sent folder.
                </p>
            </div>
        </div>
    );
}

export default function SendForm() {
    const [email, setEmail] = useState('');
    const [state, action, pending] = useActionState(sendContactEmail, null);

    return (
        <div className={styles.wrap}>
            <form action={action} className={styles.form} noValidate>
                <Input
                    label="Recipient email"
                    type="email"
                    name="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="contact@example.com"
                    required
                    note="Sends the Storefindy outreach template from support@storefindy.com via GoDaddy/Titan SMTP."
                />
                <div className={styles.actions}>
                    <Button
                        type="submit"
                        value="Send Email"
                        primary
                        icon={<LuMail />}
                        pending={pending}
                    />
                </div>
            </form>
            <ResultPanel result={state} />
        </div>
    );
}
