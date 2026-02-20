import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API_BASE from '../config';
import {
  Settings,
  User,
  Lock,
  Mail,
  Plus,
  Trash2,
  Shield,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const API_URL = `${API_BASE}/api`;

export default function AdminSettings() {
  const { token, user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    currentPassword: '',
    newEmail: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  // New admin form
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({
    email: '',
    password: '',
    name: '',
    role: 'admin'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch current admin settings
      const settingsRes = await fetch(`${API_URL}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setCurrentAdmin(data.admin);
      }
      
      // Fetch all admins
      const adminsRes = await fetch(`${API_URL}/admin/admins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (adminsRes.ok) {
        const data = await adminsRes.json();
        setAdmins(data.admins || []);
      }
    } catch (e) {
      console.error('Failed to fetch admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    
    if (settingsForm.newPassword && settingsForm.newPassword !== settingsForm.confirmPassword) {
      showMessage('error', 'New passwords do not match');
      return;
    }
    
    if (!settingsForm.currentPassword) {
      showMessage('error', 'Current password is required');
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: settingsForm.currentPassword,
          new_email: settingsForm.newEmail || null,
          new_password: settingsForm.newPassword || null,
        }),
      });
      
      if (res.ok) {
        showMessage('success', 'Settings updated successfully! Please login again with new credentials.');
        setSettingsForm({ currentPassword: '', newEmail: '', newPassword: '', confirmPassword: '' });
        // If email changed, logout
        if (settingsForm.newEmail) {
          setTimeout(() => logout(), 2000);
        }
      } else {
        const error = await res.json();
        showMessage('error', error.detail || 'Failed to update settings');
      }
    } catch (e) {
      showMessage('error', 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    
    if (!newAdminForm.email || !newAdminForm.password || !newAdminForm.name) {
      showMessage('error', 'All fields are required');
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newAdminForm),
      });
      
      if (res.ok) {
        showMessage('success', 'Admin created successfully!');
        setNewAdminForm({ email: '', password: '', name: '', role: 'admin' });
        setShowAddAdmin(false);
        fetchData();
      } else {
        const error = await res.json();
        showMessage('error', error.detail || 'Failed to create admin');
      }
    } catch (e) {
      showMessage('error', 'Failed to create admin');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (!confirm('Are you sure you want to delete this admin?')) return;
    
    try {
      const res = await fetch(`${API_URL}/admin/admins/${adminId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        showMessage('success', 'Admin deleted successfully!');
        fetchData();
      } else {
        const error = await res.json();
        showMessage('error', error.detail || 'Failed to delete admin');
      }
    } catch (e) {
      showMessage('error', 'Failed to delete admin');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and admin users</p>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
        }`}>
          {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          {message.text}
        </div>
      )}

      {/* Current Admin Info */}
      <div className="stat-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <User className="text-emerald-600" size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{currentAdmin?.name || 'Admin'}</h3>
            <p className="text-sm text-gray-500">{currentAdmin?.email}</p>
          </div>
          <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${
            currentAdmin?.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {currentAdmin?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
          </span>
        </div>
      </div>

      {/* Update Settings Form */}
      <div className="stat-card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings size={20} />
          Update Your Credentials
        </h2>
        
        <form onSubmit={handleUpdateSettings} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={settingsForm.currentPassword}
                onChange={(e) => setSettingsForm({ ...settingsForm, currentPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none pr-10"
                placeholder="Enter current password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Email (optional)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  value={settingsForm.newEmail}
                  onChange={(e) => setSettingsForm({ ...settingsForm, newEmail: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="New email address"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password (optional)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={settingsForm.newPassword}
                  onChange={(e) => setSettingsForm({ ...settingsForm, newPassword: e.target.value })}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="New password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
          
          {settingsForm.newPassword && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={settingsForm.confirmPassword}
                  onChange={(e) => setSettingsForm({ ...settingsForm, confirmPassword: e.target.value })}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}
          
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Update Settings'}
          </button>
        </form>
      </div>

      {/* Admin Users */}
      <div className="stat-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Shield size={20} />
            Admin Users
          </h2>
          <button
            onClick={() => setShowAddAdmin(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition"
          >
            <Plus size={18} />
            Add Admin
          </button>
        </div>
        
        <div className="space-y-3">
          {admins.map((admin) => (
            <div key={admin.admin_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <User className="text-emerald-600" size={18} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{admin.name}</p>
                  <p className="text-sm text-gray-500">{admin.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  admin.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </span>
                {!admin.is_default && admin.admin_id !== 'default_admin' && (
                  <button
                    onClick={() => handleDeleteAdmin(admin.admin_id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Admin Modal */}
      {showAddAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Admin</h3>
            
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newAdminForm.name}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="Admin name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newAdminForm.email}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="admin@example.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newAdminForm.password}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newAdminForm.role}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAdmin(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
