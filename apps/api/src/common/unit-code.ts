// Unit codes are stored uppercase with no spaces, so "ics 2201" and "ICS2201" find the same paper.
export const normalizeUnitCode = (v: string) => v.toUpperCase().replace(/[\s-]+/g, '');
export const UNIT_CODE_RE = /^[A-Z]{2,6}\d{2,5}[A-Z]?$/;
