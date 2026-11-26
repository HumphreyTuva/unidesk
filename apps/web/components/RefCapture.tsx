'use client';
import { useEffect } from 'react';
import { captureRef } from '@/lib/referral';

// Remembers an invite code from the link a friend shared. Renders nothing.
export default function RefCapture() {
  useEffect(() => { captureRef(); }, []);
  return null;
}
