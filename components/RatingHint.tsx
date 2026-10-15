'use client';

import { useEffect, useRef, useState } from 'react';
import { ratedIds } from '@/lib/userData';
import { useUserData } from '@/lib/userStore';
import css from './ratingHint.module.css';

/**
 * A wave across a rating scale, to show a visitor who hasn't rated anything
 * yet where ratings go. It starts once the scale is in view and, with
 * `repeat`, repeats until they rate something or `stop` is called. Put `ref`
 * and `className` on the element around the steps, and give each step its
 * place on the scale as `--index`.
 */
export function useRatingHint<T extends HTMLElement>({ repeat = true } = {}) {
    const data = useUserData();
    const ref = useRef<T>(null);
    const [state, setState] = useState<'waiting' | 'playing' | 'stopped'>(
        'waiting'
    );
    const unrated = data !== null && ratedIds(data).size === 0;

    useEffect(() => {
        const scale = ref.current;
        if (!unrated || state !== 'waiting' || !scale) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                observer.disconnect();
                setState('playing');
            },
            { threshold: 1 }
        );
        observer.observe(scale);
        return () => observer.disconnect();
    }, [unrated, state]);

    return {
        ref,
        className:
            unrated && state === 'playing'
                ? `${css.hint} ${repeat ? '' : css.once}`
                : '',
        stop: () => setState('stopped'),
    };
}
