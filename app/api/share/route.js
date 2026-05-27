import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { documentId, groupId, groupName, inviteEmail, userId } = await request.json()

    let finalGroupId = groupId

    // Create group if no groupId provided
    if (!groupId && groupName) {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({ name: groupName, owner_id: userId })
        .select()
        .single()

      if (groupError) return NextResponse.json({ error: groupError.message }, { status: 500 })
      finalGroupId = group.id
    }

    // Find user by email
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', inviteEmail)
      .single()

    if (!existingProfile) {
      return NextResponse.json({ error: 'No user found with that email. They need to sign up first.' }, { status: 404 })
    }

    // Add user to group
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({ group_id: finalGroupId, user_id: existingProfile.id })

    if (memberError && !memberError.message.includes('duplicate')) {
      return NextResponse.json({ error: memberError.message }, { status: 500 })
    }

    // Link document to group
    if (documentId) {
      await supabase
        .from('documents')
        .update({ group_id: finalGroupId })
        .eq('id', documentId)
    }

    return NextResponse.json({ success: true, groupId: finalGroupId })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
