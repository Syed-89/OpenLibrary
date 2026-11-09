Open Library Search - Test Plan

1. Objective
Verify the Open Library search page and API, including search results, pagination, navigation, and UI handling of empty responses and server errors.

2. Supported Routes
•	/search?q=The+Hobbit - Search page.
•	/search.json?q=The+Hobbit - Search API.
•	/search.json with query, limit, and offset parameters - Empty-query and pagination testing.
•	Book work pages linked from search results - Navigation testing.

3. Test Coverage
•	Search UI: Verify result count, book titles, optional author names, and preservation of the search query after navigation.
•	Search API: Validate response status, result data, and pagination. Check that work keys do not repeat across pages when provided.
•	UI response handling: Mock successful results, missing author information, empty results, and HTTP 500 responses.
•	Navigation: Open a book from search results and return to the search page.

4. Test Assumptions
•	Open Library is accessible during live testing.
•	Author information is optional.
•	Search results and ranking may change over time.
•	Mocked responses are used to test UI behavior independently of live search results.

5. Limitations
•	Live tests may be interrupted by service outages or human verification.
•	UI assertions depend on the current search-result markup.
•	Exact result ordering is not guaranteed.
•	Only Chromium is covered by the current Playwright configuration.

6. Expected Outcome
Search results, API responses, pagination, and navigation work as expected. The UI handles missing data, empty results, and server errors gracefully.

7. Test Data
Live search queries, limits, and expected result sizes are maintained in
`data/search-test-data.json`. Mocked response scenarios and their sample book
records are maintained in `data/mock-search-scenarios.json`. The Playwright
test scripts load these files to define and validate the test cases.
