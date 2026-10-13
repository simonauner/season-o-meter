import { getData } from '@/lib/data';
import { postCreditsFacts, skylinePool } from '@/lib/footer';
import { PostCredits } from './PostCredits';
import { Skyline } from './Skyline';
import css from './footer.module.css';

export function Footer() {
    const data = getData();
    const updated = new Date(data.generatedAt).toLocaleDateString('en', {
        dateStyle: 'long',
        timeZone: 'UTC',
    });
    const hasPosters = [...data.shows, ...data.franchises].some(
        (title) => title.poster
    );

    return (
        <footer className={css.footer}>
            <Skyline pool={skylinePool(data)} />
            <div className={css.body}>
                <p className={css.wrap}>That&apos;s a wrap</p>
                <dl className={css.credits}>
                    <div>
                        <dt>Ratings</dt>
                        <dd>
                            <a href="https://www.imdb.com/" rel="noreferrer">
                                IMDb
                            </a>
                        </dd>
                    </div>
                    <div>
                        <dt>Film series</dt>
                        <dd>
                            <a
                                href="https://www.wikidata.org/"
                                rel="noreferrer"
                            >
                                Wikidata
                            </a>
                        </dd>
                    </div>
                    {hasPosters && (
                        <div>
                            <dt>Posters</dt>
                            <dd>
                                <a
                                    href="https://www.themoviedb.org/"
                                    rel="noreferrer"
                                >
                                    TMDB
                                </a>
                            </dd>
                        </div>
                    )}
                    <div>
                        <dt>Season rating</dt>
                        <dd>The average of its episode ratings</dd>
                    </div>
                    <div>
                        <dt>Cutting room floor</dt>
                        <dd>Episodes with fewer than five votes</dd>
                    </div>
                    <div>
                        <dt>Last updated</dt>
                        <dd>{updated}</dd>
                    </div>
                </dl>
                <PostCredits facts={postCreditsFacts(data)} />
                <p className={css.fine}>
                    Information courtesy of{' '}
                    <a href="https://www.imdb.com/" rel="noreferrer">
                        IMDb
                    </a>
                    . Used with permission.
                    {hasPosters &&
                        ' This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.'}{' '}
                    No episodes were harmed in the making of this site.
                </p>
                <p className={css.studio}>
                    A{' '}
                    <a href="https://hackskaduha.se/" rel="noreferrer">
                        hackskaduha.se
                    </a>{' '}
                    production
                </p>
            </div>
        </footer>
    );
}
