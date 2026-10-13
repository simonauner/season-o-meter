import Link from 'next/link';
import { NavLinks, ProfileLink } from './NavLinks';
import { SearchBox } from './SearchBox';
import { StickyHeader } from './StickyHeader';
import css from './header.module.css';

// Season heights for the logo mark: a series that peaks, then goes downhill.
const MARK_BARS = [9, 13, 18, 12, 7];
const MARK_PEAK = 2;

function LogoMark() {
    return (
        <svg
            className={css.mark}
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
        >
            {MARK_BARS.map((height, i) => (
                <rect
                    key={i}
                    x={1 + i * 4.6}
                    y={21 - height}
                    width={3.2}
                    height={height}
                    rx={1.2}
                    className={i === MARK_PEAK ? css.markPeak : css.markBar}
                />
            ))}
        </svg>
    );
}

export function Header() {
    return (
        <StickyHeader className={css.header}>
            <div className={css.inner}>
                <Link href="/" className={css.logo}>
                    <LogoMark />
                    <span>
                        Season<span className={css.logoO}>-o-</span>meter
                    </span>
                </Link>
                <ProfileLink />
                <NavLinks />
                <SearchBox />
            </div>
        </StickyHeader>
    );
}
