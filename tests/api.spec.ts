import { expect, test } from '@playwright/test';
import searchTestData from '../data/search-test-data.json';
import {
  searchLibrary,
  SearchResponse,
  validateSearchResponseSchema,
} from './helpers/search-api';

interface ApiSearchScenario {
  name: string;
  query: string;
  limit?: number;
  minimumFound?: number;
  minimumDocs?: number;
  expectedFound?: number;
  expectedDocs?: number;
}

const apiSearchScenarios: ApiSearchScenario[] = searchTestData.api.searchScenarios;

test('Search API response conforms to the expected schema', async ({ request }) => {
  const { query, limit } = searchTestData.api.pagination;
  const response = await searchLibrary(request, { q: query, limit });
  expect(response.status()).toBe(200);

  const result: unknown = await response.json();
  expect(validateSearchResponseSchema(result)).toEqual([]);
});

for (const scenario of apiSearchScenarios) {
  test(scenario.name, async ({ request }) => {
    await test.step('Search the public catalog and validate its response', async () => {
      const response = await searchLibrary(request, {
        q: scenario.query,
        ...(scenario.limit !== undefined ? { limit: scenario.limit } : {}),
      });
      expect(response.status()).toBe(200);

      const result = (await response.json()) as SearchResponse;
      expect(typeof result.numFound).toBe('number');
      expect(Array.isArray(result.docs)).toBe(true);

      if (scenario.expectedFound !== undefined) {
        expect(result.numFound).toBe(scenario.expectedFound);
        expect(result.docs.length).toBe(scenario.expectedDocs);
      } else {
        expect(result.numFound).toBeGreaterThanOrEqual(scenario.minimumFound ?? 0);
        expect(result.docs.length).toBeGreaterThanOrEqual(scenario.minimumDocs ?? 0);
        if (scenario.limit !== undefined) {
          expect(result.docs.length).toBeLessThanOrEqual(scenario.limit);
        }

        for (const doc of result.docs.slice(0, scenario.limit)) {
          expect(typeof doc.title).toBe('string');
          expect(doc.title?.trim()).not.toBe('');
          if (doc.author_name !== undefined) {
            expect(Array.isArray(doc.author_name)).toBe(true);
            for (const author of doc.author_name) {
              expect(typeof author).toBe('string');
              expect(author.trim()).not.toBe('');
            }
          }
        }
      }
    });
  });
}

test('API pagination respects limits and does not repeat work keys', async ({ request }) => {
  const { query, limit } = searchTestData.api.pagination;

  await test.step('Fetch two consecutive pages with an explicit limit', async () => {
    const firstResponse = await searchLibrary(request, { q: query, limit, offset: 0 });
    const secondResponse = await searchLibrary(request, {
      q: query,
      limit,
      offset: limit,
    });
    expect(firstResponse.status()).toBe(200);
    expect(secondResponse.status()).toBe(200);

    const firstPage = (await firstResponse.json()) as SearchResponse;
    const secondPage = (await secondResponse.json()) as SearchResponse;

    expect(firstPage.docs.length).toBeLessThanOrEqual(limit);
    expect(secondPage.docs.length).toBeLessThanOrEqual(limit);

    const firstKeys = new Set(
      firstPage.docs.map((doc) => doc.key).filter((key): key is string => Boolean(key)),
    );
    const secondKeys = secondPage.docs
      .map((doc) => doc.key)
      .filter((key): key is string => Boolean(key));
    expect(secondKeys.some((key) => firstKeys.has(key))).toBe(false);
  });
});
