import { Typography } from 'antd';
import Title from 'antd/lib/skeleton/Title';
import classNames from 'classnames';
import Image from 'next/image';
import { FunctionComponent } from 'react';

import css from './footer.module.css';

export const Footer: FunctionComponent = () => {
    return (
        <div className={classNames(css.base)}>
            <ul className={css.list}>
                <li className={css.listHeader}>
                    <Typography.Title level={5}>Powered by</Typography.Title>
                </li>
                <li className={css.listItem}>
                    <a
                        href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <span>
                            <Image
                                src="/vercel.svg"
                                alt="Vercel Logo"
                                width={72}
                                height={16}
                            />
                        </span>
                    </a>
                </li>
                <li className={css.listItem}>
                    The movie DB <br />
                    <small>
                        This product uses the TMDB API but is not endorsed or
                        certified by TMDB.
                    </small>
                </li>
            </ul>
        </div>
    );
};
