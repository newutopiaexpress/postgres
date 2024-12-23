'use client';

import React, { useState } from 'react';

interface PasswordProtectionProps {
  onCorrectPassword: () => void;
}

export function PasswordProtection({ onCorrectPassword }: PasswordProtectionProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Replace 'your-password-here' with your desired password
    if (password === 'LucyUtopia2024') {
      onCorrectPassword();
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Lucy Analytics</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              autoFocus
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm">Incorrect password</p>
          )}
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
