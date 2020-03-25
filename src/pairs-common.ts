/**
 * split "a->b" into ["a", "b"]
 */
function strSplitter(str: string): string[] {
    const tokens = str.replace(" ", "").split("->");
    if (tokens.length < 2) {
        return [tokens[0], tokens[0]];
    }
    return tokens;
}

/**
 * split a Pair object that contain "a->b" into two Pairs
 */
export function splitPair(p: any): any[] {
    if (typeof p === "string") {
        return strSplitter(p);
    }

    if (Array.isArray(p)) {
        const a = [];
        const b = [];
        for (const i of p) {
            const pair = splitPair(i);
            a.push(pair[0]);
            b.push(pair[1]);
        }
        return [a, b];
    }

    if (typeof p === "object") {
        const a: any = {};
        const b: any = {};
        for (const [key, value] of Object.entries(p)) {
            const pair = splitPair(value);
            a[key] = pair[0];
            b[key] = pair[1];
        }
        return [a, b];
    }

    return [p, p];
}
