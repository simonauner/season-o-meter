import { Typography } from 'antd';
import classNames from 'classnames';
import { FunctionComponent } from 'react';
import css from './hero.module.css';
type HeroProps = {
    header: string;
    text?: string;
};

export const Hero: FunctionComponent<HeroProps> = ({ header, text }) => {
    return (
        <div className={classNames(css.base)}>
            <h1>{header}</h1>
            {text && <p className={css.text}>{text}</p>}
        </div>
    );
};
