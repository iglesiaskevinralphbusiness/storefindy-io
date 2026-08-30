'use client';

import { useEffect, useRef, useState, useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { TbSearch, TbCircleCheck, TbAlertCircle } from 'react-icons/tb';
import Input from '@/components/Forms/Input';
import Button from '@/components/Forms/Button';
import { analyzeProspect } from '@/actions/admin/prospectCustomerAnalyze';
import styles from './AnalyzeForm.module.scss';

function ResultPanel({ result }) {
    if (!result) return null;

    if (!result.success) {
        return (
            <div className={`${styles.result} ${styles.error}`}>
                <TbAlertCircle aria-hidden="true" />
                <div>
                    <h3>Analysis failed</h3>
                    <p>{result.error}</p>
                    {result.detail ? <p className={styles.errorDetail}>{result.detail}</p> : null}
                </div>
            </div>
        );
    }

    if (result.type === 'duplicate') {
        return (
            <div className={`${styles.result} ${styles.warning}`}>
                <TbAlertCircle aria-hidden="true" />
                <div>
                    <h3>Already in list</h3>
                    <p>{result.reason}</p>
                    <dl className={styles.meta}>
                        <div>
                            <dt>Website</dt>
                            <dd>{result.data?.domain || result.data?.site_url}</dd>
                        </div>
                        <div>
                            <dt>Status</dt>
                            <dd>{result.data?.status === 'done' ? 'Done' : 'Pending'}</dd>
                        </div>
                        {result.data?.email ? (
                            <div>
                                <dt>Email</dt>
                                <dd>{result.data.email}</dd>
                            </div>
                        ) : null}
                    </dl>
                </div>
            </div>
        );
    }

    if (result.type === 'not-prospect') {
        return (
            <div className={`${styles.result} ${styles.warning}`}>
                <TbAlertCircle aria-hidden="true" />
                <div>
                    <h3>Not a prospect</h3>
                    <p>{result.reason}</p>
                    <dl className={styles.meta}>
                        <div>
                            <dt>Website</dt>
                            <dd>{result.data?.site_url}</dd>
                        </div>
                        {typeof result.data?.store_locator_confidence === 'number' && (
                            <div>
                                <dt>Store locator confidence</dt>
                                <dd>{result.data.store_locator_confidence}%</dd>
                            </div>
                        )}
                    </dl>
                    {result.data?.store_locator_evidence?.length > 0 && (
                        <ul className={styles.evidence}>
                            {result.data.store_locator_evidence.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        );
    }

    const data = result.data || {};

    return (
        <div className={`${styles.result} ${styles.success}`}>
            <TbCircleCheck aria-hidden="true" />
            <div>
                <h3>Prospect saved</h3>
                <p>{data.score_reason || 'Qualified prospect added to the table.'}</p>
                <dl className={styles.meta}>
                    <div>
                        <dt>Company</dt>
                        <dd>{data.company_name || data.domain || '—'}</dd>
                    </div>
                    <div>
                        <dt>Email</dt>
                        <dd>{data.email || 'Not found'}</dd>
                    </div>
                    <div>
                        <dt>Score</dt>
                        <dd>{data.score ?? 0}</dd>
                    </div>
                    {data.existing_locator && (
                        <div>
                            <dt>Existing locator</dt>
                            <dd>{data.existing_locator}</dd>
                        </div>
                    )}
                    <div>
                        <dt>Locations</dt>
                        <dd>{data.estimated_location_count || (data.has_multiple_locations ? '2+' : '—')}</dd>
                    </div>
                </dl>
                {data.score_breakdown?.length > 0 && (
                    <ul className={styles.evidence}>
                        {data.score_breakdown.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default function AnalyzeForm() {
    const router = useRouter();
    const formRef = useRef(null);
    const [url, setUrl] = useState('');
    const [state, action, pending] = useActionState(analyzeProspect, null);

    useEffect(() => {
        if (state?.success && state?.type === 'prospect') {
            router.refresh();
        }
    }, [state, router]);

    return (
        <div className={styles.wrap}>
            <form ref={formRef} action={action} className={styles.form} noValidate>
                <Input
                    label="Website URL"
                    type="url"
                    name="url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://example.com"
                    required
                    note="Enter a business website to find contact emails and evaluate Storefindy fit."
                />
                <div className={styles.actions}>
                    <Button
                        type="submit"
                        value="Analyze Website"
                        primary
                        icon={<TbSearch />}
                        pending={pending}
                    />
                </div>
            </form>
            <ResultPanel result={state} />
        </div>
    );
}
