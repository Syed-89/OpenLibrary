import { APIRequestContext, APIResponse } from '@playwright/test';

export interface SearchDoc {
  title?: string;
  author_name?: string[];
  key?: string;
}

export interface SearchResponse {
  numFound: number;
  docs: SearchDoc[];
}

export function validateSearchResponseSchema(value: unknown): string[] {
  const errors: string[] = [];
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return ['response must be an object'];
  }

  const response = value as Record<string, unknown>;
  if (
    typeof response.numFound !== 'number' ||
    !Number.isInteger(response.numFound) ||
    response.numFound < 0
  ) {
    errors.push('numFound must be a non-negative integer');
  }
  if (!Array.isArray(response.docs)) {
    errors.push('docs must be an array');
    return errors;
  }

  response.docs.forEach((doc: unknown, index: number) => {
    const path = `docs[${index}]`;
    if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) {
      errors.push(`${path} must be an object`);
      return;
    }

    const record = doc as Record<string, unknown>;
    if (typeof record.title !== 'string' || record.title.trim() === '') {
      errors.push(`${path}.title must be a non-empty string`);
    }
    if (record.key !== undefined && typeof record.key !== 'string') {
      errors.push(`${path}.key must be a string when present`);
    }
    if (record.author_name !== undefined) {
      if (
        !Array.isArray(record.author_name) ||
        !record.author_name.every(
          (author: unknown) => typeof author === 'string' && author.trim() !== '',
        )
      ) {
        errors.push(`${path}.author_name must be an array of non-empty strings when present`);
      }
    }
  });

  return errors;
}

export interface SearchParams {
  q: string;
  limit?: number;
  offset?: number;
}

const MIN_API_REQUEST_INTERVAL_MS = 1_000;

let apiRequestQueue: Promise<void> = Promise.resolve();
let lastApiRequestStartedAt: number | undefined;

function withApiRateLimit<T>(operation: () => Promise<T>): Promise<T> {
  const result = apiRequestQueue.then(async () => {
    if (lastApiRequestStartedAt !== undefined) {
      const elapsed = performance.now() - lastApiRequestStartedAt;
      const remaining = MIN_API_REQUEST_INTERVAL_MS - elapsed;
      if (remaining > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, remaining));
      }
    }

    lastApiRequestStartedAt = performance.now();
    return operation();
  });

  apiRequestQueue = result.then(
    () => undefined,
    () => undefined,
  );

  return result;
}

export function searchLibrary(
  request: APIRequestContext,
  params: SearchParams,
): Promise<APIResponse> {
  const queryParams: Record<string, string | number | boolean> = { q: params.q };
  if (params.limit !== undefined) queryParams.limit = params.limit;
  if (params.offset !== undefined) queryParams.offset = params.offset;

  return withApiRateLimit(() => request.get('/search.json', { params: queryParams }));
}

export function normalizeTitle(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
