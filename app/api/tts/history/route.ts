import { NextRequest, NextResponse } from 'next/server';
import {
  getAllHistory,
  toggleHistoryFavorite,
  deleteHistoryItem,
  clearAllHistory,
  getHistoryStats,
  getHistoryById,
} from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const favoriteOnly = searchParams.get('favoriteOnly') === 'true';
    const voiceName = searchParams.get('voiceName') || undefined;
    const id = searchParams.get('id');

    if (id) {
      const item = await getHistoryById(id);
      if (!item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      return NextResponse.json({ item });
    }

    const [items, stats] = await Promise.all([
      getAllHistory({ search, favoriteOnly, voiceName, limit: 100 }),
      getHistoryStats(),
    ]);

    return NextResponse.json({
      items,
      stats,
    });
  } catch (error: any) {
    console.error('Failed to get TTS history:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch history' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id } = body;

    if (action === 'toggleFavorite' && id) {
      const isFav = await toggleHistoryFavorite(id);
      return NextResponse.json({ success: true, isFavorite: isFav });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Failed to update TTS item:', error);
    return NextResponse.json({ error: error.message || 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const clearAll = searchParams.get('clearAll') === 'true';

    if (clearAll) {
      await clearAllHistory();
      return NextResponse.json({ success: true, message: 'History cleared' });
    }

    if (id) {
      await deleteHistoryItem(id);
      return NextResponse.json({ success: true, message: 'Item deleted' });
    }

    return NextResponse.json({ error: 'Missing id or clearAll parameter' }, { status: 400 });
  } catch (error: any) {
    console.error('Failed to delete history:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete' }, { status: 500 });
  }
}
