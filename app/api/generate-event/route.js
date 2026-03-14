import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generateWithRetry(model, prompt, retries = 3) {
  try {
    return await model.generateContent(prompt);
  } catch (error) {
    const status = error?.status;

    // Retry on overload or rate limit
    if ((status === 503 || status === 429) && retries > 0) {
      const delay = (4 - retries) * 2000 + Math.random() * 1000;
      console.warn(
        `Gemini ${status} error. Retrying in ${Math.round(delay)}ms...`
      );
      await sleep(delay);
      return generateWithRetry(model, prompt, retries - 1);
    }

    throw error;
  }
}

export async function POST(req) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
    });

    const systemPrompt = `You are an event planning assistant. Generate event details based on the user's description.

CRITICAL: Return ONLY valid JSON with properly escaped strings. No newlines in string values - use spaces instead.

Return this exact JSON structure:
{
  "title": "Event title (catchy and professional, single line)",
  "description": "Detailed event description in a single paragraph. Use spaces instead of line breaks. Make it 2-3 sentences describing what attendees will learn and experience.",
  "category": "One of: tech, music, sports, art, food, business, health, education, gaming, networking, outdoor, community",
  "suggestedCapacity": 50,
  "suggestedTicketType": "free"
}

User's event idea: ${prompt}

Rules:
- Return ONLY the JSON object, no markdown, no explanation
- All string values must be on a single line with no line breaks
- Use spaces instead of \\n or line breaks in description
- Make title catchy and under 80 characters
- Description should be 2-3 sentences, informative, single paragraph
- suggestedTicketType should be either "free" or "paid"
`;

    // 🔑 Use retry logic here
    const result = await generateWithRetry(model, systemPrompt);

    const response = await result.response;
    const text = response.text();

    // Clean the response (remove markdown code blocks if present)
    let cleanedText = text.trim();
    cleanedText = cleanedText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "");

    const eventData = JSON.parse(cleanedText);

    return NextResponse.json(eventData);
  } catch (error) {
    console.error("Error generating event:", error);

    // Explicit Gemini errors
    if (error?.status === 503) {
      return NextResponse.json(
        {
          error:
            "AI service is temporarily overloaded. Please try again in a moment.",
        },
        { status: 503 }
      );
    }

    if (error?.status === 429) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate event" },
      { status: 500 }
    );
  }
}
