// /api/moderate — checks a fan's message against OpenAI's Moderation API.
//
// Called by the BidButton client before proceeding to /api/checkout.
// If the message is flagged (hate, violence, sexual, etc.), the bid is
// blocked and the fan sees "Message not allowed" with a reason.

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ModerationResult } from '@/types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Human-readable labels for OpenAI moderation categories
const CATEGORY_LABELS: Record<string, string> = {
  hate: 'hate speech',
  'hate/threatening': 'threatening hate speech',
  harassment: 'harassment',
  'harassment/threatening': 'threatening harassment',
  'self-harm': 'self-harm content',
  'self-harm/intent': 'self-harm intent',
  'self-harm/instructions': 'self-harm instructions',
  sexual: 'sexual content',
  'sexual/minors': 'sexual content involving minors',
  violence: 'violent content',
  'violence/graphic': 'graphic violence',
};

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ allowed: true } satisfies ModerationResult);
    }

    const moderation = await openai.moderations.create({
      input: message,
    });

    const result = moderation.results[0];

    if (result.flagged) {
      // Find the first flagged category to give the fan a reason
      const flaggedCategory = Object.entries(result.categories).find(
        ([, flagged]) => flagged
      );
      const reason = flaggedCategory
        ? `Message contains ${CATEGORY_LABELS[flaggedCategory[0]] || flaggedCategory[0]}`
        : 'Message was flagged by our content filter';

      return NextResponse.json({
        allowed: false,
        reason,
      } satisfies ModerationResult);
    }

    return NextResponse.json({ allowed: true } satisfies ModerationResult);
  } catch (error) {
    console.error('Moderation API error:', error);
    // Fail open — if the moderation API is down, allow the message through
    // rather than blocking all bids. The webhook can re-check if needed.
    return NextResponse.json({ allowed: true } satisfies ModerationResult);
  }
}
