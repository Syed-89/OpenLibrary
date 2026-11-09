import { expect, test } from '@playwright/test';
import searchTestData from '../data/search-test-data.json';
import { normalizeTitle, searchLibrary, SearchResponse } from './helpers/search-api';
import { SearchPage } from './pages/search-page';

test('search results show book details and preserve context after opening a result', async ({
  page,
}) => {
  const { query, minimumResultCount, resultSampleCount } = searchTestData.ui;
  const search = new SearchPage(page);

  await test.step('Search for the configured title and validate result records', async () => {
    await search.open(query);
    await expect(search.results.first()).toBeVisible();
    expect(await search.results.count()).toBeGreaterThanOrEqual(minimumResultCount);

    for (let index = 0; index < resultSampleCount; index += 1) {
      const title = (await search.resultTitle(index).innerText()).trim();
      expect(title, `result ${index + 1} should have a title`).not.toBe('');

      const author = search.resultAuthor(index);
      if ((await author.count()) > 0) {
        expect((await author.innerText()).trim()).not.toBe('');
      }
    }
  });

  await test.step('Open the first result and return to the search results', async () => {
    const firstTitle = (await search.resultTitle(0).innerText()).trim();
    await Promise.all([
      page.waitForURL(/\/(?:works\/|verify_human(?:\?|$))/),
      search.resultTitle(0).click(),
    ]);

    const currentPath = new URL(page.url()).pathname;
    if (currentPath === '/verify_human') {
      test.info().annotations.push({
        type: 'note',
        description: 'Open Library required human verification before serving the work details.',
      });
      await expect(page.getByRole('heading', { name: 'Human Verification' })).toBeVisible();
    } else {
      expect(currentPath).toMatch(/^\/works\//);
      const detailTitle = page.locator('h1').filter({ hasText: firstTitle }).first();
      await expect(detailTitle).toBeVisible();
      expect(normalizeTitle(await detailTitle.innerText())).toBe(normalizeTitle(firstTitle));
    }

    await page.goBack({ waitUntil: 'commit', timeout: 15_000 });
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(query);
    await expect(search.resultTitle(0)).toHaveText(firstTitle);
  });
});

test('API titles can be matched to visible UI results within a bounded sample', async ({
  page,
  request,
}) => {
  const { query, apiSampleLimit, uiComparisonLimit } = searchTestData.ui;

  await test.step('Compare a bounded API sample with the server-rendered UI', async () => {
    const response = await searchLibrary(request, { q: query, limit: apiSampleLimit });
    expect(response.status()).toBe(200);
    const apiResult = (await response.json()) as SearchResponse;
    const apiTitles = apiResult.docs
      .map((doc) => doc.title)
      .filter((title): title is string => Boolean(title?.trim()))
      .map(normalizeTitle);

    const search = new SearchPage(page);
    await search.open(query);
    await expect(search.results.first()).toBeVisible();
    const uiTitles = (await search.results.locator('.booktitle a').allTextContents())
      .slice(0, uiComparisonLimit)
      .map(normalizeTitle);

    expect(apiTitles.length).toBeGreaterThan(0);
    expect(uiTitles.length).toBeGreaterThan(0);
    expect(uiTitles.some((title) => apiTitles.includes(title))).toBe(true);
  });
});
