import css from './setupNotice.module.css';

export function SetupNotice() {
    return (
        <div className={css.notice}>
            <h2>Connect to TMDB</h2>
            <p>
                Season-o-meter needs a TMDB API key. Create one at{' '}
                <a href="https://www.themoviedb.org/settings/api">
                    themoviedb.org/settings/api
                </a>{' '}
                and add it to <code>.env.local</code>:
            </p>
            <pre>TMDB_API_KEY=your-key-or-read-access-token</pre>
        </div>
    );
}
