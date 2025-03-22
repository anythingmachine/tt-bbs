'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import Terminal from '../Terminal';
import AuthScreen from './AuthScreen';

interface AuthScreenWrapperProps {
  typingSpeed?: number;
}

export default function AuthScreenWrapper({ typingSpeed = 5 }: AuthScreenWrapperProps) {
  const { isLoggedIn, isLoading } = useAuth();

  // Display a loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-gray-900">
        <div className="text-green-400 text-2xl animate-pulse">
          Loading TT-BBS...
        </div>
      </div>
    );
  }

  // If logged in, show the Terminal, otherwise show the login/register screen
  return isLoggedIn ? (
    <Terminal typingSpeed={typingSpeed} />
  ) : (
    <AuthScreen />
  );
} 