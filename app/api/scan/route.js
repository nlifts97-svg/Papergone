import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { imageBase64, mediaType } = await request.json()

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://papergone.vercel.app',
        'X-Title': 'PaperGone',
      },
      body: JSON.stringify({
        model: 'google/gemma-4-31b-it:free',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mediaType};base64,${imageBase64}` }
            },
            {
              type: 'text',
              text: `You are a document classification expert. Analyze this document image carefully.

Respond ONLY with a valid JSON object, no markdown, no explanation, no code blocks.

Rules:
- If you see a cash register receipt, store receipt, or purchase receipt → type MUST be "receipt"
- If you see a utility bill (electricity, water, gas, internet) → type MUST be "bill"  
- If you see an invoice with invoice number → type MUST be "invoice"
- If you see a contract or agreement → type MUST be "contract"
- If you see a warranty card or certificate → type MUST be "warranty"
- If you see an ID card, passport, or license → type MUST be "id"
- If you see a medical document → type MUST be "medical"
- If you see a tax document → type MUST be "tax"
- If you see an insurance document → type MUST be "insurance"
- If you see a handwritten note → type MUST be "note"
- Only use "other" if it truly doesn't fit any category above

JSON format:
{
  "type": "receipt|bill|invoice|contract|warranty|id|medical|tax|insurance|note|other",
  "title": "short descriptive title max 6 words",
  "summary": "one sentence describing what this document is",
  "fields": [{"key": "field name", "value": "extracted value"}],
  "folder": "suggested folder like Bills/Energy or Receipts/Supermarket",
  "reminder": null or "deadline description",
  "tags": ["tag1", "tag2"]
}`
            }
          ]
        }],
        max_tokens: 1000,
      })
    })

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content || '{}'
    const clean = raw.replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch {
      parsed = {
        type: 'other',
        title: 'Document',
        summary: 'Document uploaded successfully.',
        fields: [],
        folder: 'Other',
        reminder: null,
        tags: []
      }
    }

    return NextResponse.json(parsed)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
