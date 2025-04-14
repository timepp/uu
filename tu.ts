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

export function formatFloat(n: number, digits = 2, mininumDigits = 0): string {
    return n.toLocaleString(undefined, { 
        minimumFractionDigits: mininumDigits, 
        maximumFractionDigits: digits,
        useGrouping: false,
    })
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
