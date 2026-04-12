import { fetchStockNews, fetchRegulatoryNews } from './tools.js';
import { llm } from './config.js';
import { SentimentSchema, SectorSchema, RegulatoryBodySchema } from './schemas.js';
import { logMessage } from './logger.js';

export const researcherAgent = async (state) => {
    await logMessage(state.logFilePath, "Researcher", `Starting for tickers: ${state.tickers.join(", ")}`);
    console.log(`\n[Researcher] Fetching news for: ${state.tickers.join(", ")}`);
    const results = [];
    
    for (const ticker of state.tickers) {
        // Calling our independent function directly
        const news = await fetchStockNews(ticker);
        await logMessage(state.logFilePath, "Researcher", `Fetched news for ${ticker}: ${news.substring(0, 100)}...`);
        results.push({ ticker, content: news });
    }
    
    await logMessage(state.logFilePath, "Researcher", `Intermediate news data collected:\n${JSON.stringify(results, null, 2)}`);
    await logMessage(state.logFilePath, "Researcher", `Finished. Found news for ${results.length} tickers.`);
    return { newsData: results };
};

export const sectorAgent = async (state) => {
    await logMessage(state.logFilePath, "SectorAgent", `Starting to identify sectors for: ${state.tickers.join(", ")}`);
    console.log(`\n[SectorAgent] Identifying sectors for: ${state.tickers.join(", ")}`);
    const results = [];

    for (const ticker of state.tickers) {
        const prompt = `What is the primary business sector for the company with stock ticker "${ticker}"? Return ONLY a JSON object with the following schema: {"ticker": "${ticker}", "sector": "sector name"}`;
        
        const res = await llm.invoke(prompt);
        
        try {
            const jsonMatch = res.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                const validated = SectorSchema.parse(parsed);
                await logMessage(state.logFilePath, "SectorAgent", `Identified sector for ${validated.ticker}: ${validated.sector}`);
                results.push(validated);
            }
        } catch (e) {
            console.error(`Sector identification failed for ${ticker}:`, e.message);
            await logMessage(state.logFilePath, "SectorAgent", `Sector identification failed for ${ticker}: ${e.message}`);
        }
    }

    await logMessage(state.logFilePath, "SectorAgent", `Intermediate sector data collected:\n${JSON.stringify(results, null, 2)}`);
    await logMessage(state.logFilePath, "SectorAgent", `Finished. Identified sectors for ${results.length} tickers.`);
    return { sectorData: results };
};

export const regulatoryBodyAgent = async (state) => {
    await logMessage(state.logFilePath, "RegulatoryBodyAgent", `Starting to identify regulatory bodies for sectors.`);
    console.log(`\n[RegulatoryBodyAgent] Identifying regulatory bodies...`);
    const results = [];

    for (const item of state.sectorData) {
        const { ticker, sector } = item;
        const prompt = `
            For the "${sector}" sector in India, identify the top 5 most critical government regulatory bodies.
            Return ONLY a JSON object with the following schema: {"ticker": "${ticker}", "sector": "${sector}", "regulatory_bodies": ["Body 1", "Body 2", "Body 3", "Body 4", "Body 5"]}
        `;
        
        const res = await llm.invoke(prompt);
        
        try {
            const jsonMatch = res.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                const validated = RegulatoryBodySchema.parse(parsed);
                await logMessage(state.logFilePath, "RegulatoryBodyAgent", `Identified bodies for ${validated.ticker} (${validated.sector}): ${validated.regulatory_bodies.join(', ')}`);
                results.push(validated);
            }
        } catch (e) {
            console.error(`Regulatory body identification failed for ${ticker}:`, e.message);
            await logMessage(state.logFilePath, "RegulatoryBodyAgent", `Regulatory body identification failed for ${ticker}: ${e.message}`);
        }
    }

    await logMessage(state.logFilePath, "RegulatoryBodyAgent", `Intermediate regulatory bodies data collected:\n${JSON.stringify(results, null, 2)}`);
    await logMessage(state.logFilePath, "RegulatoryBodyAgent", `Finished. Identified regulatory bodies for ${results.length} tickers.`);
    return { regulatoryBodiesData: results };
};

export const regulationAgent = async (state) => {
    await logMessage(state.logFilePath, "RegulationAgent", `Starting for tickers: ${state.regulatoryBodiesData.map(s => s.ticker).join(", ")}`);
    console.log(`\n[RegulationAgent] Fetching regulatory news for: ${state.regulatoryBodiesData.map(s => s.ticker).join(", ")}`);
    const results = [];
    
    for (const item of state.regulatoryBodiesData) {
        const { ticker, sector, regulatory_bodies } = item;
        // Calling our independent function directly
        const news = await fetchRegulatoryNews(ticker, sector, regulatory_bodies);
        await logMessage(state.logFilePath, "RegulationAgent", `Fetched regulatory news for ${ticker} (Sector: ${sector}) using bodies: ${regulatory_bodies.join(', ')}: ${news.substring(0, 100)}...`);
        results.push({ ticker, content: news });
    }
    
    await logMessage(state.logFilePath, "RegulationAgent", `Intermediate regulatory news data collected:\n${JSON.stringify(results, null, 2)}`);
    await logMessage(state.logFilePath, "RegulationAgent", `Finished. Found regulatory news for ${results.length} tickers.`);
    return { regulatoryData: results };
};

export const analystAgent = async (state) => {
    // Defensive checks to ensure state properties are arrays
    const newsData = state.newsData || [];
    const regulatoryData = state.regulatoryData || [];
    const sectorData = state.sectorData || [];
    const regulatoryBodiesData = state.regulatoryBodiesData || [];
    const tickers = state.tickers || [];

    if (!state.regulatoryData) {
        await logMessage(state.logFilePath, "Analyst", "Warning: `regulatoryData` was not available in the state. Analysis may be incomplete.");
    }

    await logMessage(state.logFilePath, "Analyst", `Starting. Processing ${newsData.length} news items and ${regulatoryData.length} regulatory items for ${tickers.length} tickers.`);
    console.log("[Analyst] Processing sentiment with Gemma 4...");
    const reports = [];

    for (const item of newsData) {
        const regulatoryItem = regulatoryData.find(r => r.ticker === item.ticker);
        const regulatoryContent = regulatoryItem ? regulatoryItem.content : "No regulatory information provided.";

        const sectorItem = sectorData.find(s => s.ticker === item.ticker);
        const sector = sectorItem ? sectorItem.sector : "Unknown";

        const regulatoryBodiesItem = regulatoryBodiesData.find(b => b.ticker === item.ticker);
        const regulatoryBodiesText = regulatoryBodiesItem ? regulatoryBodiesItem.regulatory_bodies.join(', ') : "relevant bodies";

        const prompt = `
            Analyze the stock sentiment for ${item.ticker} (Sector: ${sector}) based on the following information.
            
            General News: "${item.content}"

            Regulatory News from bodies like ${regulatoryBodiesText} for the ${sector} sector: "${regulatoryContent}"

            Return ONLY a JSON object with the following schema: {"ticker": "${item.ticker}", "sentiment": "Bullish"|"Neutral"|"Bearish", "score": number, "reasoning": "string explanation considering both general and regulatory news"}
        `;

        const res = await llm.invoke(prompt);
        
        try {
            const jsonMatch = res.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);

                // --- THE ENFORCEMENT STEP ---
                // This validates 'parsed' against your Zod definition.
                // It will strip extra fields and throw an error if types are wrong.
                const validated = SentimentSchema.parse(parsed);
                
                await logMessage(state.logFilePath, "Analyst", `Validated sentiment for ${validated.ticker}: ${validated.sentiment}`);
                reports.push(validated);
            }
        } catch (e) {
            // If Gemma 4 returns "Maybe Bullish" instead of "Bullish",
            // Zod throws an error and we catch it here.
            console.error(`Validation failed for ${item.ticker}:`, e.message);
            await logMessage(state.logFilePath, "Analyst", `Validation failed for ${item.ticker}: ${e.message}`);
        }
    }
    await logMessage(state.logFilePath, "Analyst", `Intermediate sentiment reports generated:\n${JSON.stringify(reports, null, 2)}`);
    await logMessage(state.logFilePath, "Analyst", `Finished. Generated ${reports.length} sentiment reports.`);
    return { finalReport: reports };
};