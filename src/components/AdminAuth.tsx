import React, { useState, useEffect } from 'react';
import { authService, AdminUser } from '../services/authService';

interface AdminAuthProps {
  onAdminModeChange?: (isAdmin: boolean) => void;
}

const AdminAuth: React.FC<AdminAuthProps> = ({ onAdminModeChange }) => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allAdminUsers, setAllAdminUsers] = useState<AdminUser[]>([]);
  const [showAdminList, setShowAdminList] = useState(false);

  useEffect(() => {
    // Check if user is in admin mode
    setIsAdminMode(authService.isInAdminMode());
    
    // Get admin user if in admin mode
    if (authService.isInAdminMode()) {
      loadAdminUser();
    }
  }, []);

  const loadAdminUser = async () => {
    try {
      const user = await authService.getAdminUser();
      setAdminUser(user);
    } catch (error) {
      console.error('Error loading admin user:', error);
      setError('Failed to load admin user');
    }
  };

  const handleSwitchToAdminMode = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await authService.switchToAdminMode();
      setIsAdminMode(true);
      await loadAdminUser();
      onAdminModeChange?.(true);
    } catch (error: any) {
      setError(error.message || 'Failed to switch to admin mode');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToRegularMode = () => {
    authService.switchToRegularMode();
    setIsAdminMode(false);
    setAdminUser(null);
    onAdminModeChange?.(false);
  };

  const handleLoadAllAdminUsers = async () => {
    try {
      const users = await authService.getAllAdminUsers();
      setAllAdminUsers(users);
      setShowAdminList(true);
    } catch (error: any) {
      setError(error.message || 'Failed to load admin users');
    }
  };

  const handleCreateAdminUser = async () => {
    // This would typically open a modal or form
    // For demo purposes, we'll create a sample admin
    try {
      await authService.createAdminUser({
        email: 'newadmin@example.com',
        name: 'New Admin User',
        role: 'admin',
        permissions: {
          userManagement: true,
          systemSettings: false,
          analytics: true,
          contentModeration: false,
          billing: false,
          security: false
        }
      });
      alert('Admin user created successfully!');
    } catch (error: any) {
      setError(error.message || 'Failed to create admin user');
    }
  };

  const checkPermission = async (permission: keyof AdminUser['permissions']) => {
    try {
      const hasPermission = await authService.hasAdminPermission(permission);
      alert(`Permission '${permission}': ${hasPermission ? 'GRANTED' : 'DENIED'}`);
    } catch (error: any) {
      setError(error.message || 'Failed to check permission');
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Admin Authentication</h2>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Admin Mode Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Admin Mode</h3>
            <p className="text-sm text-gray-600">
              Status: {isAdminMode ? 'Active' : 'Inactive'}
            </p>
          </div>
          <div className={`w-4 h-4 rounded-full ${isAdminMode ? 'bg-green-500' : 'bg-red-500'}`}></div>
        </div>
      </div>

      {/* Admin User Info */}
      {adminUser && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Current Admin User</h3>
          <div className="space-y-2">
            <p><span className="font-medium">Name:</span> {adminUser.name}</p>
            <p><span className="font-medium">Email:</span> {adminUser.email}</p>
            <p><span className="font-medium">Role:</span> {adminUser.role}</p>
            <p><span className="font-medium">Active:</span> {adminUser.isActive ? 'Yes' : 'No'}</p>
            {adminUser.lastLogin && (
              <p><span className="font-medium">Last Login:</span> {adminUser.lastLogin.toLocaleString()}</p>
            )}
          </div>
        </div>
      )}

      {/* Admin Permissions */}
      {adminUser && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Admin Permissions</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(adminUser.permissions).map(([permission, granted]) => (
              <div
                key={permission}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  granted 
                    ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                    : 'bg-red-50 border-red-200 hover:bg-red-100'
                }`}
                onClick={() => checkPermission(permission as keyof AdminUser['permissions'])}
              >
                <p className="font-medium text-sm">{permission}</p>
                <p className={`text-xs ${granted ? 'text-green-600' : 'text-red-600'}`}>
                  {granted ? 'GRANTED' : 'DENIED'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-4">
        {!isAdminMode ? (
          <button
            onClick={handleSwitchToAdminMode}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Switching to Admin Mode...' : 'Switch to Admin Mode'}
          </button>
        ) : (
          <div className="space-y-2">
            <button
              onClick={handleSwitchToRegularMode}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Switch to Regular Mode
            </button>
            
            <button
              onClick={handleLoadAllAdminUsers}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Load All Admin Users
            </button>
            
            <button
              onClick={handleCreateAdminUser}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Create New Admin User
            </button>
          </div>
        )}
      </div>

      {/* Admin Users List */}
      {showAdminList && allAdminUsers.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">All Admin Users</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {allAdminUsers.map((user) => (
              <div key={user.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <p className="text-xs text-gray-500">Role: {user.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-xs text-gray-500">
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(user.permissions).map(([permission, granted]) => (
                    <span
                      key={permission}
                      className={`px-2 py-1 text-xs rounded ${
                        granted 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">How to Use</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Click "Switch to Admin Mode" to enable admin functionality</li>
          <li>• View your admin permissions and role</li>
          <li>• Click on permission cards to check individual permissions</li>
          <li>• Load all admin users to see the full admin list</li>
          <li>• Create new admin users (requires userManagement permission)</li>
          <li>• Switch back to regular mode when done</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminAuth;
