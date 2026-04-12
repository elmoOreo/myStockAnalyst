import { z } from "zod";

export const SentimentSchema = z.object({
    ticker: z.string(),
    sentiment: z.enum(["Bullish", "Neutral", "Bearish"]),
    score: z.number(),
    reasoning: z.string()
});

export const SectorSchema = z.object({
    ticker: z.string(),
    sector: z.string(),
});

export const RegulatoryBodySchema = z.object({
    ticker: z.string(),
    sector: z.string(),
    regulatory_bodies: z.array(z.string()).max(5),
});

export const GraphState = {
    channels: {
        tickers: null,
        newsData: null,
        regulatoryData: null,
        sectorData: null,
        regulatoryBodiesData: null,
        logFilePath: null, // Added to carry the log file path
        finalReport: {
            // Appends new reports to the list instead of overwriting
            value: (x, y) => (y ? x.concat(y) : x),
            default: () => [],
        },
    },
};