import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API_BASE from '../config';
import {
  Save,
  Shield,
  Bell,
  Database,
  Cloud,
  Key,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

const API_URL = `${API_BASE}/api`;

export default function Settings() {
  const { token } = useAuth();
  const [settings, setSettings] = useState({
    app_name: 'ScanUp',
    max_file_size: 10,
    max_pages_per_doc: 50,
    free_scan_limit: 10,
    premium_price: 4.99,
    enable_ocr: true,
    enable_cloud_sync: true,
    enable_guest_mode: true,
    maintenance_mode: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);

  useEffect(() => {
    fetchSettings();
    fetchSystemStatus();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSettings({ ...settings, ...data });
      }
    } catch (e) {
      console.error('Failed to fetch settings:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/system-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSystemStatus(data);
      }
    } catch (e) {
      console.error('Failed to fetch system status:', e);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        alert('Settings saved successfully!');
      }
    } catch (e) {
      console.error('Failed to save settings:', e);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Configure your application</p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* System Status */}
      {systemStatus && (
        <div className="stat-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Database size={20} />
            System Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'Database', status: systemStatus.database, icon: Database },
              { name: 'Storage (S3)', status: systemStatus.storage, icon: Cloud },
              { name: 'API', status: systemStatus.api, icon: RefreshCw },
            ].map((service) => (
              <div key={service.name} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <service.icon className="text-gray-400" size={24} />
                <div>
                  <p className="font-medium text-gray-900">{service.name}</p>
                  <p className={`text-sm flex items-center gap-1 ${
                    service.status === 'connected' ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    {service.status === 'connected' ? (
                      <><CheckCircle size={14} /> Connected</>
                    ) : (
                      <><AlertTriangle size={14} /> Disconnected</>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* General Settings */}
      <div className="stat-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">App Name</label>
              <input
                type="text"
                value={settings.app_name}
                onChange={(e) => updateSetting('app_name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max File Size (MB)</label>
              <input
                type="number"
                value={settings.max_file_size}
                onChange={(e) => updateSetting('max_file_size', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Pages per Document</label>
              <input
                type="number"
                value={settings.max_pages_per_doc}
                onChange={(e) => updateSetting('max_pages_per_doc', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Free User Scan Limit</label>
              <input
                type="number"
                value={settings.free_scan_limit}
                onChange={(e) => updateSetting('free_scan_limit', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="stat-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Toggles</h3>
        <div className="space-y-4">
          {[
            { key: 'enable_ocr', label: 'Enable OCR', description: 'Allow text extraction from scanned documents' },
            { key: 'enable_cloud_sync', label: 'Enable Cloud Sync', description: 'Sync documents across devices' },
            { key: 'enable_guest_mode', label: 'Enable Guest Mode', description: 'Allow users to use app without account' },
            { key: 'maintenance_mode', label: 'Maintenance Mode', description: 'Show maintenance message to users', danger: true },
          ].map((toggle) => (
            <div key={toggle.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className={`font-medium ${toggle.danger ? 'text-red-600' : 'text-gray-900'}`}>{toggle.label}</p>
                <p className="text-sm text-gray-500">{toggle.description}</p>
              </div>
              <button
                onClick={() => updateSetting(toggle.key, !settings[toggle.key])}
                className={`relative w-14 h-8 rounded-full transition ${
                  settings[toggle.key]
                    ? toggle.danger ? 'bg-red-500' : 'bg-emerald-500'
                    : 'bg-gray-300'
                }`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition ${
                  settings[toggle.key] ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="stat-card border-2 border-red-200">
        <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center gap-2">
          <AlertTriangle size={20} />
          Danger Zone
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <p className="font-medium text-red-900">Clear All Documents</p>
              <p className="text-sm text-red-600">Delete all documents from all users. This cannot be undone.</p>
            </div>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
              Clear All
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <p className="font-medium text-red-900">Reset Database</p>
              <p className="text-sm text-red-600">Reset all data to default state. This cannot be undone.</p>
            </div>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
