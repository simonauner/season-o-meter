import { ResponsiveLine, Serie } from '@nivo/line';
import classNames from 'classnames';
import React, { FC } from 'react';
import { Season } from '../../lib/types';

import css from './linegraph.module.css';

type LineGraphProps = {
    data: Season[];
    size: 'large' | 'small';
    className?: string;
};

export const LineGraph: FC<LineGraphProps> = ({
    data: dataProp,
    size = 'small',
    className,
}) => {
    const data = React.useMemo(
        () => [
            {
                id: 'serie',
                data: dataProp?.map((rating) => ({
                    x: rating.id,
                    y: rating.rating,
                })),
            } as Serie,
        ],
        [dataProp]
    );

    // const widths = {
    //     small: 200,
    //     large: 600,
    // };

    // const heights = {
    //     small: 100,
    //     large: 400,
    // };

    const isLarge = size === 'large';

    if (!data || !data.length || !data[0]?.data?.length) return null;

    console.log(data);

    return (
        <div className={classNames(css.wrapper, { [css.large]: isLarge })}>
            <ResponsiveLine
                data={data}
                margin={
                    isLarge
                        ? { top: 50, right: 60, bottom: 50, left: 60 }
                        : { top: 15, right: 15, bottom: 15, left: 15 }
                }
                xScale={{ type: 'point' }}
                yScale={{
                    type: 'linear',
                    min: isLarge ? 0 : 'auto',
                    max: isLarge ? 10 : 'auto',
                }}
                axisBottom={
                    isLarge && {
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Season',
                        legendOffset: 36,
                        legendPosition: 'middle',
                    }
                }
                axisLeft={
                    isLarge && {
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Rating',
                        legendOffset: -40,
                        legendPosition: 'middle',
                    }
                }
                pointSize={20}
                pointColor={{ theme: 'background' }}
                pointBorderWidth={2}
                pointBorderColor={{ from: 'serieColor' }}
                pointLabelYOffset={-12}
                enableGridX={isLarge}
                enableGridY={isLarge}
                lineWidth={4}
            />
        </div>
    );
};
