import { GoogleGenAI } from "@google/genai";

export class GeminiService {
    private client: any = null;
    private currentModel: string = "gemini-1.5-flash-latest";
    private imageModel: string = "gemini-1.5-flash-latest";

    constructor(apiKey?: string, modelName: string = "gemini-1.5-flash-latest", imageModel: string = "gemini-1.5-flash-latest") {
        if (apiKey) {
            console.log("[Gemini] 构造函数初始化...");
            this.initClient(apiKey, modelName, imageModel);
        }
    }

    public initClient(apiKey: string, modelName: string = "gemini-1.5-flash-latest", imageModel: string = "gemini-1.5-flash-latest") {
        this.currentModel = modelName;
        this.imageModel = imageModel;
        if (!apiKey) {
            console.warn("[Gemini] 初始化失败：API Key 为空");
            return;
        }
        this.client = new GoogleGenAI({ apiKey });
        console.log("[Gemini] SDK 客户端已创建");
    }

    public updateTextModel(modelName: string) { this.currentModel = modelName; }
    public updateImageModel(modelName: string) { this.imageModel = modelName; }

    public async listModels() {
        console.log("[Gemini] 准备请求模型列表...");
        if (!this.client) {
            console.warn("[Gemini] 无法请求模型列表：客户端未初始化");
            return [];
        }

        try {
            // @google/genai v1.x: ai.models.list()
            const response = await this.client.models.list();
            console.log("[Gemini] 接口响应原始数据:", response);

            let rawModels = [];
            // 处理异步迭代器或数组
            if (response && typeof response[Symbol.asyncIterator] === 'function') {
                for await (const m of response) { rawModels.push(m); }
            } else {
                rawModels = Array.isArray(response) ? response : (response?.models || []);
            }

            console.log("[Gemini] 解析到的原始模型数量:", rawModels.length);

            // 智能过滤：仅保留主流生成模型，排除 TTS、嵌入、历史版本等
            const filtered = rawModels.filter((m: any) => {
                const name = m.name.toLowerCase();
                // 排除不支持生成的预览/嵌入模型
                if (name.includes('tts') || name.includes('embedding') || name.includes('vision') || name.includes('aqa')) return false;
                // 排除旧的修订版本 (如 001, 002)
                if (/\d{3}/.test(name)) return false;
                // 仅保留主流 gemini 和 imagen
                return name.includes('gemini') || name.includes('imagen');
            });

            const result = filtered.map((m: any) => ({
                displayName: m.displayName || m.name.split('/').pop(),
                name: m.name
            }));
            
            console.log("[Gemini] 过滤后的模型列表:", result);
            return result;
        } catch (e) { 
            console.error("[Gemini SDK] 无法获取模型列表:", e);
            return []; 
        }
    }

    public async generateText(prompt: string) {
        if (!this.client) return "请配置 API Key";
        console.log("[Gemini] 发起文本生成请求...");
        try {
            const result = await this.client.models.generateContent({
                model: this.currentModel,
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });
            return result.text;
        } catch (e: any) { 
            console.error("[Gemini] generateText ERROR:", e);
            return `生成失败: ${e.message}`; 
        }
    }

    public async generateImage(userPrompt: string, options: { removeBg?: boolean, aspectRatio?: string, resolution?: string } = {}) {
        if (!this.client) return { error: "请配置 API Key" };
        console.log("[Gemini] 发起图像生成请求...");

        let finalPrompt = userPrompt;
        
        // 追加物理分辨率或比例描述到题词，强化 AI 感知
        const resDesc = options.resolution || options.aspectRatio;
        if (resDesc) {
            finalPrompt += `。输出要求：分辨率为 ${resDesc}。`;
        }

        if (options.removeBg) {
            finalPrompt += "。背景为统一的纯绿色 (#00FF00)，画面主体不要出现#00FF00色的元素。";
        }

        try {
            const isImagen = this.imageModel.toLowerCase().includes('imagen');
            let resultData: { base64: string, url: string };

            if (isImagen) {
                // 标准 Imagen 3 API 参数
                const response = await this.client.models.generateImages({
                    model: this.imageModel,
                    prompt: finalPrompt,
                    parameters: { 
                        number_of_images: 1, 
                        aspectRatio: options.aspectRatio || "1:1" 
                    }
                });
                const img = response.images?.[0];
                if (!img) throw new Error("未生成图片数据");
                resultData = { base64: img.base64, url: img.url || `data:image/png;base64,${img.base64}` };
            } else {
                const result = await this.client.models.generateContent({
                    model: this.imageModel,
                    contents: [{ role: 'user', parts: [{ text: finalPrompt }] }]
                });
                const candidate = result.candidates?.[0];
                const imagePart = candidate?.content?.parts?.find((p: any) => p.inlineData);
                if (!imagePart) throw new Error("模型未返回图片数据");
                resultData = { base64: imagePart.inlineData.data, url: `data:image/png;base64,${imagePart.inlineData.data}` };
            }

            if (options.removeBg) return await this.chromaKey(resultData.base64);
            return resultData;
        } catch (e: any) { 
            console.error("[Gemini] generateImage ERROR:", e);
            return { error: `生成异常: ${e.message}` }; 
        }
    }

    private async chromaKey(base64: string): Promise<{url: string, base64: string}> {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width; canvas.height = img.height;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i], g = data[i+1], b = data[i+2];
                    if (g > 100 && g > r * 1.4 && g > b * 1.4) data[i + 3] = 0;
                }
                ctx.putImageData(imageData, 0, 0);
                const newBaseUrl = canvas.toDataURL('image/png');
                resolve({ url: newBaseUrl, base64: newBaseUrl.split(',')[1] });
            };
            img.src = `data:image/png;base64,${base64}`;
        });
    }
}
