const Groq = require('groq-sdk');

// Groq free tier — no credit card required
// Llama 3.3 70B: best quality, 30 RPM free
// llama-3.1-8b-instant: fastest, 60 RPM free (fallback)
const PRIMARY_MODEL   = process.env.GROQ_MODEL   || 'llama-3.3-70b-versatile';
const FALLBACK_MODEL  = 'llama-3.1-8b-instant';

function getClient() {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set in .env');
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// ─── Format conversation history ──────────────────────────────────────────────
function formatHistory(messages) {
  return messages.slice(-8).map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content.substring(0, 400) // trim old messages to save tokens
  }));
}

// ─── Build system + user messages ────────────────────────────────────────────
function buildMessages({ userQuery, disease, patientName, intent, publications, trials, conversationHistory }) {
  const pubContext = publications.length > 0
    ? publications.slice(0, 6).map((p, i) =>
        `[PUB${i+1}] "${p.title}" — ${p.authors.slice(0,2).join(', ')} (${p.year}, ${p.source})\nAbstract: ${(p.abstract||'No abstract.').substring(0,350)}\nURL: ${p.url}`
      ).join('\n\n')
    : 'No publications retrieved.';

  const trialContext = trials.length > 0
    ? trials.slice(0, 4).map((t, i) =>
        `[TRIAL${i+1}] "${t.title}" (${t.nctId})\nStatus: ${t.status} | Phase: ${t.phase}\nSummary: ${(t.summary||'').substring(0,300)}\nLocations: ${t.locations.slice(0,2).join('; ')}\nURL: ${t.url}`
      ).join('\n\n')
    : 'No clinical trials retrieved.';

  const systemPrompt = `You are MedResearch AI, an expert medical research assistant. You provide structured, evidence-based answers using ONLY the provided research context. Never hallucinate. If the evidence is unclear, say so.

PATIENT CONTEXT:
${patientName ? `Patient: ${patientName}` : ''}
${disease ? `Primary Condition: ${disease}` : ''}
${intent ? `Specific Interest: ${intent}` : ''}
${!patientName && !disease ? 'General medical query' : ''}

RETRIEVED PUBLICATIONS (${publications.length} total, top 6 shown):
${pubContext}

RETRIEVED CLINICAL TRIALS (${trials.length} total, top 4 shown):
${trialContext}`;

  const userPrompt = `${userQuery}

Respond with this EXACT structure, using [PUB1], [PUB2], [TRIAL1] etc. to cite sources:

### 🏥 Condition Overview
2-3 sentence overview of the condition relevant to this query.

### 🔬 Research Insights
Key findings from the publications above. Cite every claim with [PUB1], [PUB2] etc. Minimum 3-4 specific insights.

### 🧪 Clinical Trials
Summarise relevant trials with [TRIAL1], [TRIAL2] etc. Include status, phase, and location.

### 💡 Key Takeaways
3-4 personalised, evidence-backed takeaways for this patient.

### ⚠️ Important Notice
This is for research purposes only. Always consult a qualified healthcare professional.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...formatHistory(conversationHistory || []),
    { role: 'user', content: userPrompt }
  ];

  return messages;
}

// ─── Streaming generate (writes SSE to res) ───────────────────────────────────
async function generateMedicalResponseStream({ res, userQuery, disease, patientName, intent, publications, trials, conversationHistory }) {
  const client = getClient();
  const messages = buildMessages({ userQuery, disease, patientName, intent, publications, trials, conversationHistory });

  let fullResponse = '';
  let model = PRIMARY_MODEL;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      console.log(`🤖 Groq streaming with ${model}...`);

      const stream = await client.chat.completions.create({
        model,
        messages,
        max_tokens: 1200,
        temperature: 0.3,
        top_p: 0.9,
        stream: true
      });

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || '';
        if (token) {
          fullResponse += token;
          res.write(`data: ${JSON.stringify({ token })}\n\n`);
        }
      }

      console.log(`✅ Groq stream complete — ${fullResponse.length} chars`);
      return fullResponse;

    } catch (err) {
      const status = err.status || err.response?.status;
      console.error(`Groq error (${model}): ${err.message}`);

      // Rate limit on primary → retry with smaller fallback model
      if (status === 429 && attempt === 0) {
        console.log(`⚠️  Rate limited on ${model}, switching to ${FALLBACK_MODEL}...`);
        model = FALLBACK_MODEL;
        continue;
      }

      // Any other error → stream fallback response
      console.log('Streaming fallback response...');
      const fallback = generateFallbackResponse({ userQuery, disease, publications, trials });
      fullResponse = await streamTextSmoothly(res, fallback);
      return fullResponse;
    }
  }

  return fullResponse;
}

// ─── Non-streaming (for internal use) ────────────────────────────────────────
async function generateMedicalResponse({ userQuery, disease, patientName, intent, publications, trials, conversationHistory }) {
  const client = getClient();
  const messages = buildMessages({ userQuery, disease, patientName, intent, publications, trials, conversationHistory });

  try {
    const completion = await client.chat.completions.create({
      model: PRIMARY_MODEL,
      messages,
      max_tokens: 1200,
      temperature: 0.3,
    });
    return completion.choices[0]?.message?.content || generateFallbackResponse({ userQuery, disease, publications, trials });
  } catch (err) {
    console.error('Groq batch error:', err.message);
    return generateFallbackResponse({ userQuery, disease, publications, trials });
  }
}

// ─── Smooth char-by-char SSE emission for fallback text ──────────────────────
async function streamTextSmoothly(res, text) {
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    res.write(`data: ${JSON.stringify({ token: ch })}\n\n`);
    let delay = 18;
    if (ch === '\n')           delay = 90;
    else if ('.!?'.includes(ch)) delay = 130;
    else if (',;:'.includes(ch)) delay = 65;
    else if (ch === ' ')       delay = 22;
    else if (ch === '#')       delay = 45;
    await new Promise(r => setTimeout(r, delay));
  }
  return text;
}

// ─── Fallback response ────────────────────────────────────────────────────────
function generateFallbackResponse({ userQuery, disease, publications, trials }) {
  const pubList = publications.slice(0, 6).map((p, i) =>
    `- **[PUB${i+1}]** ${p.title} (${p.year}) — ${p.authors.slice(0,2).join(', ')} — [View](${p.url})`
  ).join('\n');
  const trialList = trials.slice(0, 4).map((t, i) =>
    `- **[TRIAL${i+1}]** ${t.title} — Status: ${t.status} — [View](${t.url})`
  ).join('\n');

  return `### 🏥 Condition Overview
Research retrieved for: **${disease || userQuery}**

### 🔬 Research Insights
Retrieved ${publications.length} publications from PubMed and OpenAlex:

${pubList || 'No publications found for this query.'}

### 🧪 Clinical Trials
Retrieved ${trials.length} relevant clinical trials:

${trialList || 'No active trials found for this query.'}

### 💡 Key Takeaways
- Review the publications above for the latest evidence on ${disease || 'this condition'}
- Check ClinicalTrials.gov directly for full eligibility criteria

### ⚠️ Important Notice
This information is for research purposes only. Always consult a qualified healthcare professional.`;
}

module.exports = { generateMedicalResponseStream, generateMedicalResponse, generateFallbackResponse };