import classNames from 'classnames';
import React, { FC } from 'react';
import {
    CartesianGrid,
    Label,
    Line,
    LineChart,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

type LineGraphProps = {
    data: number[];
    size: 'large' | 'small';
    className?: string;
};

export const LineGraph: FC<LineGraphProps> = ({
    data,
    size = 'small',
    className,
}) => {
    // const twoDimensional = data?.map((rating, index) => ({
    //     season: index + 1,
    //     rating: Number(rating),
    // }));

    const widths = {
        small: 150,
        large: 600,
    };

    const heights = {
        small: 40,
        large: 400,
    };

    const isLarge = size === 'large';

    if (!data || !data.length) return null;

    return (
        <div
            style={{ width: widths[size], height: heights[size] }}
            className={className}
        >
            <LineChart
                width={widths[size]}
                height={heights[size]}
                data={data}
                margin={{ top: 5, right: 5, left: 5, bottom: 15 }}
            >
                {isLarge && (
                    <YAxis
                        ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                        dataKey="rating"
                    />
                )}
                {isLarge && (
                    <XAxis dataKey="id">
                        <Label value="Season" offset={0} position="bottom" />
                    </XAxis>
                )}
                {isLarge && <CartesianGrid stroke="#f5f5f5" />}
                {isLarge && (
                    <Tooltip labelFormatter={(value) => `Season ${value}`} />
                )}
                <Line
                    type="monotone"
                    dataKey="rating"
                    stroke="#ff7300"
                    yAxisId={0}
                />
            </LineChart>
        </div>
    );
};
