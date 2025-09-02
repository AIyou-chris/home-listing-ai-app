import * as functions from 'firebase-functions';
import OpenAI from 'openai';

export const generateImage = functions.https.onCall(async (data: any, context) => {
  try {
    const prompt: string = (data?.prompt || '').toString();
    const size: string = (data?.size || '1024x1024').toString();

    if (!prompt.trim()) {
      throw new functions.https.HttpsError('invalid-argument', 'Prompt is required');
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new functions.https.HttpsError('failed-precondition', 'OpenAI API key not configured');
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const result = await openai.images.generate({
      model: 'gpt-image-1',
      prompt,
      size,
      quality: 'high'
    } as any);

    const url = (result as any)?.data?.[0]?.url;
    const b64 = (result as any)?.data?.[0]?.b64_json;

    if (!url && !b64) {
      throw new Error('No image returned by OpenAI');
    }

    return { success: true, url, b64 };
  } catch (error: any) {
    console.error('generateImage error:', error);
    throw new functions.https.HttpsError('internal', error?.message || 'Image generation failed');
  }
});









