/**
 * Unit tests for AI services
 */

import { AIService } from '../lib/ai-services'
import { Document } from '../lib/types'

// Mock dependencies
jest.mock('../lib/supabase', () => ({
  testSupabaseConnection: jest.fn(() => Promise.resolve(true)),
}))

jest.mock('../lib/vector-store', () => ({
  addDocumentsToVectorStore: jest.fn(() => Promise.resolve()),
  searchSimilarDocuments: jest.fn(() => Promise.resolve([
    {
      pageContent: 'Test content',
      metadata: { id: 'doc1', name: 'Test Document' },
    }
  ])),
}))

jest.mock('../lib/document-loaders', () => ({
  processDocumentsIntoChunks: jest.fn(() => Promise.resolve([
    {
      pageContent: 'Test chunk content',
      metadata: { section: 'Introduction' },
    }
  ])),
}))

jest.mock('../lib/langchain-chains', () => ({
  processQueryWithRAG: jest.fn(() => Promise.resolve('Test answer')),
}))

jest.mock('../lib/langsmith', () => ({
  isLangSmithConfigured: jest.fn(() => false),
  langsmithConfig: {
    project: 'test-project',
    tracing: false,
  },
}))

describe('AIService', () => {
  let aiService: AIService

  beforeEach(() => {
    aiService = new AIService()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await expect(aiService.healthCheck()).resolves.toBe(true)
    })

    test('should handle initialization errors gracefully', async () => {
      const { testSupabaseConnection } = require('../lib/supabase')
      testSupabaseConnection.mockRejectedValueOnce(new Error('Connection failed'))

      const newAiService = new AIService()
      await expect(newAiService.healthCheck()).resolves.toBe(false)
    })
  })

  describe('Document Processing', () => {
    const mockDocument: Document = {
      id: 'doc123',
      name: 'Test Document.pdf',
      type: 'pdf',
      size: 1024,
      uploadDate: new Date(),
      status: 'processing',
      content: 'Test document content',
      metadata: {
        pageCount: 1,
        wordCount: 10,
      },
    }

    test('should process document successfully', async () => {
      const chunks = await aiService.processDocument(mockDocument)
      
      expect(chunks).toHaveLength(1)
      expect(chunks[0].documentId).toBe('doc123')
      expect(chunks[0].content).toBe('Test chunk content')
    })

    test('should handle document processing errors', async () => {
      const { processDocumentsIntoChunks } = require('../lib/document-loaders')
      processDocumentsIntoChunks.mockRejectedValueOnce(new Error('Processing failed'))

      await expect(aiService.processDocument(mockDocument)).rejects.toThrow('Processing failed')
    })

    test('should throw error if service not initialized', async () => {
      // Create a new service without initialization
      const uninitializedService = new AIService()
      
      // Mock the initialization to fail
      const { testSupabaseConnection } = require('../lib/supabase')
      testSupabaseConnection.mockRejectedValueOnce(new Error('Init failed'))

      await expect(uninitializedService.processDocument(mockDocument)).rejects.toThrow('AI service not initialized')
    })
  })

  describe('Query Processing', () => {
    const mockQueryRequest = {
      question: 'What is this document about?',
      documentIds: ['doc123'],
      includeSources: true,
      maxResults: 5,
    }

    test('should process query successfully', async () => {
      const response = await aiService.processQuery(mockQueryRequest)
      
      expect(response.answer).toBe('Test answer')
      expect(response.sources).toHaveLength(1)
      expect(response.confidence).toBeGreaterThan(0)
      expect(response.processingTime).toBeGreaterThan(0)
      expect(response.queryId).toMatch(/^query_\d+_[a-z0-9]+$/)
    })

    test('should handle query processing errors', async () => {
      const { processQueryWithRAG } = require('../lib/langchain-chains')
      processQueryWithRAG.mockRejectedValueOnce(new Error('Query failed'))

      await expect(aiService.processQuery(mockQueryRequest)).rejects.toThrow('Query failed')
    })

    test('should calculate confidence correctly', async () => {
      const response = await aiService.processQuery(mockQueryRequest)
      
      expect(response.confidence).toBeGreaterThanOrEqual(0)
      expect(response.confidence).toBeLessThanOrEqual(1)
    })

    test('should include sources when requested', async () => {
      const response = await aiService.processQuery({
        ...mockQueryRequest,
        includeSources: true,
      })
      
      expect(response.sources).toHaveLength(1)
      expect(response.sources[0].documentName).toBe('Test Document')
    })

    test('should exclude sources when not requested', async () => {
      const response = await aiService.processQuery({
        ...mockQueryRequest,
        includeSources: false,
      })
      
      expect(response.sources).toHaveLength(0)
    })
  })

  describe('Health Check', () => {
    test('should return true when service is healthy', async () => {
      const isHealthy = await aiService.healthCheck()
      expect(isHealthy).toBe(true)
    })

    test('should return false when service is unhealthy', async () => {
      const { testSupabaseConnection } = require('../lib/supabase')
      testSupabaseConnection.mockRejectedValueOnce(new Error('Connection failed'))

      const unhealthyService = new AIService()
      const isHealthy = await unhealthyService.healthCheck()
      expect(isHealthy).toBe(false)
    })
  })
})
