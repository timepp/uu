// tu: a set of utility functions
// hash: fca00ce6799a39149684e46e23d8e69756354ecab60333b49f7111903f821340
// Please do not modify this file directly. Use the following command to update this file on a deno environment:
// deno run -A --reload jsr:@timepp/uu/install


/// get time as YYYY-MM-DD HH:mm:ss
/// timeZoneOffset is in minutes, e.g. 
//     -480: for UTC+8
//     480: for UTC-8
//     0: for UTC
//     undefined: for local device timezone (so the result can be different on different devices)
export function formatTime(d: Date, timeZoneOffset?: number): string {
    const t = d.getTime()
    const date = new Date(t - (timeZoneOffset??d.getTimezoneOffset()) * 60 * 1000)
    return date.toISOString().slice(0, 19).replace('T', ' ')
}

export function formatDate(d: Date, timeZoneOffset?: number): string {
    return formatTime(d, timeZoneOffset).slice(0, 10)
}

export function formatFloat(n: number, digits = 2, mininumDigits = 0): string {
    return n.toLocaleString(undefined, { 
        minimumFractionDigits: mininumDigits, 
        maximumFractionDigits: digits,
        useGrouping: false,
    })
}


export function trimSuffix(str: string, suffix: string): string {
    if (str.endsWith(suffix)) {
        return str.slice(0, -suffix.length);
    }
    return str;
}

export function trimPrefix(str: string, prefix: string): string {
    if (str.startsWith(prefix)) {
        return str.slice(prefix.length);
    }
    return str;
}

export function trimEmptyLines(str: string, ...locations: ('head' | 'tail' | 'middle')[]): string {
    let lines = str.split('\n');

    // Handle head (leading) empty lines
    if (locations.includes('head')) {
        lines = lines.slice(lines.findIndex(line => line.trim() !== ''));
    }

    // Handle tail (trailing) empty lines
    if (locations.includes('tail')) {
        let end = lines.length - 1;
        while (end >= 0 && lines[end].trim() === '') {
            end--;
        }
        lines = lines.slice(0, end + 1);
    }

    // Handle middle empty lines
    if (locations.includes('middle')) {
        lines = lines.filter(line => line.trim() !== '');
    }

    return lines.join('\n');
}

export function indentTextWithSpaces(text: string, spaces: number): string {
    const indent = ' '.repeat(spaces);
    return text.split('\n').map(line => indent + line).join('\n');
}

export function getIndention(text: string): number {
    let indention = 0
    for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ') {
            indention++
        } else {
            break
        }
    }
    return indention
}

// take the first line as reference, indent or unindent accordingly
export function ensureIndention(text: string, spaces: number): string {
    const indention = getIndention(text)
    if (indention >= spaces) {
        return unIndentTextWithSpaces(text, indention - spaces)
    } else {
        return indentTextWithSpaces(text, spaces - indention)
    }
}

export function unIndentTextWithSpaces(text: string, spaces: number): string {
    // if spaces is more than leading spaces, just remove all leading spaces
    return text.split('\n').map(line => {
        const removeCount = Math.min(getIndention(line), spaces)
        return line.slice(removeCount);
    }).join('\n');
}

export function hashString(s: string): number {
    let hash = 0;
    if (s.length === 0) return hash;
    for (let i = 0; i < s.length; i++) {
        hash = (hash << 5) - hash;
        hash = hash + s.charCodeAt(i);
        hash = hash & hash;
    }
    return hash;
}


export function toFileSystemCompatibleName(name: string): string {
    // 1. Remove leading and trailing spaces
    name = name.trim()

    // 2. Replace invalid characters with underscores
    const invalidChars = /[<>:"/\\|?*]/g
    name = name.replace(invalidChars, '_')

    // 3. Limit length to 255 characters
    if (name.length > 255) {
        name = name.slice(0, 255)
    }

    return name
}

function traverseObjectInternal(obj: any, callback: (path: string[], value: any, type: 'object'|'leaf'|'loop') => void, path: string[], seenObjects: WeakSet<object>): void {
    if (typeof obj !== 'object' || obj === null) {
        callback(path, obj, 'leaf');
        return;
    }

    if (seenObjects.has(obj)) {
        callback(path, obj, 'loop');
    } else {
        seenObjects.add(obj);
        callback(path, obj, 'object');
        for (const key in obj) {
            traverseObjectInternal(obj[key], callback, [...path, key], seenObjects);
        }
    }
}

export function traverseObject(obj: any, callback: (path: string[], value: any, type: 'object'|'leaf'|'loop') => void): void {
    const seenObjects = new WeakSet<object>()
    traverseObjectInternal(obj, callback, [], seenObjects)
}

export function dataProperties(arr: object[]): string[] {
    const propSet = new Set<string>()
    for (const item of arr) {
        for (const key in item) {
            propSet.add(key)
        }
    }
    return [...propSet]
}

// catch all excpetion and return a default value if error occurs
export function safeExecute<T>(fn: () => T, defaultValue: T | ((e: unknown) => T)): T {
    try {
        return fn()
    } catch (e) {
        if (typeof defaultValue === 'function') {
            return (defaultValue as (e: unknown) => T)(e)
        } else {
            return defaultValue
        }
    }
}

export function createState<T extends object>(object: T, properties: (keyof T)[], stateKey?: string): Pick<T, typeof properties[number]> {
    // 内部存储的状态对象
    const internalState: Partial<T> = {};

    // 初始化 internalState，只包含指定的属性
    properties.forEach((prop) => {
        if (prop in object) {
            internalState[prop] = object[prop];
        }
    });

    // 定义代理对象
    const state = new Proxy(internalState, {
        get(target: Partial<T>, prop: string | symbol, receiver: any) {
            // 将 prop 转换为 keyof T 类型，并检查是否在 properties 中
            const key = prop as keyof T;
            if (properties.includes(key)) {
                return target[key];
            }
            throw new Error(`Property '${String(prop)}' is not managed by this state`);
            // return undefined; // 未指定的属性返回 undefined
        },
        set(target: Partial<T>, prop: string | symbol, value: any) {
            // 将 prop 转换为 keyof T 类型，并检查是否在 properties 中
            const key = prop as keyof T;
            if (properties.includes(key)) {
                target[key] = value;
                saveState();
                return true;
            }
            throw new Error(`Property '${String(prop)}' is not managed by this state`);
        }
    }) as Pick<T, typeof properties[number]>;

    // 加载状态
    function loadState() {
        if (!stateKey) return;
        const stored = localStorage.getItem(stateKey);
        if (stored) {
            const parsed = JSON.parse(stored);
            properties.forEach((prop) => {
                if (prop in parsed) {
                    internalState[prop] = parsed[prop];
                }
            });
        }
    }

    // 保存状态
    function saveState() {
        if (!stateKey) return;
        const persistState: Partial<T> = {};
        properties.forEach((prop) => {
            persistState[prop] = internalState[prop];
        });
        localStorage.setItem(stateKey, JSON.stringify(persistState));
    }

    // 加载初始状态
    loadState();

    return state;
}

/// break text into pieces by given regex matchers
/// each piece is attached with a category
/// return: {content, category}[] that covers the whole text
export function segmentByRegex(text: string, hc: [RegExp, string][]): {content: string, category: string}[] {
    const matches: { index: number; length: number; content: string; category: string }[] = [];

    // 收集所有匹配项，按照优先级从高到低处理
    for (const [re, category] of hc) {
        for (const match of text.matchAll(re)) {
            if (match.index !== undefined) {
                const matchStart = match.index;
                const matchEnd = matchStart + match.length;

                // 检查是否与已有匹配项重叠
                let overlap = false;
                for (const existingMatch of matches) {
                    const existingStart = existingMatch.index;
                    const existingEnd = existingStart + existingMatch.length;
                    if ((matchStart < existingEnd && matchEnd > existingStart)) {
                        overlap = true;
                        break;
                    }
                }

                // 如果没有重叠，添加到匹配项列表
                if (!overlap) {
                    matches.push({ index: match.index, length: match[0].length, content: match[0], category });
                }
            }
        }
    }

    // 按 `index` 从小到大排序，确保匹配顺序正确
    matches.sort((a, b) => a.index - b.index);
    console.log(matches)
    
    // run through the text and create pieces
    const pieces: { content: string, category: string }[] = [];
    let lastIndex = 0;
    for (const match of matches) {
        const { index, length, content, category } = match;
        if (lastIndex < index) {
            pieces.push({content: text.slice(lastIndex, index), category: ''});
        }
        pieces.push({content, category});
        lastIndex = index + length;
    }
    if (lastIndex < text.length) {
        pieces.push({content: text.slice(lastIndex), category: ''});
    }
    return pieces;
}

/// highlight json text with the following constructs:
/// - key: "key":
/// - string: "string"
/// - number: 123
/// - boolean: true/false
/// - null: null
/// - punctuation: {, }, [, ], :, ,
export function segmentJson(text: string): {content: string, category: 'key' | 'string' | 'number' | 'true' | 'false' | 'null' | 'punctuation' | ''}[] {
    return segmentByRegex(text, [
        [/"[^"]+":/g, 'key'],
        [/"(?:[^"\\]|\\.)*"/g, 'string'], // 支持转义的字符串匹配
        [/\d+/g, 'number'],
        [/true/g, 'true'],
        [/false/g, 'false'],
        [/null/g, 'null'],
        [/[{}[\]:,]/g, 'punctuation'],
    ]) as {
        content: string,
        category: 'key' | 'string' | 'number' | 'true' | 'false' | 'null' | 'punctuation' | ''
    }[]
}

/** get the date boundaries for a given date and type
 *  @example getDateBoundaries(new Date(), 'week', 1) // get the next week boundaries
 *  @example getDateBoundaries(new Date(), 'week', -1) // get the last week boundaries
 *  @example getDateBoundaries(new Date(), 'month', 0) // get current month boundaries
 */
export function getDateBoundaries(t: Date, type: 'week' | 'month' | 'day' | 'year', offset: number = 0): { start: Date, end: Date } {
    const start = new Date(t);
    const end = new Date(t);

    switch (type) {
        case 'week':
            const day = start.getDay();
            start.setDate(start.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
            end.setDate(start.getDate() + 6);
            break;
        case 'month':
            start.setMonth(start.getMonth() + offset, 1);
            end.setMonth(start.getMonth() + 1, 0);
            break;
        case 'day':
            start.setDate(start.getDate() + offset);
            end.setDate(start.getDate());
            break;
        case 'year':
            start.setFullYear(start.getFullYear() + offset, 0, 1);
            end.setFullYear(start.getFullYear(), 11, 31);
            break;
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
}

/** This function fixes the bug in Date that when time part it's not given, it 
    will construct UTC date instead of local date.
    @see https://www.google.com/search?q=date-only+forms+are+interpreted+as+a+UTC+time
*/
export function parseDate(s: string) : Date {
    if (!s.includes(':')) {
        s = s + 'T00:00:00'
    }
    return new Date(s)
}

/** replace html template
 *  this function replace the following with the corresponding value in the replacements object:
 *  <!-- {{key}} Begin -->
    ...
    <!-- {{key}} End -->
 */
export function replaceHtmlTemplate(template: string, replacements: Record<string, string>): string {
    const regex = /<!--\s*{{(.*?)}}\s*Begin\s*-->([\s\S]*?)<!--\s*{{\1}}\s*End\s*-->/g;
    return template.replace(regex, (match, key) => {
        return replacements[key] || match;
    });
}

export type TokenInfo = {
    aud: string;
    upn: string;
    exp: number;
    scp?: string;
}

export function decodeJwt(token: string): { raw: string, ti: TokenInfo, isExpired: boolean } {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('JWT must have 3 parts');
    }

    // convert base64url to base64
    const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64Url));

    const ti = payload as TokenInfo;
    // check if the token is expired
    const isExpired = ti.exp < Math.floor(Date.now() / 1000);
    return {
        raw: token,
        ti,
        isExpired,
    }
}
