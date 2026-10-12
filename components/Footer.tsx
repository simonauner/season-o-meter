import css from './footer.module.css';

export function Footer() {
    return (
        <footer className={css.footer}>
            <p>
                Data from{' '}
                <a href="https://www.themoviedb.org/" rel="noreferrer">
                    TMDB
                </a>
                . This product uses the TMDB API but is not endorsed or
                certified by TMDB.
            </p>
            <p>
                Season ratings are the average of each season&apos;s rated
                episodes.
            </p>
        </footer>
    );
}
