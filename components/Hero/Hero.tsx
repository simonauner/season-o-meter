import classNames from 'classnames';
import { FunctionComponent } from 'react';
import css from './hero.module.css';
type HeroProps = {
    header: string;
    text?: string;
    bgImage?: string;
};

export const Hero: FunctionComponent<HeroProps> = ({
    header,
    text,
    bgImage,
}) => {
    return (
        <div
            style={{
                backgroundImage: `url(https://image.tmdb.org/t/p/w500/${bgImage})`,
            }}
            className={classNames(
                'bg-dark text-secondary px-4 py-5 text-center',
                css.base
            )}
        >
            <div className="pyt-5 py-2 myt-5">
                <h1 className="display-5 fw-bold text-white">{header}</h1>
            </div>
            {text && (
                <div className="col-lg-6 mx-auto">
                    <p className="fs-5 mb-4">{text}</p>
                </div>
            )}
        </div>
    );
};
