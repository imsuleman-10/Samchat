import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ---- Next.js: raise the default 4 MB body-size limit ----
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '150mb',
    },
  },
};

// Server-side upload using service role key — bypasses RLS completely
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB limit (Supabase free = 1 GB total)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as string; // 'image' | 'audio'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: `File too large. Maximum allowed size is 100 MB. Your file is ${(file.size / (1024*1024)).toFixed(1)} MB.` }, { status: 413 });
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
