import { Menu } from 'antd';
import { Header } from 'antd/lib/layout/layout';
import Link from 'next/link';
import * as React from 'react';

export const TopMenu = () => {
    return (
        <Header>
            <Menu theme="dark" mode="horizontal">
                <Menu.Item key="home">
                    <Link href="/">Home</Link>
                </Menu.Item>
            </Menu>
        </Header>

        // <form className="col-12 col-lg-auto mb-3 mb-lg-0 me-lg-3">
        //     <input
        //         type="search"
        //         className="form-control form-control-dark"
        //         placeholder="Search..."
        //         aria-label="Search"
        //     />
        // </form>
    );
};
