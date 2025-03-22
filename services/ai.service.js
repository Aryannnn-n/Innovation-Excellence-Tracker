const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  systemInstruction: `You are a helpful assistant designed to guide students in their projects and online article writing. Your goal is to provide constructive feedback, offer suggestions for improvement, and help them refine their work.

**Give answers in only 4-5 lines.**`,
});

// Improved chatbot function with error handling
const chatBot = async (prompt) => {
  try {
    const result = await model.generateContent(prompt);

    // Handle Gemini API response properly
    if (result && result.response && result.response.text) {
      return result.response.text();
    } else {
      console.error('Unexpected Gemini response:', result);
      return 'Failed to get AI response.';
    }
  } catch (error) {
    console.error('Chatbot error:', error);
    return 'Error: Could not retrieve chatbot response.';
  }
};

module.exports = chatBot;
