'use client';

import { useEffect, useRef, useState } from 'react';
import { ratedIds } from '@/lib/userData';
import { useUserData } from '@/lib/userStore';
import css from './ratingHint.module.css';

/**
 * A wave across a rating scale, to show a visitor who hasn't rated anything
 * yet where ratings go. It starts once the scale is in view and repeats until
 * they rate something. Put `ref` and `className` on the element around the
 * steps, and give each step its place on the scale as `--index`.
 */
export function useRatingHint<T extends HTMLElement>() {
    const data = useUserData();
    const ref = useRef<T>(null);
    const [inView, setInView] = useState(false);
    const unrated = data !== null && ratedIds(data).size === 0;

    useEffect(() => {
        const scale = ref.current;
        if (!unrated || inView || !scale) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                observer.disconnect();
                setInView(true);
            },
            { threshold: 1 }
        );
        observer.observe(scale);
        return () => observer.disconnect();
    }, [unrated, inView]);

    return { ref, className: unrated && inView ? css.hint : '' };
}
