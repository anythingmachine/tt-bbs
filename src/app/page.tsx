'use client';

import { AuthProvider } from './context/AuthContext';
import AuthScreenWrapper from './components/auth/AuthScreenWrapper';
import TerminalAudio from './components/TerminalAudio';

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
