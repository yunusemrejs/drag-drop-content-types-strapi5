const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_KEYS = 100;
const MAX_DEPTH = 10;
const MAX_ARRAY_INDEX = 100;
const MAX_VALUE_LENGTH = 2000;

function isArrayIndex(segment: string): boolean {
  if (!/^\d+$/.test(segment)) {
    return false;
  }
  const index = Number(segment);
  return Number.isInteger(index) && index >= 0 && index < MAX_ARRAY_INDEX;
}

function assignFilterPath(root: Record<string, unknown>, rawPath: string, value: string): void {
  const cleaned = rawPath.replace(/^filters\[/, '').replace(/^filters\./, '');
  const parts = cleaned
    .replace(/\]/g, '')
    .split(/\[|\./)
    .filter(Boolean);

  if (parts.length === 0 || parts.length > MAX_DEPTH) {
    return;
  }

  for (const part of parts) {
    if (FORBIDDEN_KEYS.has(part)) {
      return;
    }
  }

  let current: any = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const nextIsIndex = isArrayIndex(parts[i + 1]);
    const key = Array.isArray(current) && isArrayIndex(part) ? Number(part) : part;

    const existing = Object.prototype.hasOwnProperty.call(current, key) ? current[key] : undefined;
    if (existing === undefined || existing === null || typeof existing !== 'object') {
      current[key] = nextIsIndex ? [] : {};
    }
    current = current[key];
  }

  const lastPart = parts[parts.length - 1];
  const lastKey = Array.isArray(current) && isArrayIndex(lastPart) ? Number(lastPart) : lastPart;
  current[lastKey] = value.slice(0, MAX_VALUE_LENGTH);
}

function sanitizeNestedObject(input: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH || input === null || input === undefined) {
    return undefined;
  }
  if (typeof input === 'string') {
    return input.slice(0, MAX_VALUE_LENGTH);
  }
  if (typeof input === 'number' || typeof input === 'boolean') {
    return input;
  }
  if (Array.isArray(input)) {
    return input
      .slice(0, MAX_ARRAY_INDEX)
      .map((item) => sanitizeNestedObject(item, depth + 1))
      .filter((item) => item !== undefined);
  }
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    let count = 0;
    for (const key of Object.keys(input as Record<string, unknown>)) {
      if (count >= MAX_KEYS) {
        break;
      }
      if (FORBIDDEN_KEYS.has(key)) {
        continue;
      }
      const val = sanitizeNestedObject((input as Record<string, unknown>)[key], depth + 1);
      if (val !== undefined) {
        out[key] = val;
        count++;
      }
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }
  return undefined;
}

/**
 * Converts either flat URL filter entries (`filters[$and][0][field][$eq]: value`)
 * or a nested filter object into a sanitized Strapi Document Service filter object.
 */
export function parseFilters(rawFilters: unknown): Record<string, unknown> | undefined {
  if (!rawFilters || typeof rawFilters !== 'object' || Array.isArray(rawFilters)) {
    return undefined;
  }

  const entries = Object.entries(rawFilters as Record<string, unknown>);
  if (entries.length === 0) {
    return undefined;
  }

  const hasBracketedKeys = entries.some(([key]) => key.startsWith('filters[') || key.startsWith('filters.'));
  if (!hasBracketedKeys) {
    const sanitized = sanitizeNestedObject(rawFilters);
    return sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)
      ? (sanitized as Record<string, unknown>)
      : undefined;
  }

  const result: Record<string, unknown> = {};
  let processed = 0;
  for (const [key, value] of entries) {
    if (processed >= MAX_KEYS) {
      break;
    }
    if (typeof value !== 'string') {
      continue;
    }
    if (!key.startsWith('filters[') && !key.startsWith('filters.')) {
      continue;
    }
    assignFilterPath(result, key, value);
    processed++;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}
