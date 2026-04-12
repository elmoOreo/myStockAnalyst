import 'dotenv/config';
import { app } from './workflow.js';
import { ensureLogDirectory, initializeLogFile, logMessage } from './logger.js';

// --- EXECUTION ---
async function main() {
    await ensureLogDirectory();
    const logFilePath = await initializeLogFile();
    await logMessage(logFilePath, "Main", "Application started.");

    const portfolio = ["RELIANCE", "TCS", "NAZARA"];
    console.log(`Analyzing portfolio: ${portfolio.join(', ')}`);
    await logMessage(logFilePath, "Main", `Analyzing portfolio: ${portfolio.join(', ')}`);

    const output = await app.invoke({ tickers: portfolio, logFilePath: logFilePath });

    console.log("\nDAILY SENTIMENT ANALYSIS");
    console.table(output.finalReport);
    await logMessage(logFilePath, "Main", "DAILY SENTIMENT ANALYSIS completed.");
    await logMessage(logFilePath, "Main", `Final Report:\n${JSON.stringify(output.finalReport, null, 2)}`);
    await logMessage(logFilePath, "Main", "Application finished.");
}

main();