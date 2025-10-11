/**
 * Document loading and chunking utilities using LangChain
 */

import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document as AppDocument } from './types';

// Text splitter configuration
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ['\n\n', '\n', ' ', ''],
});

/**
 * Convert our app document to LangChain document
 */
export function convertToLangChainDocument(doc: AppDocument): Document {
  return new Document({
    pageContent: doc.content || '',
    metadata: {
      id: doc.id,
      name: doc.name,
      type: doc.type,
      size: doc.size,
      uploadDate: doc.uploadDate.toISOString(),
      processedDate: doc.processedDate?.toISOString(),
      status: doc.status,
      ...doc.metadata,
    },
  });
}

/**
 * Split document content into chunks
 */
export async function splitDocumentIntoChunks(doc: AppDocument): Promise<Document[]> {
  try {
    console.log(`Splitting document ${doc.name} into chunks`);
    
    const langchainDoc = convertToLangChainDocument(doc);
    const chunks = await textSplitter.splitDocuments([langchainDoc]);
    
    console.log(`Created ${chunks.length} chunks for document ${doc.name}`);
    return chunks;
  } catch (error) {
    console.error(`Error splitting document ${doc.name}:`, error);
    throw error;
  }
}

/**
 * Process multiple documents and return chunks
 */
export async function processDocumentsIntoChunks(documents: AppDocument[]): Promise<Document[]> {
  try {
    console.log(`Processing ${documents.length} documents into chunks`);
    
    const allChunks: Document[] = [];
    
    for (const doc of documents) {
      const chunks = await splitDocumentIntoChunks(doc);
      allChunks.push(...chunks);
    }
    
    console.log(`Total chunks created: ${allChunks.length}`);
    return allChunks;
  } catch (error) {
    console.error('Error processing documents into chunks:', error);
    throw error;
  }
}
