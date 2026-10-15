import { sharedScale } from './Sparkline';
import { TrendCard, type TrendCardProps } from './TrendCard';
import css from './cardGrid.module.css';

type TrendGridProps = {
    cards: TrendCardProps[];
    hideVerdicts?: boolean;
};

/**
 * Cards whose sparklines share one scale, so a rating sits at the same
 * height on every card and the lines can be compared.
 */
export function TrendGrid({ cards, hideVerdicts }: TrendGridProps) {
    const scale = sharedScale(cards.map((card) => card.ratings));
    return (
        <ul className={css.grid}>
            {cards.map((card) => (
                <li key={card.id}>
                    <TrendCard
                        {...card}
                        verdict={hideVerdicts ? undefined : card.verdict}
                        scale={scale}
                    />
                </li>
            ))}
        </ul>
    );
}
