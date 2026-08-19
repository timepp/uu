export declare function formatTime(d: Date, timeZoneOffset?: number): string;
export declare function formatDate(d: Date, timeZoneOffset?: number): string;
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
/**
 * parse a time range from a readable string.
 * schema:
 *   range := rangeSpec | timeSpec..timeSpec
 *   timeSpec := exactTime | exactTime adjustment
 *   exactTime := date | date time | now
 *   date := YYYY-MM-DD
 *   time := HH:mm:ss
 *   adjustment := ( '+' | '-' ) number unit
 *   unit := 'd' | 'h' | 'm' | 's' | 'M' | 'y' (day, hour, minute, second, month, year)
 *   rangeSpec := yyyy | yyyy-MM | yyyy-MM-dd | today | yesterday | tomorrow | this-week | last-week | next-week | this-month | last-month | next-month | this-year | last-year | next-year | day(timeSpec) | week(timeSpec) | month(timeSpec) | year(timeSpec)
 * @param s the time range string, e.g.
 *     '2025-03'
 *     '2025-03-01 01:02..2025-03-02 03:04:05'
 *     'today'
 *     'last week'
 *     'month(2025-03-10)'
 *     'now-1h..now
 * @param timeZoneOffset time zone offset in minutes, with the same meaning of `Date.getTimezoneOffset` e.g.
 *     -480: for UTC+8
 *     480: for UTC-8
 *     This parameter only brings difference when the output is expect to be day/week/month/year boundary (e.g. today, this week)
 */
export declare function parseTimeRange(s: string, timeZoneOffset?: number): {
    start: Date;
    end: Date;
};
export type TimeUnit = 'day' | 'hour' | 'minute' | 'second' | 'month' | 'year';
/**
 * Adjust a time by a specified amount and unit
 * @param base
 * @param amount
 * @param unit
 * @returns new Date
 * @example adjustTimeUtc(new Date('2025-03-10T12:00:00Z'), 1, 'day') // 2025-03-11T12:00:00Z
 * @example adjustTimeUtc(new Date('2025-03-10T12:00:00Z'), -2, 'hour') // 2025-03-10T10:00:00Z
 * @example adjustTimeUtc(new Date('2025-01-31T12:00:00Z'), 1, 'month') // 2025-02-28T12:00:00Z (clamped)
 * @example adjustTimeUtc(new Date('2024-02-29T12:00:00Z'), 1, 'year') // 2025-02-28T12:00:00Z (clamped)
 */
export declare function adjustTimeUtc(base: Date, amount: number, unit: TimeUnit): Date;
export declare function adjustTime(base: Date, amount: number, unit: TimeUnit, timeZoneOffset?: number): Date;
