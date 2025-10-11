/**
 * Unit tests for LangSmith integration
 */

import { langsmithConfig, isLangSmithConfigured, getProjectInfo } from '../lib/langsmith'

// Mock environment variables
const originalEnv = process.env

describe('LangSmith Integration', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Configuration', () => {
    test('should detect LangSmith as configured when all env vars are present', () => {
      process.env.LANGCHAIN_TRACING_V2 = 'true'
      process.env.LANGCHAIN_API_KEY = 'test-api-key'
      process.env.LANGCHAIN_PROJECT = 'test-project'
      process.env.LANGCHAIN_ENDPOINT = 'https://api.smith.langchain.com'

      expect(isLangSmithConfigured()).toBe(true)
    })

    test('should detect LangSmith as not configured when env vars are missing', () => {
      delete process.env.LANGCHAIN_TRACING_V2
      delete process.env.LANGCHAIN_API_KEY
      delete process.env.LANGCHAIN_PROJECT

      expect(isLangSmithConfigured()).toBe(false)
    })

    test('should detect LangSmith as not configured when tracing is disabled', () => {
      process.env.LANGCHAIN_TRACING_V2 = 'false'
      process.env.LANGCHAIN_API_KEY = 'test-api-key'
      process.env.LANGCHAIN_PROJECT = 'test-project'

      expect(isLangSmithConfigured()).toBe(false)
    })

    test('should use default endpoint when not specified', () => {
      process.env.LANGCHAIN_TRACING_V2 = 'true'
      process.env.LANGCHAIN_API_KEY = 'test-api-key'
      process.env.LANGCHAIN_PROJECT = 'test-project'
      delete process.env.LANGCHAIN_ENDPOINT

      const config = langsmithConfig
      expect(config.endpoint).toBe('https://api.smith.langchain.com')
    })

    test('should use custom endpoint when specified', () => {
      process.env.LANGCHAIN_TRACING_V2 = 'true'
      process.env.LANGCHAIN_API_KEY = 'test-api-key'
      process.env.LANGCHAIN_PROJECT = 'test-project'
      process.env.LANGCHAIN_ENDPOINT = 'https://custom-endpoint.com'

      const config = langsmithConfig
      expect(config.endpoint).toBe('https://custom-endpoint.com')
    })
  })

  describe('Project Info', () => {
    test('should return correct project info when configured', () => {
      process.env.LANGCHAIN_TRACING_V2 = 'true'
      process.env.LANGCHAIN_API_KEY = 'test-api-key'
      process.env.LANGCHAIN_PROJECT = 'my-project'
      process.env.LANGCHAIN_ENDPOINT = 'https://api.smith.langchain.com'

      const projectInfo = getProjectInfo()
      
      expect(projectInfo.project).toBe('my-project')
      expect(projectInfo.endpoint).toBe('https://api.smith.langchain.com')
      expect(projectInfo.tracing).toBe(true)
      expect(projectInfo.configured).toBe(true)
    })

    test('should return correct project info when not configured', () => {
      delete process.env.LANGCHAIN_TRACING_V2
      delete process.env.LANGCHAIN_API_KEY
      delete process.env.LANGCHAIN_PROJECT

      const projectInfo = getProjectInfo()
      
      expect(projectInfo.project).toBe('document-assistant-ai')
      expect(projectInfo.endpoint).toBe('https://api.smith.langchain.com')
      expect(projectInfo.tracing).toBe(false)
      expect(projectInfo.configured).toBe(false)
    })
  })

  describe('Client Initialization', () => {
    test('should initialize client with correct configuration', () => {
      process.env.LANGCHAIN_TRACING_V2 = 'true'
      process.env.LANGCHAIN_API_KEY = 'test-api-key'
      process.env.LANGCHAIN_PROJECT = 'test-project'
      process.env.LANGCHAIN_ENDPOINT = 'https://api.smith.langchain.com'

      // Re-import to get fresh instance
      const { langsmithClient } = require('../lib/langsmith')
      
      expect(langsmithClient).toBeDefined()
    })

    test('should handle missing API key gracefully', () => {
      process.env.LANGCHAIN_TRACING_V2 = 'true'
      delete process.env.LANGCHAIN_API_KEY
      process.env.LANGCHAIN_PROJECT = 'test-project'

      expect(() => {
        require('../lib/langsmith')
      }).toThrow('Missing LangSmith environment variables')
    })
  })
})
