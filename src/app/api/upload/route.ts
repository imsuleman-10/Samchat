import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side upload using service role key — bypasses RLS completely
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as string; // 'image' | 'audio'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split('.').pop() || (fileType === 'audio' ? 'webm' : 'jpg');
    const folder = fileType === 'audio' ? 'chat-audio' : 'chat-images';
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('media')
      .upload(fileName, buffer, {
        contentType: file.type || (fileType === 'audio' ? 'audio/webm' : 'image/jpeg'),
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage.from('media').getPublicUrl(fileName);

    return NextResponse.json({ url: data.publicUrl });
  } catch (err: any) {
    console.error('Server upload error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
