import { ChatOllama } from "@langchain/ollama";

export const llm = new ChatOllama({ 
    model: "gemma4:e2b", 
    baseUrl: "http://localhost:11434",
    temperature: 0 
});