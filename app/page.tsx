import Link from 'next/link';
import { PageIntro } from '@/components/PageIntro';
import { ShowGrid } from '@/components/ShowGrid';
import { findSections } from '@/lib/analysis';
import { getShows } from '@/lib/data';
import css from './home.module.css';

const SHOWS_PER_SECTION = 6;

export default function Page() {
    const sections = findSections(getShows(), SHOWS_PER_SECTION);

    return (
        <>
            <PageIntro title="Where did it peak?">
                How TV series are rated season by season, and where they went
                downhill.
            </PageIntro>
            {sections.map((section) => (
                <section key={section.slug} className={css.section}>
                    <div className={css.heading}>
                        <div>
                            <h2>{section.title}</h2>
                            <p>{section.description}</p>
                        </div>
                        <Link
                            href={`/lists/${section.slug}/`}
                            className={css.more}
                        >
                            See all
                            <span className="visually-hidden">
                                : {section.title}
                            </span>{' '}
                            →
                        </Link>
                    </div>
                    <ShowGrid shows={section.shows} />
                </section>
            ))}
        </>
    );
}
