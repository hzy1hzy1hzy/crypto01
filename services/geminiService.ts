
import { GoogleGenAI } from "@google/genai";

// 安全检查 process 环境，防止在标准浏览器环境抛出 ReferenceError
const getApiKey = () => {
  try {
    return (typeof process !== 'undefined' && process.env?.API_KEY) || null;
  } catch (e) {
    return null;
  }
};

const apiKey = getApiKey();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const STATIC_TIPS = [
  "ECC P-256 在提供与 RSA-3072 相当的安全性时，密钥长度更短，效率更高。",
  "AES-GCM 是一种经过验证的加密模式，同时提供机密性和完整性校验。",
  "私钥是恢复数据的唯一凭证。一旦丢失，加密文件将无法挽回。",
  "本工具的所有核心加解密逻辑均在浏览器本地运行，不经过任何服务器。",
  "建议在离线环境（如飞行模式）下进行高机密文件的处理。"
];

export const getSecurityAdvise = async (topic: string) => {
  if (!ai) {
    return STATIC_TIPS[Math.floor(Math.random() * STATIC_TIPS.length)];
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `提供一个关于 ${topic} 的简短安全建议。侧重于 ECC 加密和文件安全。字数控制在50字以内。说明此工具可离线工作。`,
      config: {
        temperature: 0.7,
      }
    });
    return response.text || STATIC_TIPS[0];
  } catch (err) {
    console.warn("AI 建议获取失败，使用本地预设提示。");
    return STATIC_TIPS[Math.floor(Math.random() * STATIC_TIPS.length)];
  }
};
