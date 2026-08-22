'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const LLM_PROVIDER = process.env.LLM_PROVIDER || 'anthropic';
const LLM_API_KEY = process.env.LLM_API_KEY || '';
const LLM_TIMEOUT_MS = 15000;
const LLM_MAX_RETRIES = 2;

/**
 * Sleep for ms milliseconds.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call the LLM with a timeout and retry logic.
 * @param {string} prompt
 * @returns {Promise<string>} raw text response
 */
async function callLLM(prompt) {
  let lastError;

  for (let attempt = 0; attempt <= LLM_MAX_RETRIES; attempt++) {
    try {
      const result = await Promise.race([
        _callProvider(prompt),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('LLM request timed out')), LLM_TIMEOUT_MS)
        ),
      ]);
      return result;
    } catch (err) {
      lastError = err;
      if (attempt < LLM_MAX_RETRIES) {
        const backoff = Math.pow(2, attempt) * 1000; // 1s, 2s
        console.warn(`LLM attempt ${attempt + 1} failed: ${err.message}. Retrying in ${backoff}ms...`);
        await sleep(backoff);
      }
    }
  }

  throw lastError;
}

/**
 * Dispatch to the configured LLM provider.
 */
async function _callProvider(prompt) {
  if (LLM_PROVIDER === 'anthropic') {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic.default({ apiKey: LLM_API_KEY });
    const message = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    return message.content[0].text;
  }

  if (LLM_PROVIDER === 'openai') {
    const OpenAI = require('openai');
    const client = new OpenAI.default({ apiKey: LLM_API_KEY });
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
    });
    return completion.choices[0].message.content;
  }

  if (LLM_PROVIDER === 'gemini') {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(LLM_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  throw new Error(`Unknown LLM provider: ${LLM_PROVIDER}`);
}

/**
 * Parse JSON from LLM output, handling markdown code fences.
 */
function parseJSON(text) {
  // Strip ```json ... ``` fences if present
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Generate a pre-visit summary from patient symptoms.
 * @param {string} symptoms
 * @returns {Promise<{urgency_level: string, chief_complaint: string, suggested_questions: string[]}>}
 */
async function generatePreVisitSummary(symptoms) {
  const prompt = `Analyse these symptoms and return a JSON object with exactly these fields:
- urgency_level: one of "Low", "Medium", or "High"
- chief_complaint: a one-sentence description of the main complaint
- suggested_questions: an array of exactly 3 questions the doctor should ask

Respond ONLY with valid JSON, no extra text.

Symptoms: ${symptoms}`;

  try {
    const raw = await callLLM(prompt);
    const parsed = parseJSON(raw);
    return {
      urgency_level: parsed.urgency_level || 'Low',
      chief_complaint: parsed.chief_complaint || '',
      suggested_questions: Array.isArray(parsed.suggested_questions) ? parsed.suggested_questions.slice(0, 3) : [],
    };
  } catch (err) {
    console.error('generatePreVisitSummary failed:', err.message);
    return { status: 'llm_failed', raw: symptoms };
  }
}

/**
 * Generate a post-visit summary from clinical notes.
 * @param {string} clinicalNotes
 * @returns {Promise<{summary_text: string, medication_schedule: object[], follow_up_steps: string[]}>}
 */
async function generatePostVisitSummary(clinicalNotes) {
  const prompt = `Convert these clinical notes into a patient-friendly summary. Return a JSON object with exactly these fields:
- summary_text: a plain-language summary of the visit (2-3 sentences)
- medication_schedule: an array of objects, each with { medication, dose, frequency, duration }
- follow_up_steps: an array of strings describing next steps for the patient

Respond ONLY with valid JSON, no extra text.

Clinical notes: ${clinicalNotes}`;

  try {
    const raw = await callLLM(prompt);
    const parsed = parseJSON(raw);
    return {
      summary_text: parsed.summary_text || '',
      medication_schedule: Array.isArray(parsed.medication_schedule) ? parsed.medication_schedule : [],
      follow_up_steps: Array.isArray(parsed.follow_up_steps) ? parsed.follow_up_steps : [],
    };
  } catch (err) {
    console.error('generatePostVisitSummary failed:', err.message);
    return { status: 'llm_failed', raw: clinicalNotes };
  }
}

module.exports = { generatePreVisitSummary, generatePostVisitSummary };
