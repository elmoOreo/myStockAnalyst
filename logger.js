import fs from 'fs/promises';
import path from 'path';

const LOG_DIR = 'log';

/**
 * Ensures the log directory exists.
 */
async function ensureLogDirectory() {
    try {
        await fs.mkdir(LOG_DIR, { recursive: true });
    } catch (error) {
        console.error(`Failed to create log directory ${LOG_DIR}:`, error);
        throw error;
    }
}

/**
 * Initializes a new log file with a timestamp in its name.
 * @returns {Promise<string>} The path to the newly created log file.
 */
async function initializeLogFile() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFileName = `run-${timestamp}.txt`;
    const logFilePath = path.join(LOG_DIR, logFileName);
    await fs.writeFile(logFilePath, `--- Log started at ${new Date().toISOString()} ---\n\n`);
    return logFilePath;
}

/**
 * Appends a timestamped message to the specified log file.
 * @param {string} logFilePath - The path to the log file.
 * @param {string} agentName - The name of the agent logging the message.
 * @param {string} message - The message to log.
 */
async function logMessage(logFilePath, agentName, message) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${agentName}] ${message}\n`;
    try {
        await fs.appendFile(logFilePath, formattedMessage);
    } catch (error) {
        console.error(`Failed to write to log file ${logFilePath}:`, error);
    }
}

export { ensureLogDirectory, initializeLogFile, logMessage };