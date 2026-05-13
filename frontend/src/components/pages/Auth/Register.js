'use client';

import React, { useState, useContext } from 'react';
import { store } from '@/src/components/stateManagement/store';
import api from '@/src/components/utils/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { dispatch } = useContext(store);
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      // 1. Register the user
      await api.post('auth/register/', { username, email, password });
      
      // 2. Automatically log them in after registration
      const loginRes = await api.post('auth/login/', { username, password });
      const { access, refresh } = loginRes.data;
      
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      
      // 3. Fetch user profile — now includes groups array and computed role
      const userRes = await api.get('users/me/');
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: userRes.data.username,
          display_name: userRes.data.display_name,
          accessToken: access,
          role: userRes.data.role,             // computed top-level role string
          groups: userRes.data.groups || [],   // primary source of truth for permissions
        }
      });
      
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.username?.[0] || err.response?.data?.password?.[0] || 'Registration failed');
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[70vh] bg-main-bg">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-primary">Register</h2>
        
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
        
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email (optional)</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary"
              required
            />
          </div>
          <button type="submit" className="mt-4 bg-primary text-white font-bold py-2 px-4 rounded hover:bg-[#008f87] transition-colors">
            Create Account
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account? <Link href="/login" className="text-primary hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
