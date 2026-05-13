'use client';

import React, { useEffect, useState, useContext } from 'react';
import api from '@/src/components/utils/api';
import { store } from '@/src/components/stateManagement/store';
import { confirmModal, toast } from '@/src/components/utils/swal';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { state: { user: currentUser, role, groups } } = useContext(store);

  const inGroup = (...names) => {
    if (Array.isArray(groups) && groups.length > 0) return names.some(n => groups.includes(n));
    return role ? names.includes(role) : false;
  };
  const isAdmin = inGroup('admin');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users/');
      setUsers(res.data.results || res.data);
    } catch (err) {
      console.error("Failed to fetch users", err);
      toast.error("Failed to fetch user list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const handleToggleApproval = async (username, currentStatus) => {
    const action = currentStatus ? "Suspend" : "Approve";
    const result = await confirmModal(
      `${action} User?`,
      currentStatus 
        ? `This will deactivate ${username}'s account and prevent them from logging in.` 
        : `This will activate ${username}'s account and allow them to log in.`,
      `Yes, ${action.toLowerCase()} them`
    );

    if (!result.isConfirmed) return;

    try {
      await api.patch(`/users/${username}/approve/`, { is_approved: !currentStatus });
      toast.success(`User ${username} ${currentStatus ? 'suspended' : 'approved'} successfully`);
      fetchUsers();
    } catch (err) {
      toast.error(`Error updating user status`);
    }
  };

  const handleChangeRole = async (username, newRole) => {
    const result = await confirmModal(
      "Change User Role?",
      `Are you sure you want to change ${username} to ${newRole}?`,
      "Yes, change role"
    );

    if (!result.isConfirmed) return;

    try {
      await api.patch(`/users/${username}/role/`, { role: newRole });
      toast.success(`User ${username} is now a ${newRole}`);
      fetchUsers();
    } catch (err) {
      toast.error(`Error updating user role`);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg text-center">
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p>You do not have permission to access this section.</p>
      </div>
    );
  }

  if (loading) return <div className="p-10 text-center">Loading users...</div>;

  return (
    <div className="flex flex-col gap-8">
      <section className="bg-white rounded-lg shadow-sm p-6 lg:p-8">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <h1 className="text-2xl font-bold text-primary font-poppins">User Management</h1>
          <p className="text-sm text-gray-500 font-medium">Manage community members and permissions</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] font-bold tracking-widest">
                <th className="py-4 px-4">User</th>
                <th className="py-4 px-4">Role</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4">Joined</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-[#1e1e1e]">{u.username}</span>
                      <span className="text-xs text-gray-500">{u.email}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <select 
                      value={u.role}
                      onChange={(e) => handleChangeRole(u.username, e.target.value)}
                      disabled={u.username === currentUser}
                      className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs font-bold capitalize outline-none focus:border-primary"
                    >
                      <option value="contributor">Contributor</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${u.profile?.is_approved ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {u.profile?.is_approved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-xs text-gray-500">
                    {new Date(u.date_joined).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      {u.username !== currentUser && (
                        <button
                          onClick={() => handleToggleApproval(u.username, u.profile?.is_approved)}
                          className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                            u.profile?.is_approved 
                              ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          {u.profile?.is_approved ? 'Deactivate' : 'Approve'}
                        </button>
                      )}
                      <a 
                        href={`/author/${u.username}`}
                        target="_blank"
                        className="p-1.5 text-gray-400 hover:text-primary transition-colors"
                        title="View Profile"
                      >
                        <i className="fa-solid fa-external-link text-sm"></i>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-20 bg-gray-50 rounded-lg mt-4">
            <p className="text-gray-500">No users found.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default UserManagement;
