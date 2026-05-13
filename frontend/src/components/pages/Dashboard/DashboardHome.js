'use client';

import React, { useEffect, useState, useContext, useCallback } from 'react';
import api from '@/src/components/utils/api';
import { store } from '@/src/components/stateManagement/store';
import Link from 'next/link';

// ─── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon, color, sub }) => (
  <div className={`bg-white rounded-xl shadow-sm border-l-4 ${color} p-6 flex items-start gap-4`}>
    <div className="text-3xl opacity-80">{icon}</div>
    <div>
      <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-4xl font-extrabold text-gray-800 mt-1">
        {value === null ? <span className="text-2xl text-gray-300 animate-pulse">—</span> : value.toLocaleString()}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  </div>
);

// ─── Top Posts Table ───────────────────────────────────────────────────────────
const TopPostsTable = ({ posts, isAdmin }) => {
  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 italic">
        No published posts to display yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left">
            <th className="pb-3 pr-4 font-bold text-gray-500 uppercase tracking-wide text-xs">Post</th>
            {isAdmin && <th className="pb-3 pr-4 font-bold text-gray-500 uppercase tracking-wide text-xs">Author</th>}
            <th className="pb-3 font-bold text-gray-500 uppercase tracking-wide text-xs text-right">Views</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((p, i) => (
            <tr key={p.slug} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
              <td className="py-3 pr-4">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shrink-0
                    ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'}`}>
                    {i + 1}
                  </span>
                  <Link
                    href={`/${p.slug}`}
                    target="_blank"
                    className="font-semibold text-gray-700 hover:text-primary transition-colors line-clamp-1 group-hover:underline"
                  >
                    {p.title}
                  </Link>
                </div>
              </td>
              {isAdmin && (
                <td className="py-3 pr-4 text-gray-500 text-xs font-mono">{p.author__username}</td>
              )}
              <td className="py-3 text-right">
                <span className="font-bold text-primary">
                  {(p.view_count || 0).toLocaleString()}
                </span>
                <span className="text-gray-400 ml-1 text-xs">views</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const DashboardHome = () => {
  const { state: { user, role, groups } } = useContext(store);

  // Groups are the primary source of truth; role is kept for display
  const inGroup = (...names) => {
    if (Array.isArray(groups) && groups.length > 0) return names.some(n => groups.includes(n));
    return role ? names.includes(role) : false;
  };
  const isAdmin  = inGroup('admin');
  const isEditor = inGroup('editor', 'admin');

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mineOnly, setMineOnly] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async (scopeMine) => {
    setLoading(true);
    setError(null);
    try {
      const url = isAdmin
        ? `/blogs/stats/${scopeMine ? '?mine=true' : ''}`
        : '/blogs/stats/';
      const res = await api.get(url);
      setStats(res.data);
    } catch (err) {
      setError('Failed to load dashboard stats.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (user) fetchStats(mineOnly);
  }, [user, mineOnly, fetchStats]);

  const handleToggleScope = () => {
    const next = !mineOnly;
    setMineOnly(next);
  };

  const scopeLabel = isAdmin
    ? (mineOnly ? 'My Posts' : 'Platform-wide')
    : 'My Posts';

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 font-poppins">
            {isAdmin ? '📊 Platform Overview' : '📝 My Dashboard'}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Welcome back, <span className="font-bold text-gray-700">{user}</span>
            {' · '}
            <span className="capitalize text-primary font-semibold">{role}</span>
          </p>
        </div>

        {/* Admin scope toggle */}
        {isAdmin && (
          <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm border border-gray-100 p-1">
            <button
              onClick={() => setMineOnly(false)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${!mineOnly ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <i className="fa-solid fa-globe mr-2"></i>All Posts
            </button>
            <button
              onClick={() => setMineOnly(true)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mineOnly ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <i className="fa-solid fa-user mr-2"></i>My Posts
            </button>
          </div>
        )}
      </div>

      {/* Scope badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Showing:</span>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${isAdmin && !mineOnly ? 'bg-purple-100 text-purple-700' : 'bg-primary/10 text-primary'}`}>
          {scopeLabel}
        </span>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}

      {/* Primary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          label="New Post"
          value={loading ? null : stats?.new_posts}
          icon="✨"
          color="border-purple-500"
          sub="Published this week"
        />
        <StatCard
          label="Total Visitors"
          value={loading ? null : stats?.total_visitors}
          icon="👥"
          color="border-blue-500"
          sub="Unique platform visits"
        />
        <StatCard
          label="New Subscribers"
          value={loading ? null : stats?.new_subscribers}
          icon="📧"
          color="border-pink-500"
          sub="Newsletter community"
        />
        <StatCard
          label="Blog Reads"
          value={loading ? null : stats?.total_views}
          icon="📖"
          color="border-orange-500"
          sub="Total article views"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          label="Drafts"
          value={loading ? null : stats?.drafts}
          icon="📝"
          color="border-gray-300"
          sub="Work in progress"
        />
        <StatCard
          label="Under Review"
          value={loading ? null : stats?.pending}
          icon="⏳"
          color="border-yellow-400"
          sub="Awaiting approval"
        />
        <StatCard
          label="Total Posts"
          value={loading ? null : stats?.total_posts}
          icon="📄"
          color="border-primary"
          sub="All-time content"
        />
      </div>

      {/* Top Posts */}
      <div className="bg-white rounded-xl shadow-sm p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 font-poppins">
            🏆 Top Posts by Views
            <span className="ml-2 text-sm font-normal text-gray-400">({scopeLabel})</span>
          </h2>
          <Link
            href="/dashboard/drafts"
            className="text-sm font-bold text-primary hover:underline"
          >
            Manage all →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : (
          <TopPostsTable posts={stats?.top_posts} isAdmin={isAdmin && !mineOnly} />
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6 lg:p-8">
        <h2 className="text-xl font-bold text-gray-800 font-poppins mb-5">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/dashboard/compose" className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-primary hover:bg-primary/5 transition-all group">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all text-primary font-bold text-lg">
              <i className="fa-solid fa-pen-nib text-sm"></i>
            </div>
            <div>
              <p className="font-bold text-gray-700 text-sm">Write New Post</p>
              <p className="text-xs text-gray-400">Start a new draft</p>
            </div>
          </Link>

          <Link href="/dashboard/drafts" className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all group">
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all text-indigo-500 font-bold text-lg">
              <i className="fa-solid fa-layer-group text-sm"></i>
            </div>
            <div>
              <p className="font-bold text-gray-700 text-sm">
                {isAdmin ? 'Content Manager' : 'My Drafts'}
              </p>
              <p className="text-xs text-gray-400">
                {isAdmin ? 'Manage all platform content' : 'View and edit your drafts'}
              </p>
            </div>
          </Link>

          {isEditor && (
            <Link href="/dashboard/inbox" className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-yellow-400 hover:bg-yellow-50 transition-all group">
              <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center group-hover:bg-yellow-400 group-hover:text-white transition-all text-yellow-600 font-bold text-lg">
                <i className="fa-solid fa-inbox text-sm"></i>
              </div>
              <div>
                <p className="font-bold text-gray-700 text-sm">Editor Inbox</p>
                <p className="text-xs text-gray-400">
                  {stats?.pending > 0 ? `${stats.pending} post${stats.pending !== 1 ? 's' : ''} waiting` : 'Review submissions'}
                </p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
