import { NextResponse } from 'next/server';
import { getPresets } from '@/lib/db';

export async function GET() {
  try {
    const presets = await getPresets();
    return NextResponse.json({ presets });
  } catch (error: any) {
    console.error('Failed to get voice presets:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch presets' }, { status: 500 });
  }
}
