
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const getMedicalExplanation = async (topic: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Você é um tutor especialista em medicina. Explique de forma concisa (máximo 200 palavras) o tema "${topic}" para um estudante que está se preparando para a residência médica. Foco em fisiopatologia, quadro clínico e tratamento de primeira linha. Use Markdown.`,
    });
    return response.text || "Não foi possível gerar a explicação no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao conectar com o tutor. Verifique sua conexão.";
  }
};

export const getStudyTips = async (performance: number): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Um estudante de medicina tem uma precisão geral de ${performance}%. Dê 3 dicas curtas e motivadoras de estudo baseadas nesse desempenho. Seja direto.`,
    });
    return response.text || "Continue focado em seus estudos!";
  } catch (error) {
    return "Mantenha o ritmo de revisões!";
  }
};
