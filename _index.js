import 'dotenv/config';
import { StateGraph, START, END } from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";
import { Tool } from "@langchain/core/tools";
import { z } from "zod";

// --- 1. CUSTOM TOOL: TAVILY RESEARCHER (Core-Only) ---
// This avoids the @langchain/community dependency entirely.
class CustomTavilySearch extends Tool {
  name = "tavily_search";
  description = "Searches the web for stock news.";

  async _call(query) {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: query,
        search_depth: "basic",
        max_results: 3,
      }),
    });
    const data = await response.json();
    return data.results.map(r => `Source: ${r.title}\nContent: ${r.content}`).join("\n\n");
  }
}

// --- 2. SCHEMAS & CONFIGURATION ---
const SentimentSchema = z.object({
  ticker: z.string(),
  sentiment: z.enum(["Bullish", "Neutral", "Bearish"]),
  score: z.number(),
  reasoning: z.string()
});

const llm = new ChatOllama({ 
  model: "gemma4:e2b", 
  baseUrl: "http://localhost:11434",
  temperature: 0 
});

const searchTool = new CustomTavilySearch();

// --- 3. STATE DEFINITION ---
const GraphState = {
  channels: {
    tickers: null,
    newsData: null,
    finalReport: {
      value: (x, y) => (y ? x.concat(y) : x),
      default: () => [],
    },
  },
};

// --- 4. AGENT NODES ---

const researcherAgent = async (state) => {
  console.log(`\n[Agent: Researcher] Fetching news for: ${state.tickers.join(", ")}`);
  const results = [];
  for (const ticker of state.tickers) {
    const news = await searchTool.invoke(`${ticker} stock news last 1 month`);
    results.push({ ticker, content: news });
  }
  return { newsData: results };
};

const analystAgent = async (state) => {
  console.log("[Agent: Analyst] Evaluating sentiment with Gemma 4...");
  const reports = [];

  for (const item of state.newsData) {
    const prompt = `
      Analyze the stock sentiment for ${item.ticker} based on this news:
      "${item.content}"

      Return ONLY a JSON object:
      {
        "ticker": "${item.ticker}",
        "sentiment": "Bullish" | "Neutral" | "Bearish",
        "score": number between -1 and 1,
        "reasoning": "one sentence explanation"
      }
    `;

    const res = await llm.invoke(prompt);
    
    try {
      // Robust JSON extraction using Regex
      const jsonMatch = res.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        reports.push(parsed);
      }
    } catch (e) {
      console.error(`Failed to parse ${item.ticker}`);
    }
  }
  return { finalReport: reports };
};

// --- 5. GRAPH ORCHESTRATION ---
const workflow = new StateGraph(GraphState)
  .addNode("researcher", researcherAgent)
  .addNode("analyst", analystAgent)
  .addEdge(START, "researcher")
  .addEdge("researcher", "analyst")
  .addEdge("analyst", END);

const app = workflow.compile();

// --- 6. RUNTIME ---
const myPortfolio = ["RELIANCE", "TCS"];
const output = await app.invoke({ tickers: myPortfolio });

console.log("\n================ DAILY SENTIMENT REPORT ================");
console.table(output.finalReport);