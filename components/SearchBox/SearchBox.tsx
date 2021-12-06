import { Select } from 'antd';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import { useDebounce } from '../../lib/hooks/useDebounce';
import { useSearchQuery } from '../../lib/showsService';

const { Option } = Select;

export const SearchBox = () => {
    const [value, setValue] = useState<string>();
    const debouncedValue = useDebounce(value, 250);
    const router = useRouter();

    const { data, isLoading } = useSearchQuery(debouncedValue, {
        skip: !debouncedValue,
    });

    const handleSearch = (value) => {
        setValue(value);
    };

    const handleOnChange = (id) => {
        router.push(`/shows/${id}`);
    };

    const options = data?.results.map((d) => (
        <Option value={d.id} key={d.id}>
            {d.name}
        </Option>
    ));
    return (
        <Select
            style={{ width: 200 }}
            loading={isLoading}
            showSearch
            value={value}
            defaultActiveFirstOption={false}
            showArrow={false}
            filterOption={false}
            onSearch={handleSearch}
            onChange={handleOnChange}
            notFoundContent={null}
        >
            {options}
        </Select>
    );
};
