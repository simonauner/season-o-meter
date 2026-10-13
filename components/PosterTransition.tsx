'use client';

import Link from 'next/link';
import {
    type ComponentProps,
    createContext,
    type ReactNode,
    use,
    useState,
    ViewTransition,
} from 'react';

/** Whether the posters inside take part in the next page transition. */
const Shared = createContext(true);

/** Marks the posters in a PosterScope as followed. */
const Follow = createContext<(() => void) | null>(null);

/**
 * A title's poster and links to its page, whose poster grows into the one
 * on that page once one of the links is followed. Only then, since the same
 * title can be on a page more than once and only one poster can have its
 * name.
 */
export function PosterScope({ children }: { children: ReactNode }) {
    const [followed, setFollowed] = useState(false);
    return (
        <Shared value={followed}>
            <Follow value={() => setFollowed(true)}>{children}</Follow>
        </Shared>
    );
}

/** A link to a title's page, inside the PosterScope of its poster. */
export function PosterLink({
    onNavigate,
    ...props
}: ComponentProps<typeof Link>) {
    const follow = use(Follow);
    return (
        <Link
            {...props}
            onNavigate={(event) => {
                follow?.();
                onNavigate?.(event);
            }}
        />
    );
}

/**
 * A title's poster that moves into place when a page transition takes it
 * from one page to the next, as from a list or Swipe to the title's page.
 */
export function SharedPoster({
    id,
    children,
}: {
    id: string;
    children: ReactNode;
}) {
    const shared = use(Shared);
    return (
        <ViewTransition
            name={shared ? `poster-${id}` : undefined}
            share="poster"
            default="none"
        >
            {children}
        </ViewTransition>
    );
}
