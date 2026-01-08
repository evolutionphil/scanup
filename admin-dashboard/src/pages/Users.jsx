import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API_BASE from '../config';
import {
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  Download,
  X,
  Crown,
  Mail,
  Calendar,
  FileText,
  Shield,
  User,
  CreditCard,
  Clock,
  Smartphone,
  Globe,
  Edit,
  Save
} from 'lucide-react';

const API_URL = `${API_BASE}/api`;

export default function Users() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [editForm, setEditForm] = useState({
    subscription_type: 'free',
    is_premium: false,
    has_removed_ads: false,
    has_removed_watermark: false,
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [search, filter]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filter !== 'all') params.append('filter', filter);
      params.append('limit', '50');

      const res = await fetch(`${API_URL}/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUserDetails(data);
      }
    } catch (e) {
      console.error('Failed to fetch user details:', e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewUser = async (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
    await fetchUserDetails(user.user_id);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditForm({
      subscription_type: user.subscription_type || 'free',
      is_premium: user.subscription_type === 'premium' || user.is_premium || false,
      has_removed_ads: user.has_removed_ads || false,
      has_removed_watermark: user.has_removed_watermark || false,
      notes: user.admin_notes || ''
    });
    setSaveSuccess(false);
    setSaveError('');
    setShowEditModal(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    
    setSaving(true);
    setSaveSuccess(false);
    setSaveError('');
    
    try {
      const res = await fetch(`${API_URL}/admin/users/${selectedUser.user_id}`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription_type: editForm.subscription_type,
          is_premium: editForm.subscription_type === 'premium',
          has_removed_ads: editForm.has_removed_ads,
          has_removed_watermark: editForm.has_removed_watermark,
          notes: editForm.notes
        })
      });

      if (res.ok) {
        const updatedUser = await res.json();
        // Update users list
        setUsers(users.map(u => 
          u.user_id === selectedUser.user_id 
            ? { ...u, ...updatedUser }
            : u
        ));
        setSaveSuccess(true);
        setTimeout(() => {
          setShowEditModal(false);
          setSelectedUser(null);
          setSaveSuccess(false);
        }, 1500);
      } else {
        const error = await res.json();
        setSaveError(error.detail || 'Kullanıcı güncellenemedi');
      }
    } catch (e) {
      console.error('Failed to update user:', e);
      setSaveError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const res = await fetch(`${API_URL}/admin/users/${selectedUser.user_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setUsers(users.filter(u => u.user_id !== selectedUser.user_id));
        setShowDeleteModal(false);
        setSelectedUser(null);
      }
    } catch (e) {
      console.error('Failed to delete user:', e);
    }
  };

  const exportUsers = () => {
    const csv = [
      ['Email', 'Name', 'Documents', 'Subscription', 'Has Removed Ads', 'Login Type', 'Joined'].join(','),
      ...users.map(u => [
        u.email,
        u.name || '',
        u.document_count || 0,
        u.subscription_type || 'free',
        u.has_removed_ads ? 'Yes' : 'No',
        u.auth_provider || 'email',
        new Date(u.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scanup_users.csv';
    a.click();
  };

  const getSubscriptionBadge = (user) => {
    if (user.subscription_type === 'premium') {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-medium">
          <Crown size={12} /> Premium
        </span>
      );
    } else if (user.subscription_type === 'trial') {
      return (
        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
          <Clock size={12} /> Trial
        </span>
      );
    } else if (user.has_removed_ads) {
      return (
        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
          <Ban size={12} /> Ad-Free
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
          Free
        </span>
      );
    }
  };

  const getAuthProviderBadge = (provider) => {
    switch (provider) {
      case 'google':
        return (
          <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 px-2 py-1 rounded-full text-xs font-medium">
            <Globe size={12} /> Google
          </span>
        );
      case 'apple':
        return (
          <span className="inline-flex items-center gap-1 bg-gray-800 text-white px-2 py-1 rounded-full text-xs font-medium">
            <Smartphone size={12} /> Apple
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded-full text-xs font-medium">
            <Mail size={12} /> Email
          </span>
        );
    }
  };

  const getUserAvatar = (user) => {
    if (user.photo_url || user.avatar_url) {
      return (
        <img 
          src={user.photo_url || user.avatar_url} 
          alt={user.name || 'User'} 
          className="w-10 h-10 rounded-full object-cover"
        />
      );
    }
    return (
      <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
        <span className="text-white font-semibold">
          {user.email?.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">Manage your app users</p>
        </div>
        <button
          onClick={exportUsers}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="stat-card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'premium', 'trial', 'ad-free', 'free', 'google', 'recent'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-medium capitalize transition ${
                  filter === f
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'ad-free' ? 'Ad-Free' : f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="stat-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header py-4 px-4">User</th>
                  <th className="table-header py-4 px-4">Subscription</th>
                  <th className="table-header py-4 px-4">Login</th>
                  <th className="table-header py-4 px-4">Documents</th>
                  <th className="table-header py-4 px-4">Scans</th>
                  <th className="table-header py-4 px-4">Joined</th>
                  <th className="table-header py-4 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr 
                    key={user.user_id} 
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleViewUser(user)}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        {getUserAvatar(user)}
                        <div>
                          <div className="font-medium text-gray-900">{user.name || 'User'}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {getSubscriptionBadge(user)}
                    </td>
                    <td className="py-4 px-4">
                      {getAuthProviderBadge(user.auth_provider)}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-medium text-gray-900">{user.document_count || 0}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-medium text-gray-900">{user.scan_count || 0}</span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleViewUser(user); }}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditUser(user); }}
                          className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition"
                          title="Edit Subscription"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedUser(user); setShowDeleteModal(true); }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Delete User"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">User Details</h3>
              <button
                onClick={() => { setShowUserModal(false); setUserDetails(null); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            {loadingDetails ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : userDetails ? (
              <div className="p-6 space-y-6">
                {/* Profile Section */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {userDetails.photo_url || userDetails.avatar_url ? (
                      <img 
                        src={userDetails.photo_url || userDetails.avatar_url} 
                        alt={userDetails.name || 'User'} 
                        className="w-20 h-20 rounded-full object-cover border-4 border-emerald-100"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center border-4 border-emerald-100">
                        <span className="text-white font-bold text-2xl">
                          {userDetails.email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {userDetails.subscription_type === 'premium' && (
                      <div className="absolute -bottom-1 -right-1 bg-amber-400 rounded-full p-1">
                        <Crown size={14} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">{userDetails.name || 'No Name'}</h4>
                    <p className="text-gray-500">{userDetails.email}</p>
                    <div className="flex gap-2 mt-2">
                      {getSubscriptionBadge(userDetails)}
                      {getAuthProviderBadge(userDetails.auth_provider)}
                    </div>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Account Info */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h5 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <User size={16} /> Account Info
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">User ID:</span>
                        <span className="font-mono text-xs text-gray-700">{userDetails.user_id?.slice(0, 16)}...</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Name:</span>
                        <span className="text-gray-700">{userDetails.name || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email Verified:</span>
                        <span className={userDetails.email_verified ? 'text-green-600' : 'text-red-500'}>
                          {userDetails.email_verified ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Has Password:</span>
                        <span className={userDetails.has_password ? 'text-green-600' : 'text-gray-400'}>
                          {userDetails.has_password ? 'Yes' : 'No (OAuth only)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Subscription Info */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h5 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <CreditCard size={16} /> Subscription
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Type:</span>
                        <span className="font-medium text-gray-700 capitalize">{userDetails.subscription_type || 'Free'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Has Removed Ads:</span>
                        <span className={userDetails.has_removed_ads ? 'text-green-600' : 'text-gray-400'}>
                          {userDetails.has_removed_ads ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {userDetails.subscription_start && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Started:</span>
                          <span className="text-gray-700">{formatDate(userDetails.subscription_start)}</span>
                        </div>
                      )}
                      {userDetails.subscription_end && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Expires:</span>
                          <span className="text-gray-700">{formatDate(userDetails.subscription_end)}</span>
                        </div>
                      )}
                      {userDetails.trial_start_date && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Trial Started:</span>
                          <span className="text-gray-700">{formatDate(userDetails.trial_start_date)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Usage Stats */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h5 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <FileText size={16} /> Usage Stats
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Documents:</span>
                        <span className="font-medium text-gray-700">{userDetails.document_count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Scans:</span>
                        <span className="font-medium text-gray-700">{userDetails.scan_count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Scans Today:</span>
                        <span className="font-medium text-gray-700">{userDetails.daily_scan_count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">OCR Today:</span>
                        <span className="font-medium text-gray-700">{userDetails.daily_ocr_count || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h5 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Calendar size={16} /> Dates
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Joined:</span>
                        <span className="text-gray-700">{formatDate(userDetails.created_at)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Last Active:</span>
                        <span className="text-gray-700">{formatDate(userDetails.last_active || userDetails.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Google/OAuth Info */}
                {userDetails.auth_provider === 'google' && (
                  <div className="bg-red-50 rounded-xl p-4">
                    <h5 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                      <Globe size={16} /> Google Account Info
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-red-400">Google ID:</span>
                        <span className="font-mono text-xs text-red-700">{userDetails.google_id || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-400">Name from Google:</span>
                        <span className="text-red-700">{userDetails.google_name || userDetails.name || 'N/A'}</span>
                      </div>
                      {userDetails.photo_url && (
                        <div className="flex justify-between items-center">
                          <span className="text-red-400">Photo URL:</span>
                          <a href={userDetails.photo_url} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline text-xs">
                            View Photo
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => { setShowUserModal(false); setSelectedUser(userDetails); setShowDeleteModal(true); }}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    Delete User
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                Failed to load user details
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete User</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{selectedUser?.email}</strong>?
              This will also delete all their documents and cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setSelectedUser(null); }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
