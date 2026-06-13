
exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY;
  if (!DEEPSEEK_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { text, lang, style } = body;
  if (!text || !lang) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing text or lang' }) };
  }

  // Word limit check
  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount > 500) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Text exceeds 500 words' }) };
  }

  const styleMap = {
    natural: 'natural and fluent, conversational tone',
    academic: 'academic but remove AI clichés, use specific vocabulary',
    business: 'clear and persuasive, remove hollow phrases',
    casual: 'casual and personal, like a real blogger'
  };

  const systemPrompt = lang === 'English'
    ? `You are a professional editor specializing in removing AI writing patterns. Rewrite the text to sound authentically human.

Rules:
- Remove filler phrases: "Furthermore", "It is worth noting", "In conclusion", "Moreover", "It is important to note", "It is crucial to", "Delve into"
- Break repetitive parallel structures
- Vary sentence length (mix short punchy sentences with longer flowing ones)
- Add natural transitions and occasional informal elements
- Keep ALL original information and meaning intact
- Style: ${styleMap[style] || 'natural and fluent'}
- Output ONLY the rewritten text, no explanations or preamble`
    : `Ты профессиональный редактор по устранению признаков ИИ-текста. Перепиши текст так, чтобы он звучал как живой человек.

Правила:
- Убери шаблонные фразы ИИ ("Следует отметить", "Таким образом", "В заключение" и т.д.)
- Разбей однообразные параллельные конструкции
- Варьируй длину предложений
- Сохрани весь смысл и информацию оригинала
- Стиль: ${styleMap[style] || 'естественный и живой'}
- Выведи ТОЛЬКО переписанный текст, без пояснений`;

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 2000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ]
      })
    });

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content;

    if (!result) {
      return { statusCode: 500, body: JSON.stringify({ error: 'No result from API' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API request failed', detail: err.message })
    };
  }
};
