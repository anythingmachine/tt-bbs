'use client';

import React from 'react';
import AuthScreenWrapper from './components/auth/AuthScreenWrapper';
import TerminalAudio from './components/TerminalAudio';
import { AuthProvider } from './context/AuthContext';

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
