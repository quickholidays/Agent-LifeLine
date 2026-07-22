import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec } from "child_process";

export async function POST(req) {
  try {
    const { messages = [], contextData = {} } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        choices: [
          {
            message: {
              role: "assistant",
              content: "Gemini API Key is missing. Please add your `GEMINI_API_KEY` to the `.env.local` file at the project root and restart the development server to activate the AI Operations Assistant."
            }
          }
        ]
      });
    }

    // Build system instructions with real-time operational context
    const systemPrompt = `You are "Agent LifeLine Operations AI", an advanced, friendly, and analytical operations assistant.
You have access to real-time operational performance metrics, CRM updates, and phone logs for today.

Here is today's real-time dashboard data context:
--------------------------------------------------
${JSON.stringify(contextData, null, 2)}
--------------------------------------------------

Critical Routing Instructions:
1. If the user's query is completely unrelated to operations, agents, call logs, CRM metrics, or dashboard tasks, reply exactly starting with prefix "[OUT_OF_CONTEXT]" and explain why the question is out of context.
2. If the user's query asks for data, metrics, integration rows, or logs that are missing or cannot be generated from the context above (for example: email campaign stats, logs outside today's scope, or fields that are not present in the columns), reply exactly starting with prefix "[UNRESOLVED_DATA]" and then explain what metrics or database integrations are missing.
3. Otherwise, answer the query accurately based on today's statistics. Present tables, summaries, and lists using standard Markdown. Keep responses concise and visually structured.`;

    // Map conversation history to Gemini content structure
    const contents = messages.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));

    const modelsToTry = [
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.6-flash",
      "gemini-2.5-flash",
      "gemini-1.5-flash"
    ];

    let result = null;
    let replyText = "";
    let lastError = null;

    for (const modelName of modelsToTry) {
      console.log(`[Gemini API] Attempting generation with model: ${modelName}`);
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: systemPrompt }]
              },
              contents: contents,
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 2048
              }
            })
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || `Model ${modelName} returned status ${response.status}`);
        }

        const data = await response.json();
        replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) {
          console.log(`[Gemini API] Success using model: ${modelName}`);
          result = data;
          break;
        }
      } catch (e) {
        console.warn(`[Gemini API] Model ${modelName} failed:`, e.message);
        lastError = e;
      }
    }

    if (!result) {
      throw new Error(lastError ? lastError.message : "All Gemini models failed to generate content.");
    }

    // If query is unresolved due to missing data, log it and push to GitHub
    if (replyText.startsWith("[UNRESOLVED_DATA]")) {
      try {
        const lastUserMessage = messages.filter(m => m.role === "user").pop();
        const userQuery = lastUserMessage ? lastUserMessage.content : "Unknown query";

        const filePath = path.join(process.cwd(), "src/data/unresolved_queries.json");
        let currentQueries = [];

        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf-8");
          try {
            currentQueries = JSON.parse(content);
          } catch (e) {
            currentQueries = [];
          }
        } else {
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
        }

        // Avoid adding exact duplicate query recently saved
        const isDuplicate = currentQueries.some(q => q.query.toLowerCase() === userQuery.toLowerCase());
        if (!isDuplicate) {
          currentQueries.push({
            query: userQuery,
            timestamp: new Date().toISOString()
          });
          fs.writeFileSync(filePath, JSON.stringify(currentQueries, null, 2), "utf-8");

          // Push in background to GitHub asynchronously
          exec('git add src/data/unresolved_queries.json && git commit -m "chore: save unresolved AI query" && git push', (err) => {
            if (err) {
              console.warn("[Git Auto-Push] Failed to push to GitHub:", err.message);
            } else {
              console.log("[Git Auto-Push] Successfully pushed unresolved query to GitHub repository.");
            }
          });
        }
      } catch (e) {
        console.error("Failed to save unresolved query data:", e);
      }
    }

    return NextResponse.json({
      choices: [
        {
          message: {
            role: "assistant",
            content: replyText
          }
        }
      ]
    });
  } catch (error) {
    console.error("Gemini API Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process chat query" },
      { status: 500 }
    );
  }
}
