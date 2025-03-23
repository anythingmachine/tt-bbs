'use client';

import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

type AuthView = 'login' | 'register';

interface AuthScreenProps {
  onAuthSuccess?: () => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [currentView, setCurrentView] = useState<AuthView>('login');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gray-900 p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-green-400 mb-2">TT-BBS</h1>
        <p className="text-gray-400">Connect to the text-based community</p>
      </div>

      {currentView === 'login' ? (
        <>
          <LoginForm />
          <p className="mt-6 text-gray-400">
            Don&apos;t have an account?{' '}
            <button
              onClick={() => setCurrentView('register')}
              className="text-green-400 hover:underline"
            >
              Create one now
            </button>
          </p>
        </>
      ) : (
        <>
          <RegisterForm />
          <p className="mt-6 text-gray-400">
            Already have an account?{' '}
            <button
              onClick={() => setCurrentView('login')}
              className="text-green-400 hover:underline"
            >
              Login here
            </button>
          </p>
        </>
      )}

      <div className="mt-12 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} TT-BBS</p>
      </div>
    </div>
  );
}
