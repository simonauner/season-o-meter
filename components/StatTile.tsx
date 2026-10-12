import css from './statTile.module.css';

type StatTileProps = {
    label: string;
    value: string;
    detail?: string;
    tone?: 'up' | 'down';
};

export function StatTile({ label, value, detail, tone }: StatTileProps) {
    return (
        <div className={css.tile}>
            <div className={css.label}>{label}</div>
            <div className={`${css.value} ${tone ? css[tone] : ''}`}>
                {value}
            </div>
            {detail && <div className={css.detail}>{detail}</div>}
        </div>
    );
}
