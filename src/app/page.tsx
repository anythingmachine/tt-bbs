'use client';

import React from 'react';
import { AuthProvider, AuthScreenWrapper } from './features/auth';
import { TerminalAudio } from './features/terminal';

export default function Home() {
  return (
    <AuthProvider>
      <div className="h-screen w-screen overflow-hidden">
        <AuthScreenWrapper typingSpeed={1} />
        <TerminalAudio />
      </div>
    </AuthProvider>
  );
}
