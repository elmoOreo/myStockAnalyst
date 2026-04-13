import { ChatOllama } from "@langchain/ollama";

export const llm = new ChatOllama({
    model: "gemma4:e2b",
    baseUrl: "http://localhost:11434",
    temperature: 0
});

// --- DATABASE CONFIG ---
export const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
export const DB_NAME = 'myStockAnalyst';
export const CHECKPOINTER_COLLECTION = 'checkpointer';
export const ANALYST_RUNS_COLLECTION = 'analystruns';