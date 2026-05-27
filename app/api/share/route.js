import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { documentId, groupId, inviteEmail, userId } = await request.json()

    if (inviteEmail) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', inviteEmail)
        .single()

      if (existingProfile) {
        await supabase.from('group_members').insert({
          group_id: groupId,
          user_id: existingProfile.id,
        })
      } else {
        await supabase.from('group_members').insert({
          group_id: groupId,
          invited_email: inviteEmail,
        })
      }
    }

    if (documentId && groupId) {
      await supabase
        .from('documents')
        .update({ group_id: groupId })
        .eq('id', documentId)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
