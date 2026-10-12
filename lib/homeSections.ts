import type { TrendCardProps } from '@/components/TrendCard';
import type { MinSeasons } from './minSeasons';
import type { Section } from './sections';

/**
 * The front page's sections with every match, not just the top few, served as
 * /home-sections.json. Lets the visitor filter them by their own ratings.
 */
export type HomeSections = {
    /** Per chosen minimum number of seasons. Items are series ids, best first. */
    sections: Record<MinSeasons, Section<string>[]>;
    /** The card for every series in any section, by id. */
    cards: Record<string, TrendCardProps>;
};
