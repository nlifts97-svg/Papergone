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
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mediaType};base64,${imageBase64}` }
            },
            {
              type: 'text',
              text: `Analyze this document image and respond ONLY with a valid JSON object, no markdown, no explanation. Use these exact keys:
{
  "type": one of: "receipt", "bill", "invoice", "contract", "warranty", "id", "medical", "tax", "insurance", "note", "other",
  "title": short descriptive title max 6 words,
  "summary": one sentence describing what this document is,
  "fields": array of up to 8 objects with "key" and "value" for the most important extracted info (amounts, dates, names, companies, addresses),
  "folder": suggested folder path like "Bills/Energy/2026" or "Receipts/Amazon",
  "reminder": null or string describing a deadline or action needed like "Payment due June 15" or "Warranty expires 2027",
  "tags": array of 2-4 relevant tags
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
