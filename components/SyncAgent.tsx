'use client';

import { useEffect } from 'react';
import { startSync } from '@/lib/sync';

/** Keeps the visitor's list in sync on every page, when sync is on. */
export function SyncAgent() {
    useEffect(() => startSync(), []);
    return null;
}
