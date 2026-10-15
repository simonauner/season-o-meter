'use client';

import Link from 'next/link';
import { type FormEvent, useId, useState } from 'react';
import { Button } from '@/components/Button';
import { Done } from '@/components/Done';
import {
    cleanName,
    friendsOf,
    listIdFromLink,
    saveFriend,
    useOwnListId,
} from '@/lib/friends';
import { MAX_NAME_LENGTH } from '@/lib/userData';
import { useUserData } from '@/lib/userStore';
import css from '../mine/mine.module.css';

type Problem = 'link' | 'name' | 'own';

const PROBLEMS: Record<Problem, string> = {
    link: 'That isn’t a link to a synced list. Ask them for the link under Share with friends on their My list, with sync on.',
    name: 'Give them a name.',
    own: 'That’s your own list.',
};

/**
 * Adds a friend to compare ratings with. With `listId`, for a list that is
 * already open, only asks for a name.
 */
export function AddFriendForm({ listId }: { listId?: string }) {
    const id = useId();
    const data = useUserData();
    const ownListId = useOwnListId();
    const [link, setLink] = useState('');
    const [name, setName] = useState('');
    const [problem, setProblem] = useState<Problem | null>(null);
    const [added, setAdded] = useState<string | null>(null);
    /** Each friend added gleams again. */
    const [adds, setAdds] = useState(0);

    const existing =
        listId && data
            ? friendsOf(data).find((friend) => friend.listId === listId)
            : undefined;

    if (listId && listId === ownListId) return null;

    if (existing) {
        const text = (
            <>
                You’ve added them as <strong>{existing.name}</strong>.{' '}
                <Link href="/friends/">Compare ratings</Link>
            </>
        );
        // Just added here, so it's said as done.
        return (
            <p className={css.result}>{added ? <Done>{text}</Done> : text}</p>
        );
    }

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const friendId = listId ?? listIdFromLink(link);
        const cleaned = cleanName(name);
        const found: Problem | null = !friendId
            ? 'link'
            : friendId === ownListId
              ? 'own'
              : !cleaned
                ? 'name'
                : null;
        setProblem(found);
        setAdded(null);
        if (found || !friendId || !cleaned) return;
        saveFriend(friendId, cleaned);
        setAdded(cleaned);
        setAdds((n) => n + 1);
        setLink('');
        setName('');
    };

    const message = problem ? `${id}-problem` : undefined;

    return (
        <form onSubmit={submit}>
            {!listId && (
                <>
                    <label htmlFor={`${id}-link`} className={css.label}>
                        Link to their list
                    </label>
                    <input
                        id={`${id}-link`}
                        className={`${css.link} ${css.field}`}
                        value={link}
                        onChange={(event) => setLink(event.target.value)}
                        placeholder="https://seasonometer.com/shared/#list=…"
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        aria-describedby={message}
                    />
                </>
            )}
            <label htmlFor={`${id}-name`} className={css.label}>
                Their name
            </label>
            <input
                id={`${id}-name`}
                className={`${css.link} ${css.overButtons}`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={MAX_NAME_LENGTH}
                autoComplete="off"
                enterKeyHint="done"
                aria-describedby={message}
            />
            <div className={css.buttons}>
                <Button type="submit" variant="tonal" disabled={!data}>
                    Add friend
                </Button>
                {added && !listId && <Done key={adds}>Added {added}.</Done>}
            </div>
            {problem && (
                <p id={message} role="alert" className={css.problem}>
                    {PROBLEMS[problem]}
                </p>
            )}
        </form>
    );
}

/** On someone's shared list: adds them, unless it's the visitor's own. */
export function AddFriendPanel({ listId }: { listId: string }) {
    if (listId === useOwnListId()) return null;
    return (
        <section className={css.panel}>
            <h2>Compare with them</h2>
            <p>
                Add them as a friend to see their ratings next to yours, and
                next to your other friends’.
            </p>
            <AddFriendForm listId={listId} />
        </section>
    );
}
