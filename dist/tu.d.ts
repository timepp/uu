export declare function formatTime(d: Date, timeZoneOffset?: number): string;
export declare function formatDate(d: Date, timeZoneOffset?: number): string;
export declare function formatFloat(n: number, digits?: number, mininumDigits?: number): string;
export declare function trimSuffix(str: string, suffix: string): string;
export declare function trimPrefix(str: string, prefix: string): string;
export declare function trimEmptyLines(str: string, ...locations: ('head' | 'tail' | 'middle')[]): string;
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
export declare function toFileSystemCompatibleName(name: string): string;
export declare function traverseObject(obj: any, maxDepth: number, callback: (path: string[], value: any, type: 'object' | 'leaf' | 'loop') => void): void;
export declare function getStringifyReplacer(limit?: {
    maxStringLength?: number;
    maxArraySize?: number;
}): (key: string, value: any) => any;
export declare function dataProperties(arr: object[]): string[];
export declare function safeExecute<T>(fn: () => T, defaultValue: T | ((e: unknown) => T)): T;
export declare function createState<T extends object>(object: T, properties: (keyof T)[], stateKey?: string): Pick<T, typeof properties[number]>;
export declare function segmentByRegex(text: string, hc: [RegExp, string][]): {
    content: string;
    category: string;
}[];
export declare function segmentJson(text: string): {
    content: string;
    category: 'key' | 'string' | 'number' | 'true' | 'false' | 'null' | 'punctuation' | '';
}[];
/** get the date boundaries for a given date and type
 *  @example getDateBoundaries(new Date(), 'week', 1) // get the next week boundaries
 *  @example getDateBoundaries(new Date(), 'week', -1) // get the last week boundaries
 *  @example getDateBoundaries(new Date(), 'month', 0) // get current month boundaries
 */
export declare function getDateBoundaries(t: Date, type: 'week' | 'month' | 'day' | 'year', offset?: number): {
    start: Date;
    end: Date;
};
/** This function fixes the bug in Date that when time part it's not given, it
    will construct UTC date instead of local date.
    @see https://www.google.com/search?q=date-only+forms+are+interpreted+as+a+UTC+time
*/
export declare function parseDate(s: string): Date;
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
