import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config';

export default function Notifications() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [sendToAll, setSendToAll] = useState(true);
  const [notification, setNotification] = useState({
    title: '',
    body: '',
    data: {}
  });
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Filter users with push tokens
        const usersWithTokens = data.users.filter(u => u.push_token);
        setUsers(usersWithTokens);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!notification.title || !notification.body) {
      alert('Please enter both title and body');
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const payload = {
        title: notification.title,
        body: notification.body,
        data: notification.data,
        user_ids: sendToAll ? null : selectedUsers
      };

      const response = await fetch(`${API_BASE_URL}/admin/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult({
          success: true,
          message: `Sent to ${data.sent_count} users (${data.failed_count} failed)`
        });
        
        // Add to history
        setHistory(prev => [{
          timestamp: new Date().toISOString(),
          title: notification.title,
          body: notification.body,
          sent_count: data.sent_count,
          failed_count: data.failed_count
        }, ...prev.slice(0, 9)]);
        
        // Clear form
        setNotification({ title: '', body: '', data: {} });
      } else {
        setResult({
          success: false,
          message: data.detail || 'Failed to send notification'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error.message || 'Network error'
      });
    }
    
    setSending(false);
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    setSelectedUsers(users.map(u => u.user_id));
  };

  const deselectAllUsers = () => {
    setSelectedUsers([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Push Notifications</h1>
          <p className="text-gray-600">Send push notifications to your users</p>
        </div>
        <div className="bg-emerald-50 px-4 py-2 rounded-lg">
          <span className="text-emerald-700 font-medium">
            {users.length} users with push enabled
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Notification */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            📤 Compose Notification
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={notification.title}
                onChange={(e) => setNotification(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter notification title..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                maxLength={50}
              />
              <p className="text-xs text-gray-500 mt-1">{notification.title.length}/50 characters</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Body *
              </label>
              <textarea
                value={notification.body}
                onChange={(e) => setNotification(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Enter notification body..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">{notification.body.length}/200 characters</p>
            </div>

            {/* Target Selection */}
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={sendToAll}
                    onChange={() => setSendToAll(true)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">All users ({users.length})</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!sendToAll}
                    onChange={() => setSendToAll(false)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Selected users ({selectedUsers.length})
                  </span>
                </label>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-2">Preview</p>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg">📄</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">
                      {notification.title || 'Notification Title'}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {notification.body || 'Notification body text will appear here...'}
                    </p>
                  </div>
                  <span className="text-gray-500 text-xs">now</span>
                </div>
              </div>
            </div>

            {/* Result */}
            {result && (
              <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {result.success ? '✅' : '❌'} {result.message}
              </div>
            )}

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={sending || !notification.title || !notification.body}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                sending || !notification.title || !notification.body
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {sending ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending...
                </span>
              ) : (
                `Send to ${sendToAll ? users.length : selectedUsers.length} users`
              )}
            </button>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Templates */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">⚡ Quick Templates</h3>
            <div className="space-y-2">
              {[
                { title: '🎉 New Feature!', body: 'Check out our latest feature in ScanUp!' },
                { title: '💰 Special Offer', body: 'Get 50% off Premium subscription - Limited time!' },
                { title: '📢 App Update', body: 'A new version of ScanUp is available. Update now!' },
                { title: '🔔 Reminder', body: "Don't forget to scan your important documents!" },
              ].map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => setNotification({ ...notification, title: template.title, body: template.body })}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors"
                >
                  <p className="font-medium text-sm text-gray-900">{template.title}</p>
                  <p className="text-xs text-gray-500 truncate">{template.body}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Recent History */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📜 Recent Notifications</h3>
            {history.length === 0 ? (
              <p className="text-gray-500 text-sm">No notifications sent yet</p>
            ) : (
              <div className="space-y-3">
                {history.map((item, idx) => (
                  <div key={idx} className="border-b border-gray-100 pb-2 last:border-0">
                    <p className="font-medium text-sm text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.body}</p>
                    <p className="text-xs text-emerald-600 mt-1">
                      Sent to {item.sent_count} users • {new Date(item.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Selection (when not sending to all) */}
      {!sendToAll && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">👥 Select Users</h3>
            <div className="space-x-2">
              <button
                onClick={selectAllUsers}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Select All
              </button>
              <button
                onClick={deselectAllUsers}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Deselect All
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : users.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No users with push notifications enabled</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {users.map((user) => (
                <label
                  key={user.user_id}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedUsers.includes(user.user_id)
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.user_id)}
                    onChange={() => toggleUserSelection(user.user_id)}
                    className="h-4 w-4 text-emerald-600 rounded"
                  />
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  {user.subscription_type === 'premium' && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                      Premium
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
