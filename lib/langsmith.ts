/**
 * LangSmith Configuration
 * Provides observability and debugging for LangChain applications
 */

import { Client } from 'langsmith';

// LangSmith configuration
export const langsmithConfig = {
  apiKey: process.env.LANGCHAIN_API_KEY,
  endpoint: process.env.LANGCHAIN_ENDPOINT || 'https://api.smith.langchain.com',
  project: process.env.LANGCHAIN_PROJECT || 'document-assistant-ai',
  tracing: process.env.LANGCHAIN_TRACING_V2 === 'true',
};

// Initialize LangSmith client
export const langsmithClient = new Client({
  apiKey: langsmithConfig.apiKey,
  apiUrl: langsmithConfig.endpoint,
});

// Helper function to check if LangSmith is properly configured
export function isLangSmithConfigured(): boolean {
  return !!(
    langsmithConfig.apiKey &&
    langsmithConfig.tracing &&
    langsmithConfig.project
  );
}

// Helper function to get project info
export function getProjectInfo() {
  return {
    project: langsmithConfig.project,
    endpoint: langsmithConfig.endpoint,
    tracing: langsmithConfig.tracing,
    configured: isLangSmithConfigured(),
  };
}

// Export configuration for use in other modules
export default langsmithConfig;
