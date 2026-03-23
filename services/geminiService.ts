import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Task, IdealBlock } from "../types";

export const generateIdealWeekStrategy = async (
    objective: string,
    currentCategories: { id: string; label: string }[]
): Promise<Partial<IdealBlock>[]> => {
    if (!process.env.API_KEY) {
        throw new Error("Gemini API key not found.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const categoriesString = currentCategories.map(c => `${c.label} (ID: ${c.id})`).join(', ');

    const prompt = `
        You are a world-class High-Performance Real Estate Coach. 
        Your task is to architect an "Ideal Week" schedule for an agent based on their specific goal: "${objective}".

        Available Categories to use: ${categoriesString}.

        Rules for the schedule:
        1. Deep Work (Focus) should happen early in the day (e.g., 8:00 AM - 11:00 AM).
        2. Admin/Shallow work should be batched in the afternoon.
        3. Meetings/Consultations should follow lead generation.
        4. Include blocks for personal well-being or learning.
        5. Return a list of blocks for a standard 5-day work week (Monday to Friday, Day 1 to 5).
        6. Day 1 is Monday, Day 5 is Friday.
        
        Return a JSON array of objects with:
        - dayOfWeek (number, 1-5)
        - startHour (number, 0-23)
        - duration (number, e.g. 1, 1.5, 2)
        - title (string, specific actionable label)
        - category (string, must be one of the IDs provided above)
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            dayOfWeek: { type: Type.NUMBER },
                            startHour: { type: Type.NUMBER },
                            duration: { type: Type.NUMBER },
                            title: { type: Type.STRING },
                            category: { type: Type.STRING }
                        },
                        required: ['dayOfWeek', 'startHour', 'duration', 'title', 'category']
                    }
                }
            }
        });

        const jsonText = response.text?.trim();
        if (!jsonText) throw new Error("AI returned empty response.");
        return JSON.parse(jsonText);

    } catch (error) {
        console.error("Error generating ideal week with Gemini:", error);
        throw new Error("Failed to generate architecture.");
    }
};

export const generateSubtaskPlan = async (
    goal: string,
    task: Task,
): Promise<string[]> => {
    if (!process.env.API_KEY) {
        throw new Error("Gemini API key not found.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
        You are an expert project planner. Your goal is to take a high-level objective and break it down into a detailed, actionable checklist of subtasks.

        **Parent Task:** "${task.title}"
        **Parent Task Description:** ${task.description}

        **Objective for Subtasks:**
        ---
        ${goal}
        ---

        **Instructions:**
        1. Analyze the objective in the context of the parent task.
        2. Generate a series of clear, sequential, and actionable subtask titles to achieve the objective.
        3. The output should be a simple list of strings.
        4. Return the output as a valid JSON array of strings. The plan should contain at least 2 steps. Do not return an object, just an array of strings.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.STRING,
                        description: "The title of a single subtask."
                    },
                }
            }
        });

        const jsonText = response.text?.trim();
        if (!jsonText) throw new Error("AI returned empty response.");
        const planItems = JSON.parse(jsonText);
        
        if (!Array.isArray(planItems) || !planItems.every(item => typeof item === 'string')) {
            throw new Error("AI response is not a JSON array of strings.");
        }
        
        return planItems as string[];

    } catch (error) {
        console.error("Error generating subtask plan with Gemini:", error);
        throw new Error("Failed to generate plan. The AI returned an unexpected format.");
    }
};

export interface ParsedTask {
    title: string;
    description?: string;
    dueDate?: string;
    priority?: string;
    assigneeName?: string;
}

export const parseTaskInput = async (input: string): Promise<ParsedTask> => {
    if (!process.env.API_KEY) {
        throw new Error("Gemini API key not found.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
    Extract task details from the following natural language input.
    Input: "${input}"
    
    Return a JSON object with:
    - title (string, required)
    - description (string, optional)
    - dueDate (string, ISO 8601 format YYYY-MM-DD, assume today is ${new Date().toISOString().split('T')[0]})
    - priority (string: 'Low', 'Medium', 'High')
    - assigneeName (string, optional, extract name if mentioned like 'assign to John')
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    dueDate: { type: Type.STRING },
                    priority: { type: Type.STRING },
                    assigneeName: { type: Type.STRING }
                },
                required: ['title']
            }
        }
    });

    return JSON.parse(response.text?.trim() || '{}') as ParsedTask;
};

export const generateNotificationBrief = async (taskTitle: string, taskDescription: string): Promise<string> => {
    if (!process.env.API_KEY) return "";
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
Create a 1-sentence action summary (max 10 words) for a notification about this task.
Start with a verb.
Task: ${taskTitle}
Description: ${taskDescription}
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text?.trim() || "";
    } catch (e) {
        console.error("Gemini brief generation failed", e);
        return ""; // Fallback if AI fails
    }
};

export const generateTemplateFromFile = async (
  fileBase64: string,
  mimeType: string
): Promise<{ name: string; description: string; tasks: { title: string; description: string }[] }> => {
  if (!process.env.API_KEY) throw new Error("Gemini API key not found.");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    You are an expert Business Systems Analyst.
    Analyze the attached document (image/PDF). It contains a Standard Operating Procedure (SOP), checklist, or workflow.
    Your goal is to digitize this into a structured Project Template.

    Rules:
    1. Extract the Title of the process.
    2. Write a short Description of what this process achieves.
    3. Break down the content into a sequential list of Tasks.
    4. For each task, provide a precise Title and any detailed instructions as the Description.
  `;

  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: fileBase64
    }
  };

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "The title of the SOP/System" },
      description: { type: Type.STRING, description: "A brief summary" },
      tasks: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Actionable task name" },
            description: { type: Type.STRING, description: "Details, notes, or sub-context" }
          },
          required: ["title", "description"]
        }
      }
    },
    required: ["name", "description", "tasks"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
            role: 'user',
            parts: [
                { text: prompt },
                imagePart
            ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    return JSON.parse(text);
  } catch (error) {
    console.error("Template generation failed:", error);
    throw new Error("Failed to parse document. Please try a clearer image.");
  }
};