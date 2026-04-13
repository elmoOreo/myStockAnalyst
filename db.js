import { MongoClient } from 'mongodb';
import {
    MONGO_URL,
    DB_NAME,
    CHECKPOINTER_COLLECTION,
    ANALYST_RUNS_COLLECTION
} from './config.js';

let client;
let db;

/**
 * Connects to the MongoDB database.
 */
export async function connectToDb() {
    if (db) {
        return;
    }
    try {
        client = new MongoClient(MONGO_URL);
        await client.connect();
        db = client.db(DB_NAME);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Failed to connect to MongoDB', error);
        throw error;
    }
}

/**
 * Closes the MongoDB connection.
 */
export async function closeDbConnection() {
    if (client) {
        await client.close();
        client = null;
        db = null;
        console.log('MongoDB connection closed');
    }
}

/**
 * Logs an agent run to the checkpointer collection.
 * @param {string} threadId - The unique ID for the entire workflow run.
 * @param {string} agentName - The name of the agent.
 * @param {any} prompt - The prompt or input for the agent's action.
 * @param {any} output - The output of the agent's action.
 */
export async function logAgentRun(threadId, agentName, prompt, output) {
    if (!db) {
        console.error('Database not connected. Cannot log agent run.');
        return;
    }
    try {
        const collection = db.collection(CHECKPOINTER_COLLECTION);
        await collection.insertOne({
            threadId,
            agentName,
            prompt,
            output,
            timestamp: new Date(),
        });
    } catch (error) {
        console.error(`Failed to log agent run for ${agentName}:`, error);
    }
}

/**
 * Saves the final analyst report to the analystruns collection.
 * @param {string} threadId - The unique ID for the entire workflow run.
 * @param {any} finalReport - The final report from the analyst agent.
 */
export async function saveAnalystRun(threadId, finalReport) {
    if (!db) {
        console.error('Database not connected. Cannot save analyst run.');
        return;
    }
    try {
        const collection = db.collection(ANALYST_RUNS_COLLECTION);
        await collection.insertOne({
            threadId,
            finalReport,
            timestamp: new Date(),
        });
        console.log(`Final analyst run for thread ${threadId} saved to MongoDB.`);
    } catch (error) {
        console.error(`Failed to save analyst run for thread ${threadId}:`, error);
    }
}