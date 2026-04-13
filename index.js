import 'dotenv/config';
import crypto from 'crypto';
import { app } from './workflow.js';
import { ensureLogDirectory, initializeLogFile, logMessage } from './logger.js';
import { connectToDb, closeDbConnection, saveAnalystRun } from './db.js';

// --- EXECUTION ---
async function main() {
    try {
        await ensureLogDirectory();
        const logFilePath = await initializeLogFile();
        await logMessage(logFilePath, "Main", "Application started.");

        await connectToDb();

        const threadId = crypto.randomUUID();
        console.log(`Starting run with thread ID: ${threadId}`);
        await logMessage(logFilePath, "Main", `Starting run with thread ID: ${threadId}`);

        const portfolio = ["RELIANCE", "TCS", "NAZARA"];
        console.log(`Analyzing portfolio: ${portfolio.join(', ')}`);
        await logMessage(logFilePath, "Main", `Analyzing portfolio: ${portfolio.join(', ')}`);

        const output = await app.invoke({ tickers: portfolio, logFilePath: logFilePath, threadId: threadId });

        console.log("\nDAILY SENTIMENT ANALYSIS");
        console.table(output.finalReport);
        await logMessage(logFilePath, "Main", "DAILY SENTIMENT ANALYSIS completed.");
        await logMessage(logFilePath, "Main", `Final Report:\n${JSON.stringify(output.finalReport, null, 2)}`);
        await saveAnalystRun(threadId, output.finalReport);
        await logMessage(logFilePath, "Main", "Application finished.");
    } finally {
        await closeDbConnection();
    }
}

main();