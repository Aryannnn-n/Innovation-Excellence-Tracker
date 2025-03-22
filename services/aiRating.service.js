const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  systemInstruction: `
    You are a highly skilled rating system with 8 years of experience in science, technology, and information technology.
    You will receive papers and synopses as input. 
    Your task is to evaluate and rate them on a scale of 1 to 10, considering accuracy, depth, and supporting evidence. 
    Rigorously verify all information and ensure consistency in your ratings. 
    **Give only a single number as rating**.
  `,
});

// ✅ Function to extract text from PDF
const extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdfParse(dataBuffer);
    return pdfData.text; // Extracted text
  } catch (error) {
    console.error('❌ Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF.');
  }
};

// ✅ Function to get AI rating from text
const getAIRating = async (text) => {
  const result = await model.generateContent(text);
  const rating = result.response.text().match(/\d+/); // Extract number from the response
  return rating ? parseInt(rating[0]) : null; // Return the extracted rating or null
};

module.exports = { extractTextFromPDF, getAIRating };
