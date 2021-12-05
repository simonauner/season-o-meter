import React, { FunctionComponent, ReactElement } from 'react';
import { tvShowDetails } from '../../lib/types';
import css from './card.module.css';
import { StarIcon } from '../Icons';
import { LineGraph } from '../LineGraph/LineGraph';
import Link from 'next/link';
import classNames from 'classnames';
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
                className={classNames(
                    'card card-cover text-white bg-dark rounded-5 shadow-lg',
                    css.base
                )}
                style={{
                    backgroundImage: `url('https://image.tmdb.org/t/p/w500/${data.poster_path}')`,
                }}
            >
                <div className="d-flex flex-column h-100 p-5 pb-3 text-white text-shadow-1">
                    {/* <h2 className="pt-5 mt-5 mb-4 display-6 lh-1 fw-bold">
                        {data.name}
                    </h2> */}

                    <ul className="d-flex list-unstyled mt-auto">
                        <li className="d-flex align-items-center">
                            <StarIcon inline />
                            {data.vote_average}
                        </li>
                    </ul>

                    <LineGraph data={data.rating} />
                </div>
            </div>
        </Link>
    );
};
