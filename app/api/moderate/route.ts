// /api/moderate — checks a fan's message against OpenAI's moderation API.
//
// Called by /api/checkout before creating the Stripe session.
// If the message is flagged, the checkout is aborted and an error is shown.
// This prevents offensive content from appearing on public leaderboards.

import { NextRequest, NextResponse } from 'next/server';
import type { ModerationResult } from '@/types';

export async function POST(req: NextRequest) {
  // TODO: implement OpenAI moderation check
  const { message } = await req.json();

  const result: ModerationResult = { allowed: true };
  return NextResponse.json(result);
}
