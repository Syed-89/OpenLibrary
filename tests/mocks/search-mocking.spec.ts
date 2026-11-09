import { expect, Route, test } from '@playwright/test';
import mockSearchScenarios from '../../data/mock-search-scenarios.json';
import { MockBook, SearchError, searchErrorHtml, searchResultsHtml } from './search-fixtures';

const searchDocumentUrl = /^https:\/\/openlibrary\.org\/search\?q=/;

interface MockSearchScenario {
  name: string;
  query: string;
  status: number;
  books: MockBook[];
  emptyMessage: string;
  error: SearchError | null;
}

const scenarios: MockSearchScenario[] = mockSearchScenarios;

for (const scenario of scenarios) {
  test(scenario.name, async ({ page }) => {
    const interceptedRequests: { method: string; pathname: string; query: string | null }[] = [];
    const handler = async (route: Route): Promise<void> => {
      const request = route.request();
      if (!request.isNavigationRequest() || request.method() !== 'GET') {
        await route.continue();
        return;
      }

      const url = new URL(request.url());
      interceptedRequests.push({
        method: request.method(),
        pathname: url.pathname,
        query: url.searchParams.get('q'),
      });
      await route.fulfill({
        status: scenario.status,
        contentType: 'text/html; charset=utf-8',
        body: scenario.error
          ? searchErrorHtml(scenario.error)
          : searchResultsHtml(scenario.query, scenario.books, scenario.emptyMessage),
      });
    };

    await page.route(searchDocumentUrl, handler);
    try {
      await test.step('Intercept the search document and validate its configured response', async () => {
        const search = new URLSearchParams({ q: scenario.query });
        const response = await page.goto(`/search?${search.toString()}`);
        expect(interceptedRequests).toEqual([
          { method: 'GET', pathname: '/search', query: scenario.query },
        ]);
        expect(response?.status()).toBe(scenario.status);

        if (scenario.error) {
          await expect(page.getByRole('alert')).toContainText(scenario.error.title);
          await expect(page.getByText(scenario.error.message)).toBeVisible();
          return;
        }

        const cards = page.locator('.searchResultItem');
        await expect(cards).toHaveCount(scenario.books.length);
        if (scenario.books.length === 0) {
          await expect(page.getByText(scenario.emptyMessage)).toBeVisible();
          return;
        }

        for (const [index, book] of scenario.books.entries()) {
          await expect(cards.nth(index).locator('.booktitle a')).toHaveText(book.title);
          const author = cards.nth(index).locator('.bookauthor');
          if (book.author) {
            await expect(author).toContainText(book.author);
          } else {
            await expect(author).toHaveCount(0);
          }
        }
      });
    } finally {
      await page.unroute(searchDocumentUrl, handler);
    }
  });
}