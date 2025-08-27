import React, { useState } from 'react';
import { useAdminModal } from '../context/AdminModalContext';
import { User, Lead } from '../types';
import { ValidationUtils } from '../utils/validation';

interface AdminModalsProps {
  users: User[];
  leads: Lead[];
  onAddUser: (userData: any) => Promise<void>;
  onEditUser: (userData: any) => Promise<void>;
  onAddLead: (leadData: any) => Promise<void>;
  onEditLead: (leadData: any) => Promise<void>;
}

export const AdminModals: React.FC<AdminModalsProps> = ({
  users,
  leads,
  onAddUser,
  onEditUser,
  onAddLead,
  onEditLead
}) => {
  const {
    showAddUserModal,
    showEditUserModal,
    editingUser,
    newUserForm,
    editUserForm,
    showAddLeadModal,
    showEditLeadModal,
    editingLead,
    newLeadForm,
    editLeadForm,
    setShowAddUserModal,
    setShowEditUserModal,
    setNewUserForm,
    setEditUserForm,
    setShowAddLeadModal,
    setShowEditLeadModal,
    setNewLeadForm,
    setEditLeadForm,
    resetUserForms,
    resetLeadForms
  } = useAdminModal();

  const handleAddUser = async () => {
    if (!newUserForm.name || !newUserForm.email) {
      alert('Please fill in all required fields');
      return;
    }

    // Enhanced email validation
    if (!ValidationUtils.isValidEmail(newUserForm.email)) {
      alert('Please enter a valid email address');
      return;
    }

    try {
      await onAddUser(newUserForm);
      resetUserForms();
      setShowAddUserModal(false);
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Failed to add user. Please try again.');
    }
  };

  const handleEditUser = async () => {
    if (!editUserForm.name || !editUserForm.email) {
      alert('Please fill in all required fields');
      return;
    }

    // Enhanced email validation
    if (!ValidationUtils.isValidEmail(editUserForm.email)) {
      alert('Please enter a valid email address');
      return;
    }

    try {
      await onEditUser({ ...editingUser, ...editUserForm });
      resetUserForms();
      setShowEditUserModal(false);
    } catch (error) {
      console.error('Error editing user:', error);
      alert('Failed to update user. Please try again.');
    }
  };

  const handleAddLead = async () => {
    if (!newLeadForm.name || !newLeadForm.email) {
      alert('Please fill in all required fields');
      return;
    }

    // Enhanced email validation
    if (!ValidationUtils.isValidEmail(newLeadForm.email)) {
      alert('Please enter a valid email address');
      return;
    }

    try {
      await onAddLead(newLeadForm);
      resetLeadForms();
      setShowAddLeadModal(false);
    } catch (error) {
      console.error('Error adding lead:', error);
      alert('Failed to add lead. Please try again.');
    }
  };

  const handleEditLead = async () => {
    if (!editLeadForm.name || !editLeadForm.email) {
      alert('Please fill in all required fields');
      return;
    }

    // Enhanced email validation
    if (!ValidationUtils.isValidEmail(editLeadForm.email)) {
      alert('Please enter a valid email address');
      return;
    }

    try {
      await onEditLead({ ...editingLead, ...editLeadForm });
      resetLeadForms();
      setShowEditLeadModal(false);
    } catch (error) {
      console.error('Error editing lead:', error);
      alert('Failed to update lead. Please try again.');
    }
  };

  return (
    <>
      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Add New User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter user name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Plan</label>
                <select
                  value={newUserForm.plan}
                  onChange={(e) => setNewUserForm({ ...newUserForm, plan: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Solo Agent">Solo Agent</option>
                  <option value="Team Leader">Team Leader</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddUser}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Add User
              </button>
              <button
                onClick={() => {
                  resetUserForms();
                  setShowAddUserModal(false);
                }}
                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold hover:bg-slate-500 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Edit User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  value={editUserForm.name}
                  onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
                <select
                  value={editUserForm.role}
                  onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Plan</label>
                <select
                  value={editUserForm.plan}
                  onChange={(e) => setEditUserForm({ ...editUserForm, plan: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Solo Agent">Solo Agent</option>
                  <option value="Team Leader">Team Leader</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleEditUser}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  resetUserForms();
                  setShowEditUserModal(false);
                }}
                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold hover:bg-slate-500 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddLeadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Add New Lead</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter lead name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={newLeadForm.email}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newLeadForm.phone}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter phone number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                <select
                  value={newLeadForm.status}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="converted">Converted</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Source</label>
                <input
                  type="text"
                  value={newLeadForm.source}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Lead source"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
                <textarea
                  value={newLeadForm.notes}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Additional notes"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddLead}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Add Lead
              </button>
              <button
                onClick={() => {
                  resetLeadForms();
                  setShowAddLeadModal(false);
                }}
                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold hover:bg-slate-500 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {showEditLeadModal && editingLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Edit Lead</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  value={editLeadForm.name}
                  onChange={(e) => setEditLeadForm({ ...editLeadForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={editLeadForm.email}
                  onChange={(e) => setEditLeadForm({ ...editLeadForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editLeadForm.phone}
                  onChange={(e) => setEditLeadForm({ ...editLeadForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                <select
                  value={editLeadForm.status}
                  onChange={(e) => setEditLeadForm({ ...editLeadForm, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="converted">Converted</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Source</label>
                <input
                  type="text"
                  value={editLeadForm.source}
                  onChange={(e) => setEditLeadForm({ ...editLeadForm, source: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
                <textarea
                  value={editLeadForm.notes}
                  onChange={(e) => setEditLeadForm({ ...editLeadForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleEditLead}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  resetLeadForms();
                  setShowEditLeadModal(false);
                }}
                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold hover:bg-slate-500 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
