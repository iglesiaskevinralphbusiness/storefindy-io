'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './FadeIn.module.scss';

export default function FadeIn({ children, className = '', delay = 0, style, immediate = false, ...props }) {
    const ref = useRef(null);
    const [visible, setVisible] = useState(immediate);
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (immediate) return;

        const root = ref.current;
        if (!root) return;

        const target = root.firstElementChild || root;
        const show = () => setVisible(true);

        if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            show();
            setDone(true);
            return;
        }

        if (typeof IntersectionObserver === 'undefined') {
            show();
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    show();
                    observer.unobserve(target);
                }
            },
            { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, [immediate]);

    useEffect(() => {
        if (!visible || done) return;
        const target = ref.current?.firstElementChild;
        if (!target) return;
        const onEnd = () => setDone(true);
        target.addEventListener('animationend', onEnd);
        return () => target.removeEventListener('animationend', onEnd);
    }, [visible, done]);

    return (
        <div
            ref={ref}
            data-sf-fade=""
            className={[styles.fadeIn, visible ? styles.visible : '', done ? styles.done : '', className].filter(Boolean).join(' ')}
            style={{ '--fade-delay': `${delay}ms`, ...style }}
            {...props}
        >
            {children}
        </div>
    );
}
