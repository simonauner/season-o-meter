import React, { FunctionComponent, ReactElement } from 'react';
import { tvShowDetails } from '../../lib/types';
import css from './card.module.css';
import { StarIcon } from '../Icons';
import { LineGraph } from '../LineGraph/LineGraph';
import Link from 'next/link';
import classNames from 'classnames';
import { Typography } from 'antd';
type TvCardProps = {
    data: tvShowDetails;
};

type IconTextProps = {
    icon: ReactElement;
    text: string | number;
};

export const Card: FunctionComponent<TvCardProps> = ({ data }) => {
    return (
        <Link href={`/show/${data.id}`}>
            <div
                className={classNames(css.base)}
                style={{
                    backgroundImage: `url('https://image.tmdb.org/t/p/w500/${data.poster_path}')`,
                }}
            >
                <div className={css.content}>
                    <h2>{data.name}</h2>

                    <StarIcon inline />
                    {data.vote_average}

                    <LineGraph size="small" data={data.rating} />
                </div>
            </div>
        </Link>
    );
};
