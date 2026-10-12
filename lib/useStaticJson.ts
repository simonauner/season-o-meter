'use client';

import { useEffect, useState } from 'react';

/** Shared between components, so each file is fetched once per page view. */
const requests = new Map<string, Promise<unknown>>();

const fetchJson = (path: string) =>
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH}${path}`).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<unknown>;
    });

/** A JSON file generated at build time, like /search-index.json. */
export function useStaticJson<T>(path: string) {
    const [data, setData] = useState<T | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let live = true;
        let request = requests.get(path);
        if (!request) {
            request = fetchJson(path);
            requests.set(path, request);
        }
        request.then(
            (json) => {
                if (live) setData(json as T);
            },
            () => {
                // Lets the next page try again.
                requests.delete(path);
                if (live) setFailed(true);
            }
        );
        return () => {
            live = false;
        };
    }, [path]);

    return { data, failed };
}
