// Chatbot
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  systemInstruction: `You are a highly skilled rating system with 8 years of experience in science, technology, and information technology. You will receive papers and synopses as input. Your task is to evaluate and rate them on a scale of 1 to 10, considering accuracy, depth, and supporting evidence. Rigorously verify all information and ensure consistency in your ratings.  `,
});

const prompt = 'Explain how AI works';

// Rating function
async function aiRating(prompt) {
  const result = await model.generateContent(prompt);
  return result.response.text();
}

module.exports = aiRating;
