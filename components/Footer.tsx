import { getData } from '@/lib/data';
import css from './footer.module.css';

export function Footer() {
    const updated = new Date(getData().generatedAt).toLocaleDateString('en', {
        dateStyle: 'long',
        timeZone: 'UTC',
    });

    return (
        <footer className={css.footer}>
            <p>
                Information courtesy of{' '}
                <a href="https://www.imdb.com/" rel="noreferrer">
                    IMDb
                </a>
                . Used with permission. Updated {updated}.
            </p>
            <p>
                A season&apos;s rating is the average of its episode ratings.
                Episodes with fewer than five votes are left out.
            </p>
        </footer>
    );
}
