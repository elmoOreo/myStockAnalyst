import 'dotenv/config';

/**
 * Pure function to fetch news from Tavily.
 * This can be used in a web app, a CLI, or an agent.
 */
export async function fetchStockNews(ticker) {
    const queries = [
        `${ticker} stock large deal wins new contracts`,
        `${ticker} stock partnerships acquisitions mergers`,
        `${ticker} stock leadership changes layoffs restructuring`,
    ];

    const results = await Promise.all(
        queries.map(q => fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                api_key: process.env.TAVILY_API_KEY,
                query: q,
                topic: "finance",
                time_range: "m",
                search_depth: "advanced",
                max_results: 5,
            }),
        }).then(r => r.json()))
    );

    // Combine, deduplicate by URL, and sort by relevance
    const allResults = results.flatMap(r => r.results);
    const unique = [...new Map(allResults.map(r => [r.url, r])).values()];
    const sorted = unique.sort((a, b) => b.score - a.score);

    return sorted.map(r =>
        `Date: ${r.published_date || 'Recent'}\nScore: ${r.score}\nSource: ${r.title}\nContent: ${r.content}`
    ).join("\n\n");
}

export async function fetchRegulatoryNews(ticker, sector, regulatoryBodies) {
    const queries = regulatoryBodies.map(body => 
        `${body} regulations or updates affecting the ${sector} sector or ${ticker} in India`
    );

    // Add a general query just in case
    queries.push(`Indian government financial regulations for ${ticker} and the ${sector} sector`);

    const results = await Promise.all(
        queries.map(q => fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                api_key: process.env.TAVILY_API_KEY,
                query: q,
                topic: "finance",
                search_depth: "advanced",
                max_results: 3,
            }),
        }).then(r => r.json()))
    );

    const allResults = results.flatMap(r => r.results || []);
    const unique = [...new Map(allResults.map(r => [r.url, r])).values()];
    const sorted = unique.sort((a, b) => b.score - a.score);

    return sorted.map(r =>
        `Date: ${r.published_date || 'Recent'}\nScore: ${r.score}\nSource: ${r.title}\nContent: ${r.content}`
    ).join("\n\n") || "No specific regulatory news found.";
}
// Usage: fetchStockNews("AAPL"), fetchStockNews("MSFT"), etc.