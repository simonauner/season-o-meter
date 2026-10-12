'use client';

import { type CSSProperties, type ReactNode, useId } from 'react';
import css from './choicePicker.module.css';

type ChoicePickerProps<T> = {
    /** Shown before the options. */
    label: ReactNode;
    /** Shown after the options. */
    suffix?: ReactNode;
    options: readonly { value: T; label: ReactNode }[];
    /** Null until the choice is known in the browser. */
    current: T | null;
    onChange: (value: T) => void;
};

/** A row of buttons where one is chosen, with a pill sliding between them. */
export function ChoicePicker<T>({
    label,
    suffix,
    options,
    current,
    onChange,
}: ChoicePickerProps<T>) {
    const labelId = useId();
    const currentIndex = options.findIndex(({ value }) => value === current);

    return (
        <div className={css.picker} role="group" aria-labelledby={labelId}>
            <span id={labelId}>{label}</span>
            <span
                className={css.options}
                style={{ '--count': options.length } as CSSProperties}
            >
                {/* Not drawn until the choice is known, so it doesn't jump. */}
                {currentIndex !== -1 && (
                    <span
                        className={css.indicator}
                        style={{ '--index': currentIndex } as CSSProperties}
                        aria-hidden
                    />
                )}
                {options.map((option, index) => (
                    <button
                        key={index}
                        type="button"
                        className={css.option}
                        aria-pressed={index === currentIndex}
                        onClick={() => onChange(option.value)}
                    >
                        {option.label}
                    </button>
                ))}
            </span>
            {suffix && <span>{suffix}</span>}
        </div>
    );
}
