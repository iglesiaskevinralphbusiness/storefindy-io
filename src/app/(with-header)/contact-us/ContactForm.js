'use client';
import { useEffect, useRef, useState, useActionState } from 'react';
import { TbSend, TbCircleCheck } from 'react-icons/tb';
import Input from '@/components/Forms/Input';
import Select from '@/components/Forms/Select';
import Textarea from '@/components/Forms/Textarea';
import Button from '@/components/Forms/Button';
import { submitContactMessage } from '@/actions/contact';
import styles from './ContactUs.module.scss';

// Values must match the TOPICS list validated in @/actions/contact.
const TOPIC_OPTIONS = [
    { code: '', label: '— Select a topic —' },
    { code: 'Sales & pricing', label: 'Sales & pricing' },
    { code: 'Technical support', label: 'Technical support' },
    { code: 'Billing & subscriptions', label: 'Billing & subscriptions' },
    { code: 'Partnership', label: 'Partnership' },
    { code: 'Product feedback', label: 'Product feedback' },
    { code: 'Something else', label: 'Something else' },
];

export default function ContactForm() {
    const formRef = useRef(null);
    const [state, action, pending] = useActionState(submitContactMessage, { status: 'idle' });

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [topic, setTopic] = useState('');
    const [message, setMessage] = useState('');

    const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

    useEffect(() => {
        if (state.status === 'success') {
            formRef.current?.reset();
            // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing controlled inputs after a completed submit
            setName('');
            setEmail('');
            setTopic('');
            setMessage('');
        }
    }, [state]);

    const errors = state.status === 'error' ? state.errors : {};

    if (state.status === 'success') {
        return (
            <div className={styles.success}>
                <div className={styles.successIcon}>
                    <TbCircleCheck aria-hidden="true" />
                </div>
                <h3>Message sent — thank you!</h3>
                <p>
                    We&apos;ve received your message
                    {state.reference ? <> (ref <strong>{state.reference}</strong>)</> : null} and will get back to
                    you within 1 business day. Keep an eye on your inbox.
                </p>
            </div>
        );
    }

    return (
        <form ref={formRef} action={action} className={styles.form} noValidate>
            <input type="hidden" name="page_url" value={pageUrl} />

            <div className={styles.formRow}>
                <Input
                    label="Full name"
                    type="text"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    required
                    error={errors.name}
                />
                <Input
                    label="Email address"
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@company.com"
                    required
                    error={errors.email}
                />
            </div>

            <Select
                label="What can we help with?"
                name="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                options={TOPIC_OPTIONS}
                error={errors.topic}
            />

            <Textarea
                label="Message"
                name="message"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
                placeholder="Tell us a bit about what you need…"
                required
                maxlength={2000}
                note={`${message.length} / 2000`}
                error={errors.message}
            />

            {state.status === 'fatal' && (
                <p className={styles.formError}>{state.message}</p>
            )}

            <div className={styles.formActions}>
                <Button
                    type="submit"
                    name="submit"
                    value={pending ? 'Sending…' : 'Send message'}
                    icon={<TbSend />}
                    iconPosition="right"
                    primary
                    pending={pending}
                />
                <p className={styles.formNote}>We typically reply within 1 business day.</p>
            </div>
        </form>
    );
}
