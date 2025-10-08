/**
 * Unit tests for utility functions
 */

import {
  validateFileType,
  validateFileSize,
  formatFileSize,
  generateDocumentId,
  generateQueryId,
  extractFileMetadata,
  getDocumentTypeFromFile,
  sanitizeFilename,
  formatDate,
  calculateReadingTime,
  truncateText,
  highlightText,
  debounce,
  retryWithBackoff,
  isValidEmail,
  getDocumentTypeColor,
  getDocumentTypeIcon,
  getStatusColor,
  getStatusIcon,
  validateQuery,
  extractKeywords,
  calculateSimilarity,
} from '../lib/utils'

describe('Utility Functions', () => {
  describe('File Validation', () => {
    test('validateFileType should return true for allowed file types', () => {
      const mockFile = { name: 'test.pdf' } as File
      const allowedTypes = ['pdf', 'txt', 'docx', 'md']
      
      expect(validateFileType(mockFile, allowedTypes)).toBe(true)
    })

    test('validateFileType should return false for disallowed file types', () => {
      const mockFile = { name: 'test.jpg' } as File
      const allowedTypes = ['pdf', 'txt', 'docx', 'md']
      
      expect(validateFileType(mockFile, allowedTypes)).toBe(false)
    })

    test('validateFileSize should return true for files within size limit', () => {
      const mockFile = { size: 1024 } as File
      const maxSize = 2048
      
      expect(validateFileSize(mockFile, maxSize)).toBe(true)
    })

    test('validateFileSize should return false for files exceeding size limit', () => {
      const mockFile = { size: 2048 } as File
      const maxSize = 1024
      
      expect(validateFileSize(mockFile, maxSize)).toBe(false)
    })
  })

  describe('File Size Formatting', () => {
    test('formatFileSize should format bytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB')
      expect(formatFileSize(1048576)).toBe('1.0 MB')
      expect(formatFileSize(1073741824)).toBe('1.0 GB')
    })

    test('formatFileSize should handle small sizes', () => {
      expect(formatFileSize(512)).toBe('512.0 B')
      expect(formatFileSize(0)).toBe('0.0 B')
    })
  })

  describe('ID Generation', () => {
    test('generateDocumentId should generate unique IDs', () => {
      const id1 = generateDocumentId()
      const id2 = generateDocumentId()
      
      expect(id1).toMatch(/^doc_\d+_[a-z0-9]+$/)
      expect(id2).toMatch(/^doc_\d+_[a-z0-9]+$/)
      expect(id1).not.toBe(id2)
    })

    test('generateQueryId should generate unique IDs', () => {
      const id1 = generateQueryId()
      const id2 = generateQueryId()
      
      expect(id1).toMatch(/^query_\d+_[a-z0-9]+$/)
      expect(id2).toMatch(/^query_\d+_[a-z0-9]+$/)
      expect(id1).not.toBe(id2)
    })
  })

  describe('File Metadata', () => {
    test('extractFileMetadata should extract correct metadata', () => {
      const mockFile = {
        name: 'test-document.pdf',
        lastModified: 1234567890000,
      } as File
      
      const metadata = extractFileMetadata(mockFile)
      
      expect(metadata.title).toBe('test-document')
      expect(metadata.createdAt).toEqual(new Date(1234567890000))
      expect(metadata.modifiedAt).toEqual(new Date(1234567890000))
    })

    test('getDocumentTypeFromFile should return correct type', () => {
      const pdfFile = { name: 'test.pdf' } as File
      const txtFile = { name: 'test.txt' } as File
      const invalidFile = { name: 'test.jpg' } as File
      
      expect(getDocumentTypeFromFile(pdfFile)).toBe('pdf')
      expect(getDocumentTypeFromFile(txtFile)).toBe('txt')
      expect(getDocumentTypeFromFile(invalidFile)).toBe(null)
    })
  })

  describe('Text Processing', () => {
    test('sanitizeFilename should sanitize filenames', () => {
      expect(sanitizeFilename('test file.pdf')).toBe('test_file.pdf')
      expect(sanitizeFilename('test@#$file.pdf')).toBe('test___file.pdf')
      expect(sanitizeFilename('  test  .pdf  ')).toBe('test.pdf')
    })

    test('formatDate should format dates correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const formatted = formatDate(date)
      
      expect(formatted).toContain('Jan')
      expect(formatted).toContain('15')
      expect(formatted).toContain('2024')
    })

    test('calculateReadingTime should calculate reading time', () => {
      const shortText = 'This is a short text.'
      const longText = 'word '.repeat(500) // 500 words
      
      expect(calculateReadingTime(shortText)).toBe(1)
      expect(calculateReadingTime(longText)).toBe(3) // 500/200 = 2.5, rounded up to 3
    })

    test('truncateText should truncate long text', () => {
      const longText = 'This is a very long text that should be truncated.'
      const truncated = truncateText(longText, 20)
      
      expect(truncated).toBe('This is a very lo...')
      expect(truncated.length).toBeLessThanOrEqual(23) // 20 + '...'
    })

    test('highlightText should highlight search terms', () => {
      const text = 'This is a test text with test words.'
      const highlighted = highlightText(text, 'test')
      
      expect(highlighted).toContain('<mark')
      expect(highlighted).toContain('test')
    })
  })

  describe('Validation', () => {
    test('validateQuery should validate queries correctly', () => {
      expect(validateQuery('')).toEqual({ isValid: false, error: 'Query cannot be empty' })
      expect(validateQuery('   ')).toEqual({ isValid: false, error: 'Query cannot be empty' })
      expect(validateQuery('a'.repeat(1001))).toEqual({ isValid: false, error: 'Query is too long (max 1000 characters)' })
      expect(validateQuery('What is the main topic?')).toEqual({ isValid: true })
    })

    test('isValidEmail should validate email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('invalid-email')).toBe(false)
      expect(isValidEmail('test@')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
    })
  })

  describe('Document Type Helpers', () => {
    test('getDocumentTypeColor should return correct colors', () => {
      expect(getDocumentTypeColor('pdf')).toBe('bg-red-100 text-red-800')
      expect(getDocumentTypeColor('txt')).toBe('bg-gray-100 text-gray-800')
      expect(getDocumentTypeColor('docx')).toBe('bg-blue-100 text-blue-800')
      expect(getDocumentTypeColor('md')).toBe('bg-green-100 text-green-800')
    })

    test('getDocumentTypeIcon should return correct icons', () => {
      expect(getDocumentTypeIcon('pdf')).toBe('📄')
      expect(getDocumentTypeIcon('txt')).toBe('📝')
      expect(getDocumentTypeIcon('docx')).toBe('📘')
      expect(getDocumentTypeIcon('md')).toBe('📋')
    })

    test('getStatusColor should return correct colors', () => {
      expect(getStatusColor('uploading')).toBe('bg-blue-100 text-blue-800')
      expect(getStatusColor('processing')).toBe('bg-yellow-100 text-yellow-800')
      expect(getStatusColor('processed')).toBe('bg-green-100 text-green-800')
      expect(getStatusColor('error')).toBe('bg-red-100 text-red-800')
    })

    test('getStatusIcon should return correct icons', () => {
      expect(getStatusIcon('uploading')).toBe('⬆️')
      expect(getStatusIcon('processing')).toBe('⚙️')
      expect(getStatusIcon('processed')).toBe('✅')
      expect(getStatusIcon('error')).toBe('❌')
    })
  })

  describe('Keyword Extraction', () => {
    test('extractKeywords should extract keywords from text', () => {
      const text = 'This is a test document with important keywords and concepts.'
      const keywords = extractKeywords(text, 5)
      
      expect(keywords).toContain('test')
      expect(keywords).toContain('document')
      expect(keywords).toContain('important')
      expect(keywords).toContain('keywords')
      expect(keywords).toContain('concepts')
    })
  })

  describe('Similarity Calculation', () => {
    test('calculateSimilarity should calculate similarity between strings', () => {
      expect(calculateSimilarity('hello', 'hello')).toBe(1.0)
      expect(calculateSimilarity('hello', 'world')).toBeLessThan(1.0)
      expect(calculateSimilarity('test', 'testing')).toBeGreaterThan(0.5)
    })
  })

  describe('Debounce', () => {
    test('debounce should delay function execution', (done) => {
      let callCount = 0
      const debouncedFn = debounce(() => {
        callCount++
      }, 100)

      debouncedFn()
      debouncedFn()
      debouncedFn()

      setTimeout(() => {
        expect(callCount).toBe(1)
        done()
      }, 150)
    })
  })

  describe('Retry with Backoff', () => {
    test('retryWithBackoff should retry failed operations', async () => {
      let attemptCount = 0
      const failingFn = async () => {
        attemptCount++
        if (attemptCount < 3) {
          throw new Error('Temporary failure')
        }
        return 'success'
      }

      const result = await retryWithBackoff(failingFn, 3, 10)
      
      expect(result).toBe('success')
      expect(attemptCount).toBe(3)
    })

    test('retryWithBackoff should throw error after max retries', async () => {
      const failingFn = async () => {
        throw new Error('Permanent failure')
      }

      await expect(retryWithBackoff(failingFn, 2, 10)).rejects.toThrow('Permanent failure')
    })
  })
})
