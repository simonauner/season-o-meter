import css from './content.module.css';

export const Content = ({ children }) => (
    <div className={css.base}>{children}</div>
);
