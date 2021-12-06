import { MenuOutlined } from '@ant-design/icons';
import { Button, Input, Menu } from 'antd';
import { Header } from 'antd/lib/layout/layout';
import classNames from 'classnames';
import Link from 'next/link';
import { useRouter } from 'next/router';
import * as React from 'react';

import css from './topMenu.module.css';

type MenuItemProps = {
    path: string;
};

const MenuItem: React.FC<MenuItemProps> = ({ path, children }) => {
    const { pathname } = useRouter();

    return (
        <Link passHref href={path}>
            <div
                className={classNames(css.menuItem, {
                    [css.selected]: path === pathname,
                })}
            >
                <Link href={path}>{children}</Link>
            </div>
        </Link>
    );
};

export const TopMenu = () => {
    const [isExpanded, setIsExpanded] = React.useState(true);

    return (
        <nav className={classNames(css.base, { [css.show]: isExpanded })}>
            <div className={classNames(css.menu)}>
                <MenuItem path="/">Trending</MenuItem>
                <MenuItem path="/popular">Popular</MenuItem>
            </div>
            <div className={css.extra}>
                <Button
                    className={css.expander}
                    type="primary"
                    ghost
                    icon={<MenuOutlined />}
                    onClick={() => setIsExpanded(!isExpanded)}
                />
                <Input.Search className={css.search} />
            </div>
        </nav>
    );
};
