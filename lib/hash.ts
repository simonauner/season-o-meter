/** A number in [0, 1) from a string, the same every time. */
export function hashUnit(text: string) {
    // FNV-1a, then a final mix so similar ids spread out.
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
    }
    hash ^= hash >>> 15;
    hash = Math.imul(hash, 0x2c1b3c6d);
    hash ^= hash >>> 12;
    return (hash >>> 0) / 2 ** 32;
}
