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
            start.setDate(start.getDate() - (start.getDay() + 6) % 7 + offset * 7);
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
export function parseTimeRange(s: string, timeZoneOffset?: number) {
    const input = s.trim()
    if (!input) {
        throw new Error('Time range string is empty')
    }

    // implementation note:
    // To correctly handle "last day", "last week", 
    // we make a trick to apply timezone shift at `now` and do all calculations in UTC, so that the boundary time will not be affected by timezone shift and DST change.
    // we then apply the timezone shift again at the end to get the final result in output timezone.

    const MINUTE_MS = 60 * 1000
    const DAY_MS = 24 * 60 * MINUTE_MS

    function normalizeSpaceLower(text: string) {
        return text.trim().toLowerCase().replace(/\s+/g, ' ')
    }

    function makeUtcDate(year: number, month: number, day: number, hour: number, minute: number, second: number, ms = 0): Date {
        const d = new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms))
        if (
            d.getUTCFullYear() !== year
            || d.getUTCMonth() !== month - 1
            || d.getUTCDate() !== day
            || d.getUTCHours() !== hour
            || d.getUTCMinutes() !== minute
            || d.getUTCSeconds() !== second
        ) {
            throw new Error(`Invalid UTC date/time: ${year}-${month}-${day} ${hour}:${minute}:${second}`)
        }
        return d
    }

    function addMonthsClampedUtc(base: Date, deltaMonths: number) {
        const year = base.getUTCFullYear()
        const month0 = base.getUTCMonth()
        const day = base.getUTCDate()
        const hour = base.getUTCHours()
        const minute = base.getUTCMinutes()
        const second = base.getUTCSeconds()
        const ms = base.getUTCMilliseconds()

        const total = year * 12 + month0 + deltaMonths
        const targetYear = Math.floor(total / 12)
        const targetMonth0 = ((total % 12) + 12) % 12
        const maxDay = new Date(Date.UTC(targetYear, targetMonth0 + 1, 0)).getUTCDate()
        const targetDay = Math.min(day, maxDay)

        return new Date(Date.UTC(targetYear, targetMonth0, targetDay, hour, minute, second, ms))
    }

    function parseExactTimeUtc(text: string, now: Date): Date {
        const t = text.trim()
        if (/^now$/i.test(t)) {
            return new Date(now.getTime())
        }

        const m = t.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/)
        if (!m) {
            throw new Error(`Invalid exactTime: ${text}`)
        }

        const year = Number(m[1])
        const month = Number(m[2])
        const day = Number(m[3])
        const hour = m[4] === undefined ? 0 : Number(m[4])
        const minute = m[5] === undefined ? 0 : Number(m[5])
        const second = m[6] === undefined ? 0 : Number(m[6])

        return makeUtcDate(year, month, day, hour, minute, second)
    }

    function applyAdjustmentUtc(base: Date, sign: '+' | '-', amount: number, unit: string): Date {
        const n = sign === '-' ? -amount : amount
        switch (unit) {
            case 'd':
                return new Date(base.getTime() + n * DAY_MS)
            case 'h':
                return new Date(base.getTime() + n * 60 * MINUTE_MS)
            case 'm':
                return new Date(base.getTime() + n * MINUTE_MS)
            case 's':
                return new Date(base.getTime() + n * 1000)
            case 'M':
                return addMonthsClampedUtc(base, n)
            case 'y':
                return addMonthsClampedUtc(base, n * 12)
            default:
                throw new Error(`Invalid adjustment unit: ${unit}`)
        }
    }

    function parseTimeSpecUtc(text: string, now: Date): Date {
        const t = text.trim()
        const m = t.match(/^(.*?)(?:\s*([+-])\s*(\d+)\s*([dhmsMy]))?$/)
        if (!m) {
            throw new Error(`Invalid timeSpec: ${text}`)
        }

        const exact = m[1].trim()
        if (!exact) {
            throw new Error(`Invalid timeSpec: ${text}`)
        }

        let d = parseExactTimeUtc(exact, now)
        if (m[2] && m[3] && m[4]) {
            d = applyAdjustmentUtc(d, m[2] as '+' | '-', Number(m[3]), m[4])
        }
        return d
    }

    function startOfDayUtc(d: Date): Date {
        return makeUtcDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), 0, 0, 0)
    }

    function toUnitRangeUtc(anchor: Date, unit: 'day' | 'week' | 'month' | 'year') {
        if (unit === 'day') {
            const start = startOfDayUtc(anchor)
            const end = new Date(start.getTime() + DAY_MS)
            return { start, end }
        }

        if (unit === 'week') {
            const day = (anchor.getUTCDay() + 6) % 7
            const start = startOfDayUtc(anchor)
            start.setUTCDate(start.getUTCDate() - day)
            const end = new Date(start.getTime() + 7 * DAY_MS)
            return { start, end }
        }

        if (unit === 'month') {
            const start = makeUtcDate(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1, 0, 0, 0)
            const end = makeUtcDate(anchor.getUTCFullYear(), anchor.getUTCMonth() + 2, 1, 0, 0, 0)
            return { start, end }
        }

        const start = makeUtcDate(anchor.getUTCFullYear(), 1, 1, 0, 0, 0)
        const end = makeUtcDate(anchor.getUTCFullYear() + 1, 1, 1, 0, 0, 0)
        return { start, end }
    }

    function parseRangeSpecUtc(text: string, now: Date): { start: Date, end: Date } | null {
        const raw = text.trim()

        const y = raw.match(/^(\d{4})$/)
        if (y) {
            const year = Number(y[1])
            return {
                start: makeUtcDate(year, 1, 1, 0, 0, 0),
                end: makeUtcDate(year + 1, 1, 1, 0, 0, 0),
            }
        }

        const ym = raw.match(/^(\d{4})-(\d{2})$/)
        if (ym) {
            const year = Number(ym[1])
            const month = Number(ym[2])
            const start = makeUtcDate(year, month, 1, 0, 0, 0)
            const end = makeUtcDate(year, month + 1, 1, 0, 0, 0)
            return { start, end }
        }

        const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
        if (ymd) {
            const year = Number(ymd[1])
            const month = Number(ymd[2])
            const day = Number(ymd[3])
            const start = makeUtcDate(year, month, day, 0, 0, 0)
            const end = new Date(start.getTime() + DAY_MS)
            return { start, end }
        }

        const normalized = normalizeSpaceLower(raw)
        const aliases: Record<string, string> = {
            'today': 'day(now)',
            'yesterday': 'day(now-1d)',
            'tomorrow': 'day(now+1d)',
            'this-week': 'week(now)',
            'last-week': 'week(now-7d)',
            'next-week': 'week(now+7d)',
            'this-month': 'month(now)',
            'last-month': 'month(now-1M)',
            'next-month': 'month(now+1M)',
            'this-year': 'year(now)',
            'last-year': 'year(now-1y)',
            'next-year': 'year(now+1y)',
        }
        const aliased = aliases[normalized]
        if (aliased) {
            return parseRangeSpecUtc(aliased, now)
        }

        const wrapper = raw.match(/^([a-zA-Z]+)\s*\(\s*(.+)\s*\)$/)
        if (wrapper) {
            const unit = wrapper[1].toLowerCase()
            const inner = wrapper[2]
            if (unit === 'day' || unit === 'week' || unit === 'month' || unit === 'year') {
                const anchor = parseTimeSpecUtc(inner, now)
                return toUnitRangeUtc(anchor, unit)
            }
        }

        return null
    }

    function shiftToOutputZone(d: Date): Date {
        const offsetMinutes = timeZoneOffset ?? d.getTimezoneOffset()
        return new Date(d.getTime() + offsetMinutes * MINUTE_MS)
    }

    const now = new Date(Date.now() - (timeZoneOffset ?? new Date().getTimezoneOffset()) * MINUTE_MS)
    let range: { start: Date, end: Date } | null = null

    const firstSep = input.indexOf('..')
    if (firstSep >= 0) {
        const lastSep = input.lastIndexOf('..')
        if (firstSep !== lastSep) {
            throw new Error(`Invalid range expression: ${s}`)
        }

        const left = input.slice(0, firstSep).trim()
        const right = input.slice(firstSep + 2).trim()
        if (!left || !right) {
            throw new Error(`Invalid range expression: ${s}`)
        }

        range = {
            start: parseTimeSpecUtc(left, now),
            end: parseTimeSpecUtc(right, now),
        }
    } else {
        range = parseRangeSpecUtc(input, now)
        if (!range) {
            throw new Error(`Invalid rangeSpec or forbidden standalone timeSpec: ${s}`)
        }
    }

    const shiftedStart = shiftToOutputZone(range.start)
    const shiftedEnd = shiftToOutputZone(range.end)
    if (shiftedStart.getTime() <= shiftedEnd.getTime()) {
        return { start: shiftedStart, end: shiftedEnd }
    }
    return { start: shiftedEnd, end: shiftedStart }
}

export type TimeUnit = 'day' | 'hour' | 'minute' | 'second' | 'month' | 'year'
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
export function adjustTimeUtc(base: Date, amount: number, unit: TimeUnit) {
    function addMonthsClampedUtc(base: Date, deltaMonths: number) {
        const year = base.getUTCFullYear()
        const month0 = base.getUTCMonth()
        const day = base.getUTCDate()
        const hour = base.getUTCHours()
        const minute = base.getUTCMinutes()
        const second = base.getUTCSeconds()
        const ms = base.getUTCMilliseconds()

        const total = year * 12 + month0 + deltaMonths
        const targetYear = Math.floor(total / 12)
        const targetMonth0 = ((total % 12) + 12) % 12
        const maxDay = new Date(Date.UTC(targetYear, targetMonth0 + 1, 0)).getUTCDate()
        const targetDay = Math.min(day, maxDay)

        return new Date(Date.UTC(targetYear, targetMonth0, targetDay, hour, minute, second, ms))
    }

    const n = amount
    const MINUTE_MS = 60 * 1000
    const DAY_MS = 24 * 60 * MINUTE_MS
    switch (unit) {
        case 'day':
            return new Date(base.getTime() + n * DAY_MS)
        case 'hour':
            return new Date(base.getTime() + n * 60 * MINUTE_MS)
        case 'minute':
            return new Date(base.getTime() + n * MINUTE_MS)
        case 'second':
            return new Date(base.getTime() + n * 1000)
        case 'month':
            return addMonthsClampedUtc(base, n)
        case 'year':
            return addMonthsClampedUtc(base, n * 12)
        default:
            throw new Error(`Invalid adjustment unit: ${unit}`)
    }
}

function ulc(t: Date, converter: (t: Date) => Date, timeZoneOffset?: number) {
    const offsetMinutes = timeZoneOffset ?? t.getTimezoneOffset()
    const utc = new Date(t.getTime() - offsetMinutes * 60 * 1000)
    const converted = converter(utc)
    return new Date(converted.getTime() + offsetMinutes * 60 * 1000)
}

export function adjustTime(base: Date, amount: number, unit: TimeUnit, timeZoneOffset?: number) {
    const offsetMinutes = timeZoneOffset ?? base.getTimezoneOffset()
    const baseUtc = new Date(base.getTime() - offsetMinutes * 60 * 1000)
    const adjustedUtc = adjustTimeUtc(baseUtc, amount, unit)
    return new Date(adjustedUtc.getTime() + offsetMinutes * 60 * 1000)
}
