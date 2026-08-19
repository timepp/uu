export * from './tu-datetime.ts';
export * from './tu-cache.ts';
export declare function formatFloat(n: number, digits?: number, mininumDigits?: number): string;
export declare function formatFileSize(size: number): string;
export declare function trimSuffix(str: string, suffix: string): string;
export declare function trimPrefix(str: string, prefix: string): string;
export declare function trimHttps(url: string): string;
export declare function trimEmptyLines(str: string, ...locations: ('head' | 'tail' | 'middle')[]): string;
export declare function getStringFoldingIndicator(fullStringLength: number, desiredLength: number): {
    foldedLength: number;
    unfoldedLength: number;
    foldIndicator: string;
};
export declare function foldString(str: string, maxLength: number): string;
export declare function indentTextWithSpaces(text: string, spaces: number): string;
export declare function getIndention(text: string): number;
export declare function ensureIndention(text: string, spaces: number): string;
export declare function unIndentTextWithSpaces(text: string, spaces: number): string;
export declare function simpleHash(s: string): number;
/** Hash a string using the Web Crypto API
 *
 * @param str the string to hash
 * @param algo algo which will be passed to crypto.subtle.digest
 * @returns hash string in hex format
 */
export declare function hash(str: string, algo?: AlgorithmIdentifier): Promise<string>;
/** Generate a consistent color from a string
 *
 * @param str the string to convert to color
 * @param saturation HSL saturation value (0-100)
 * @param lightness HSL lightness value (0-100)
 * @returns HSL color string
 *
 * @example
 * ```typescript
 * const color = stringToColor('user-123') // 'hsl(235, 70%, 60%)'
 * ```
 */
export declare function stringToColor(str: string, saturation?: number, lightness?: number): string;
export declare function toFileSystemCompatibleName(name: string): string;
/**
 * Recursively traverse an object and its properties.
 * @param obj The object to traverse.
 * @param maxDepth Maximum depth to traverse. Use -1 for unlimited depth.
 * @param callback Return values: void/1 to continue, 0 to stop traversing sub-properties, -1 to stop all traversing.
 */
export declare function traverseObject(obj: any, maxDepth: number, callback: (path: string[], value: any, type: 'object' | 'leaf' | 'loop') => number | void): void;
export declare function fuzzyFind(obj: object, keyword: string, caseSensitive?: boolean): string[] | null;
export declare function stringify(obj: any, space?: number | string, compact?: boolean, maxStrLen?: number, maxArrSize?: number): string;
export type SafeStringifyCallback = (path: string[], value: any, startPos: number, endPos: number, isTrimmed: boolean) => void;
export declare function safeStringify(obj: any, space: number | string | undefined, maxStrLen?: number, maxArrSize?: number, compact?: boolean, callback?: SafeStringifyCallback): {
    str: string;
    circularRefs: number;
    trimmedStrings: number;
    trimmedArrays: number;
};
export declare function extractJsonObjects(text: string): {
    obj: any;
    startPos: number;
    endPos: number;
}[];
export declare function extractJsonObject(text: string): {
    obj: any;
    startPos: number;
    endPos: number;
} | null;
export declare function dataProperties(arr: object[]): string[];
export declare function safeExecute<T>(fn: () => T, defaultValue: T | ((e: unknown) => T)): T;
export declare function createObservableState<T extends object>(stateKey: string | null, initialState: T, onChange: (s: T) => void): T & {
    addObserver: (cb: (s: T) => void) => void;
};
export declare function createState<T extends object>(object: T, properties: (keyof T)[], stateKey?: string): Pick<T, typeof properties[number]>;
export declare function segmentByRegex(text: string, hc: [RegExp, string][]): {
    content: string;
    category: string;
}[];
export type JsonSegment = {
    content: string;
    category: 'key' | 'string' | 'number' | 'true' | 'false' | 'null' | 'punctuation' | '';
};
export declare function segmentJson(text: string): JsonSegment[];
export declare function getJsonRegexps(): [RegExp, string][];
/** replace html template
 *  this function replace the following with the corresponding value in the replacements object:
 *  <!-- {{key}} Begin -->
    ...
    <!-- {{key}} End -->
 */
export declare function replaceHtmlTemplate(template: string, replacements: Record<string, string>): string;
export type TokenInfo = {
    aud: string;
    upn: string;
    exp: number;
    scp?: string;
};
export declare function decodeJwt(token: string): {
    raw: string;
    ti: TokenInfo;
    isExpired: boolean;
};
export declare function derivedUrl(oldUrl: string, paramsToAdd: Record<string, string>, paramsToRemove?: RegExp): string;
export declare function derivedCurrentUrl(paramsToAdd: Record<string, string>, paramsToRemove?: RegExp): string;
export declare function shuffleArray<T>(array: T[]): void;
export type DataPropStat = {
    propName: string;
    uniqueValues: {
        value: string;
        count: number;
    }[];
};
export declare function getDataInsights(arr: object[]): DataPropStat[];
export declare function findIndexes(s: string, sub: string): number[];
export declare function groupBy<T>(arr: T[], keyFunc: (item: T) => string): [string, T[]][];
