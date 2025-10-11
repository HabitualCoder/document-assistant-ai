/**
 * LangChain chains for RAG pipeline using Google Gemini
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnablePassthrough, RunnableSequence } from '@langchain/core/runnables';
import { retriever, combineDocuments } from './vector-store';
import { langsmithConfig, isLangSmithConfigured } from './langsmith';

// Initialize Gemini chat model with LangSmith tracing
const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.0-flash-exp',
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.1,
  maxTokens: 2048,
  // LangSmith configuration
  ...(isLangSmithConfigured() && {
    callbacks: [{
      name: 'langsmith',
      projectName: langsmithConfig.project,
    }],
  }),
});

// Standalone question template (from your course code)
const standaloneQuestionTemplate = `Given a question, convert it to a standalone question. 
question: {question} 
standalone question:`;

const standaloneQuestionPrompt = PromptTemplate.fromTemplate(standaloneQuestionTemplate);

// Answer template adapted for document assistant
const answerTemplate = `You are an intelligent document assistant. Answer the user's question based on the provided context from their documents. Try to find the answer in the context. If you really don't know the answer, say "I'm sorry, I don't have enough information in the provided documents to answer that question." Don't try to make up an answer. Always speak professionally and cite specific parts of the documents when relevant.

context: {context}
question: {question}
answer:`;

const answerPrompt = PromptTemplate.fromTemplate(answerTemplate);

// Create chains using LCEL (LangChain Expression Language)
const standaloneQuestionChain = standaloneQuestionPrompt
  .pipe(llm)
  .pipe(new StringOutputParser());

const retrieverChain = RunnableSequence.from([
  (prevResult: any) => prevResult.standalone_question,
  retriever,
  combineDocuments,
]);

const answerChain = answerPrompt
  .pipe(llm)
  .pipe(new StringOutputParser());

// Main RAG chain (from your course code structure)
export const ragChain = RunnableSequence.from([
  {
    standalone_question: standaloneQuestionChain,
    original_input: new RunnablePassthrough(),
  },
  {
    context: retrieverChain,
    question: ({ original_input }: any) => original_input.question,
  },
  answerChain,
]);

// Simple query chain for direct questions
export const simpleQueryChain = RunnableSequence.from([
  {
    context: retriever,
    question: new RunnablePassthrough(),
  },
  {
    context: combineDocuments,
    question: ({ question }: any) => question,
  },
  answerChain,
]);

// Process a query using the RAG chain
export async function processQueryWithRAG(question: string): Promise<string> {
  try {
    console.log(`Processing query with RAG: ${question}`);
    
    const response = await ragChain.invoke({
      question: question,
    });
    
    console.log('RAG query processed successfully');
    return response;
  } catch (error) {
    console.error('Error processing RAG query:', error);
    throw error;
  }
}

// Process a simple query (without standalone question conversion)
export async function processSimpleQuery(question: string): Promise<string> {
  try {
    console.log(`Processing simple query: ${question}`);
    
    const response = await simpleQueryChain.invoke(question);
    
    console.log('Simple query processed successfully');
    return response;
  } catch (error) {
    console.error('Error processing simple query:', error);
    throw error;
  }
}
