'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function RegisterForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  
  const { register, isLoading, error, clearError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormError(null);
    
    // Validate password match
    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    
    // Validate username length
    if (username.length < 3) {
      setFormError('Username must be at least 3 characters long');
      return;
    }
    
    // Validate password complexity
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long');
      return;
    }
    
    // Submit registration
    await register(username, password, displayName || username, email || undefined);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-md w-full max-w-md shadow-md">
      <h2 className="text-xl text-green-400 mb-6 font-bold">Create a New Account</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="username" className="block text-green-400 mb-1">
            Username *
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded py-2 px-3 focus:outline-none focus:border-green-500"
            required
          />
          <p className="text-gray-400 text-xs mt-1">
            Must be at least 3 characters. This will be your login name.
          </p>
        </div>
        
        <div className="mb-4">
          <label htmlFor="displayName" className="block text-green-400 mb-1">
            Display Name
          </label>
          <input
            type="text"
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded py-2 px-3 focus:outline-none focus:border-green-500"
          />
          <p className="text-gray-400 text-xs mt-1">
            Your public name shown to others. If empty, your username will be used.
          </p>
        </div>
        
        <div className="mb-4">
          <label htmlFor="email" className="block text-green-400 mb-1">
            Email (Optional)
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded py-2 px-3 focus:outline-none focus:border-green-500"
          />
          <p className="text-gray-400 text-xs mt-1">
            Used for account recovery only. We won't send you spam.
          </p>
        </div>
        
        <div className="mb-4">
          <label htmlFor="password" className="block text-green-400 mb-1">
            Password *
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded py-2 px-3 focus:outline-none focus:border-green-500"
            required
          />
          <p className="text-gray-400 text-xs mt-1">
            Must be at least 6 characters long.
          </p>
        </div>
        
        <div className="mb-6">
          <label htmlFor="confirmPassword" className="block text-green-400 mb-1">
            Confirm Password *
          </label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded py-2 px-3 focus:outline-none focus:border-green-500"
            required
          />
        </div>
        
        {(error || formError) && (
          <div className="mb-4 p-2 bg-red-900 border border-red-700 text-red-100 rounded">
            {formError || error}
          </div>
        )}
        
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-2 px-4 rounded ${
            isLoading
              ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isLoading ? 'Creating Account...' : 'Register'}
        </button>
      </form>
    </div>
  );
} 