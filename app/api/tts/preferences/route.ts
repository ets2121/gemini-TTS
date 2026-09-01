import { NextRequest, NextResponse } from 'next/server';
import { getStoredPreferences, saveStoredPreferences } from '@/lib/db';

export async function GET() {
  try {
    const preferences = await getStoredPreferences();
    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error: any) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load preferences' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = await saveStoredPreferences(body);
    return NextResponse.json({
      success: true,
      preferences: updated,
    });
  } catch (error: any) {
    console.error('Error saving preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save preferences' },
      { status: 500 }
    );
  }
}
