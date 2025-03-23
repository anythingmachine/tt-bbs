'use client';

import React, { useState } from 'react';
import { useAuth } from '..';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await login(username, password);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-md w-full max-w-md shadow-md">
      <h2 className="text-xl text-green-400 mb-6 font-bold">Login to TT-BBS</h2>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="username" className="block text-green-400 mb-1">
            Username
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded py-2 px-3 focus:outline-none focus:border-green-500"
            required
          />
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="block text-green-400 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded py-2 px-3 focus:outline-none focus:border-green-500"
            required
          />
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-900 border border-red-700 text-red-100 rounded">
            {error}
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
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
