import { StateGraph, START, END } from "@langchain/langgraph";
import { GraphState } from './schemas.js';
import { researcherAgent, sectorAgent, regulatoryBodyAgent, regulationAgent, analystAgent } from './agents.js';

// --- GRAPH CONSTRUCTION ---
const workflow = new StateGraph(GraphState)
    .addNode("researcher", researcherAgent)
    .addNode("sectorAgent", sectorAgent)
    .addNode("regulatoryBodyAgent", regulatoryBodyAgent)
    .addNode("regulationAgent", regulationAgent)
    .addNode("analyst", analystAgent);

// The researcher and sector agents can run in parallel
workflow.addEdge(START, "researcher");
workflow.addEdge(START, "sectorAgent");

// The regulatoryBodyAgent depends on the sector agent's output
workflow.addEdge("sectorAgent", "regulatoryBodyAgent");

// The regulation agent depends on the regulatoryBodyAgent's output
workflow.addEdge("regulatoryBodyAgent", "regulationAgent");

// The analyst agent needs data from both the researcher and regulation agents
workflow.addEdge(["researcher", "regulationAgent"], "analyst");

workflow.addEdge("analyst", END);

export const app = workflow.compile();