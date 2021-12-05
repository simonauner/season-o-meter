import classNames from 'classnames';
import Image from 'next/image';
import { FunctionComponent } from 'react';

import css from './footer.module.css';

export const Footer: FunctionComponent = () => {
    return (
        <div className={classNames('bg-dark text-white', css.base)}>
            <div className="container">
                <div className="row">
                    <div className="col-lg-3 mb-3">
                        <ul className="list-unstyled small text-muted">
                            <li className="mb-2">
                                <a
                                    href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Powered by{' '}
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
                            <li className="mb-2">Twitter bootstrap</li>
                            <li className="mb-2">
                                The movie DB <br />
                                <small>
                                    This product uses the TMDB API but is not
                                    endorsed or certified by TMDB.
                                </small>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
