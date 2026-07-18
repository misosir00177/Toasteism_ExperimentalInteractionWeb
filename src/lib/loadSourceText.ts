import { SOURCE_TEXT_PATH, FALLBACK_TEXT } from "../config/source";

export async function loadSourceText(): Promise<string> {
  try {
    const response = await fetch(SOURCE_TEXT_PATH);
    if (!response.ok) {
      console.warn(`Failed to fetch ${SOURCE_TEXT_PATH}, using fallback text.`);
      return FALLBACK_TEXT;
    }
    const text = await response.text();
    if (!text || text.trim() === "") {
      console.warn(`Text file is empty, using fallback text.`);
      return FALLBACK_TEXT;
    }
    
    // Clean text: remove invisible controls except newline/spaces, convert newlines to space
    let cleaned = text.replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, "");
    cleaned = cleaned.replace(/\r?\n/g, " ");
    return cleaned;
  } catch (error) {
    console.warn(`Error loading text:`, error, `Using fallback text.`);
    return FALLBACK_TEXT;
  }
}
