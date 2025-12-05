
import { GoogleGenAI } from "@google/genai";
import { Project, InvoiceItem } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const analyzeExpense = async (
  items: InvoiceItem[],
  totalAmount: number,
  project: Project,
  categoryName: string
): Promise<string> => {
  if (!ai) {
    return "AI 助理未啟用 (無 API Key)，請依校規自行檢查。";
  }

  try {
    const itemsDescription = items.map(i => `${i.name} (${i.quantity} x $${i.unitPrice})`).join(', ');

    const prompt = `
      你是國立大學的專業會計審核員。請幫我檢查這張發票核銷是否合理。
      
      計畫類型: ${project.type}
      計畫名稱: ${project.name}
      核銷科目: ${categoryName}
      發票總額: ${totalAmount} 元
      發票明細: ${itemsDescription}

      請根據一般台灣國立大學(如成功大學)的經費核銷規定，給出一句簡短的提醒或建議。
      特別注意：
      1. 金額合理性。
      2. 明細內容是否符合該科目 (例如國科會嚴禁與計畫無關之採購)。
      3. 誤餐費是否有便當數量的限制?
      4. 如果金額超過 2000 元，是否需要估價單 (一般規則)？
      5. 如果金額超過 15000 元，是否提醒請購？

      請用繁體中文，語氣溫和且專業，限制在 60 字以內。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "檢查完成，無特殊建議。";
  } catch (error) {
    console.error("Gemini analysis failed", error);
    return "連線問題，無法進行 AI 智慧檢查。";
  }
};
