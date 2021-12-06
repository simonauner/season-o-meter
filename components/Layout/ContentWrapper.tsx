import css from './contentWrapper.module.css';

export const ContentWrapper = ({ children }) => (
    <div className={css.base}>{children}</div>
);
