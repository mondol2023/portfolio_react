/**
 * Visitor cookie names.
 *
 * `pv_id` is a random UUID, not a hash of anything — it is what links a visit
 * to a contact message, and it is the only visitor identifier that survives
 * past midnight. `pv_day` records the last day this browser was counted as a
 * unique, so the daily rollup can increment without reading anything back.
 */
export const VISITOR_ID_COOKIE = "pv_id";
export const VISITOR_DAY_COOKIE = "pv_day";

/** A year. Long enough to be useful, short enough to expire on its own. */
export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
