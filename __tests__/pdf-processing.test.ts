/**
 * Unit tests for PDF processing with pdf2json
 */

// Mock pdf2json
jest.mock('pdf2json', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    parseBuffer: jest.fn(),
  }))
})

describe('PDF Processing with pdf2json', () => {
  let mockPDFParser: any
  let extractFileContent: any

  beforeEach(() => {
    jest.resetModules()
    
    // Mock PDFParser
    mockPDFParser = require('pdf2json')
    
    // Mock the PDF parsing process
    const mockInstance = {
      on: jest.fn((event, callback) => {
        if (event === 'pdfParser_dataReady') {
          // Simulate successful parsing
          setTimeout(() => {
            callback({
              Pages: [
                {
                  Texts: [
                    {
                      R: [
                        { T: 'This%20is%20test%20content' }
                      ]
                    }
                  ]
                }
              ]
            })
          }, 10)
        }
      }),
      parseBuffer: jest.fn(),
    }
    
    mockPDFParser.mockImplementation(() => mockInstance)
    
    // Import the function after mocking
    const uploadRoute = require('../app/api/upload/route')
    extractFileContent = uploadRoute.extractFileContent
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('PDF Content Extraction', () => {
    test('should extract text from PDF successfully', async () => {
      const mockArrayBuffer = new ArrayBuffer(8)
      const uint8Array = new Uint8Array(mockArrayBuffer)
      // Set PDF header
      uint8Array[0] = 37 // %
      uint8Array[1] = 80  // P
      uint8Array[2] = 68  // D
      uint8Array[3] = 70  // F

      const result = await extractFileContent(mockArrayBuffer, 'pdf')
      
      expect(result).toBe('This is test content')
    })

    test('should handle PDF parsing errors', async () => {
      const mockInstance = {
        on: jest.fn((event, callback) => {
          if (event === 'pdfParser_dataError') {
            setTimeout(() => {
              callback({ parserError: 'PDF parsing failed' })
            }, 10)
          }
        }),
        parseBuffer: jest.fn(),
      }
      
      mockPDFParser.mockImplementation(() => mockInstance)

      const mockArrayBuffer = new ArrayBuffer(8)
      const uint8Array = new Uint8Array(mockArrayBuffer)
      uint8Array[0] = 37 // %
      uint8Array[1] = 80  // P
      uint8Array[2] = 68  // D
      uint8Array[3] = 70  // F

      await expect(extractFileContent(mockArrayBuffer, 'pdf')).rejects.toThrow('PDF parsing failed')
    })

    test('should validate PDF header', async () => {
      const mockArrayBuffer = new ArrayBuffer(8)
      const uint8Array = new Uint8Array(mockArrayBuffer)
      // Set invalid header
      uint8Array[0] = 65 // A
      uint8Array[1] = 66 // B
      uint8Array[2] = 67 // C
      uint8Array[3] = 68 // D

      await expect(extractFileContent(mockArrayBuffer, 'pdf')).rejects.toThrow('File does not appear to be a valid PDF')
    })

    test('should handle empty PDF content', async () => {
      const mockInstance = {
        on: jest.fn((event, callback) => {
          if (event === 'pdfParser_dataReady') {
            setTimeout(() => {
              callback({
                Pages: [
                  {
                    Texts: [] // Empty texts
                  }
                ]
              })
            }, 10)
          }
        }),
        parseBuffer: jest.fn(),
      }
      
      mockPDFParser.mockImplementation(() => mockInstance)

      const mockArrayBuffer = new ArrayBuffer(8)
      const uint8Array = new Uint8Array(mockArrayBuffer)
      uint8Array[0] = 37 // %
      uint8Array[1] = 80  // P
      uint8Array[2] = 68  // D
      uint8Array[3] = 70  // F

      await expect(extractFileContent(mockArrayBuffer, 'pdf')).rejects.toThrow('No extractable text found in PDF')
    })

    test('should handle multiple pages', async () => {
      const mockInstance = {
        on: jest.fn((event, callback) => {
          if (event === 'pdfParser_dataReady') {
            setTimeout(() => {
              callback({
                Pages: [
                  {
                    Texts: [
                      {
                        R: [
                          { T: 'Page%201%20content' }
                        ]
                      }
                    ]
                  },
                  {
                    Texts: [
                      {
                        R: [
                          { T: 'Page%202%20content' }
                        ]
                      }
                    ]
                  }
                ]
              })
            }, 10)
          }
        }),
        parseBuffer: jest.fn(),
      }
      
      mockPDFParser.mockImplementation(() => mockInstance)

      const mockArrayBuffer = new ArrayBuffer(8)
      const uint8Array = new Uint8Array(mockArrayBuffer)
      uint8Array[0] = 37 // %
      uint8Array[1] = 80  // P
      uint8Array[2] = 68  // D
      uint8Array[3] = 70  // F

      const result = await extractFileContent(mockArrayBuffer, 'pdf')
      
      expect(result).toContain('Page 1 content')
      expect(result).toContain('Page 2 content')
    })

    test('should decode URL-encoded text', async () => {
      const mockInstance = {
        on: jest.fn((event, callback) => {
          if (event === 'pdfParser_dataReady') {
            setTimeout(() => {
              callback({
                Pages: [
                  {
                    Texts: [
                      {
                        R: [
                          { T: 'Hello%20World%21%20This%20is%20a%20test.' }
                        ]
                      }
                    ]
                  }
                ]
              })
            }, 10)
          }
        }),
        parseBuffer: jest.fn(),
      }
      
      mockPDFParser.mockImplementation(() => mockInstance)

      const mockArrayBuffer = new ArrayBuffer(8)
      const uint8Array = new Uint8Array(mockArrayBuffer)
      uint8Array[0] = 37 // %
      uint8Array[1] = 80  // P
      uint8Array[2] = 68  // D
      uint8Array[3] = 70  // F

      const result = await extractFileContent(mockArrayBuffer, 'pdf')
      
      expect(result).toBe('Hello World! This is a test.')
    })
  })
})
