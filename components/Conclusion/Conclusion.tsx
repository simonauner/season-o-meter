import { Typography } from 'antd';
import { FC } from 'react';
import { Season } from '../../lib/types';

import css from './conclusion.module.css';

type ConclusionProps = {
    seasons: Season[];
    showRating: number;
    ended: boolean;
};

// https://stackoverflow.com/questions/11796810/calculate-trendline-and-predict-future-results
function LineFitter() {
    this.count = 0;
    this.sumX = 0;
    this.sumX2 = 0;
    this.sumXY = 0;
    this.sumY = 0;
}

LineFitter.prototype = {
    add: function (x, y) {
        this.count++;
        this.sumX += x;
        this.sumX2 += x * x;
        this.sumXY += x * y;
        this.sumY += y;
    },
    project: function (x) {
        var det = this.count * this.sumX2 - this.sumX * this.sumX;
        var offset = (this.sumX2 * this.sumY - this.sumX * this.sumXY) / det;
        var scale = (this.count * this.sumXY - this.sumX * this.sumY) / det;
        return offset + x * scale;
    },
};

export const Conclusion: FC<ConclusionProps> = ({
    showRating,
    seasons,
    ended,
}) => {
    if (!seasons) return null;

    var fitter = new LineFitter();
    seasons.forEach((season, index) => {
        fitter.add(index, season.rating);
    });
    const projection = fitter.project(seasons.length);

    const average =
        seasons.reduce((prev, curr) => prev + curr.rating, 0) / seasons.length;

    console.log(`${projection}  ${average}`);

    if (Number(projection) < Number(average) && ended)
        return <div className={css.base}>Verdict: Fell on the finish line</div>;
    else if (Number(projection) > Number(average) && !ended)
        return <div className={css.base}>Verdict: Going strong</div>;
    else {
        return null;
    }
};
