'use client';

import { useEffect, useState } from 'react';

/** Shared between components, so each file is fetched once per page view. */
const requests = new Map<string, Promise<unknown>>();

/**
 * The files that have loaded, so that coming back to a page shows them right
 * away, at the height it had, instead of after a moment.
 */
const loaded = new Map<string, unknown>();

const fetchJson = (path: string) =>
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH}${path}`)
        .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json() as Promise<unknown>;
        })
        .then((json) => {
            loaded.set(path, json);
            return json;
        });

/**
 * A JSON file generated at build time, like /search-index.json. It isn't
 * fetched until `enabled`, for a file that's only needed once asked for.
 */
export function useStaticJson<T>(path: string, enabled = true) {
    // Nothing has loaded while the page is hydrated, so this matches the
    // server's render.
    const [data, setData] = useState<T | null>(() =>
        enabled ? ((loaded.get(path) as T | undefined) ?? null) : null
    );
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!enabled) return;
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
    }, [path, enabled]);

    return { data, failed };
}
