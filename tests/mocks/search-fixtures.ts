export interface MockBook {
  title: string;
  workKey: string;
  author?: string;
}

export interface SearchError {
  title: string;
  message: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function searchResultsHtml(
  query: string,
  books: MockBook[],
  emptyMessage: string,
): string {
  const cards = books
    .map(
      ({ title, workKey, author }) => `
        <li class="searchResultItem sri--w-main" itemscope itemtype="https://schema.org/Book">
          <div class="sri__main">
            <div class="details">
              <div class="resultTitle">
                <h3 class="booktitle"><a class="results" href="${escapeHtml(workKey)}">${escapeHtml(title)}</a></h3>
                ${author ? `<span class="bookauthor">by <a href="/authors/OL1A">${escapeHtml(author)}</a></span>` : ''}
              </div>
            </div>
          </div>
        </li>`,
    )
    .join('');
  const escapedQuery = escapeHtml(query);

  return `<!doctype html>
    <html lang="en">
      <head><meta charset="utf-8"><title>search | Open Library</title></head>
      <body>
        <form action="/search" method="get">
          <label for="search">Search</label>
          <input id="search" name="q" type="search" value="${escapedQuery}">
          <button type="submit">Search</button>
        </form>
        <main id="test-body-mobile">
          <h1>Search Books</h1>
          ${books.length
            ? `<ul class="searchResults">${cards}</ul>`
            : `<p>${escapeHtml(emptyMessage)}</p>`}
        </main>
      </body>
    </html>`;
}

export function searchErrorHtml(error: SearchError): string {
  return `<!doctype html>
    <html lang="en">
      <head><meta charset="utf-8"><title>Open Library error</title></head>
      <body>
        <main id="test-body-mobile">
          <div role="alert">
            <h1>${escapeHtml(error.title)}</h1>
            <p>${escapeHtml(error.message)}</p>
          </div>
        </main>
      </body>
    </html>`;
}
