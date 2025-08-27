import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, Lead } from '../types';

interface AdminModalState {
  // User modals
  showAddUserModal: boolean;
  showEditUserModal: boolean;
  editingUser: User | null;
  newUserForm: {
    name: string;
    email: string;
    role: string;
    plan: string;
  };
  editUserForm: {
    name: string;
    email: string;
    role: string;
    plan: string;
  };
  
  // Lead modals
  showAddLeadModal: boolean;
  showEditLeadModal: boolean;
  showContactLeadModal: boolean;
  showScheduleLeadModal: boolean;
  editingLead: Lead | null;
  contactingLead: Lead | null;
  schedulingLead: Lead | null;
  newLeadForm: {
    name: string;
    email: string;
    phone: string;
    status: string;
    source: string;
    notes: string;
  };
  editLeadForm: {
    name: string;
    email: string;
    phone: string;
    status: string;
    source: string;
    notes: string;
  };
}

interface AdminModalActions {
  // User actions
  setShowAddUserModal: (show: boolean) => void;
  setShowEditUserModal: (show: boolean) => void;
  setEditingUser: (user: User | null) => void;
  setNewUserForm: (form: AdminModalState['newUserForm']) => void;
  setEditUserForm: (form: AdminModalState['editUserForm']) => void;
  resetUserForms: () => void;
  
  // Lead actions
  setShowAddLeadModal: (show: boolean) => void;
  setShowEditLeadModal: (show: boolean) => void;
  setShowContactLeadModal: (show: boolean) => void;
  setShowScheduleLeadModal: (show: boolean) => void;
  setEditingLead: (lead: Lead | null) => void;
  setContactingLead: (lead: Lead | null) => void;
  setSchedulingLead: (lead: Lead | null) => void;
  setNewLeadForm: (form: AdminModalState['newLeadForm']) => void;
  setEditLeadForm: (form: AdminModalState['editLeadForm']) => void;
  resetLeadForms: () => void;
  
  // Global actions
  closeAllModals: () => void;
}

type AdminModalContextType = AdminModalState & AdminModalActions;

const AdminModalContext = createContext<AdminModalContextType | undefined>(undefined);

const initialUserForm = {
  name: '',
  email: '',
  role: 'agent',
  plan: 'Solo Agent'
};

const initialLeadForm = {
  name: '',
  email: '',
  phone: '',
  status: 'new',
  source: '',
  notes: ''
};

export const AdminModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // User modal states
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUserForm, setNewUserForm] = useState(initialUserForm);
  const [editUserForm, setEditUserForm] = useState(initialUserForm);
  
  // Lead modal states
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showEditLeadModal, setShowEditLeadModal] = useState(false);
  const [showContactLeadModal, setShowContactLeadModal] = useState(false);
  const [showScheduleLeadModal, setShowScheduleLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [contactingLead, setContactingLead] = useState<Lead | null>(null);
  const [schedulingLead, setSchedulingLead] = useState<Lead | null>(null);
  const [newLeadForm, setNewLeadForm] = useState(initialLeadForm);
  const [editLeadForm, setEditLeadForm] = useState(initialLeadForm);

  const resetUserForms = () => {
    setNewUserForm(initialUserForm);
    setEditUserForm(initialUserForm);
    setEditingUser(null);
  };

  const resetLeadForms = () => {
    setNewLeadForm(initialLeadForm);
    setEditLeadForm(initialLeadForm);
    setEditingLead(null);
    setContactingLead(null);
    setSchedulingLead(null);
  };

  const closeAllModals = () => {
    // Close user modals
    setShowAddUserModal(false);
    setShowEditUserModal(false);
    
    // Close lead modals
    setShowAddLeadModal(false);
    setShowEditLeadModal(false);
    setShowContactLeadModal(false);
    setShowScheduleLeadModal(false);
    
    // Reset forms
    resetUserForms();
    resetLeadForms();
  };

  const contextValue: AdminModalContextType = {
    // State
    showAddUserModal,
    showEditUserModal,
    editingUser,
    newUserForm,
    editUserForm,
    showAddLeadModal,
    showEditLeadModal,
    showContactLeadModal,
    showScheduleLeadModal,
    editingLead,
    contactingLead,
    schedulingLead,
    newLeadForm,
    editLeadForm,
    
    // Actions
    setShowAddUserModal,
    setShowEditUserModal,
    setEditingUser,
    setNewUserForm,
    setEditUserForm,
    resetUserForms,
    setShowAddLeadModal,
    setShowEditLeadModal,
    setShowContactLeadModal,
    setShowScheduleLeadModal,
    setEditingLead,
    setContactingLead,
    setSchedulingLead,
    setNewLeadForm,
    setEditLeadForm,
    resetLeadForms,
    closeAllModals
  };

  return (
    <AdminModalContext.Provider value={contextValue}>
      {children}
    </AdminModalContext.Provider>
  );
};

export const useAdminModal = () => {
  const context = useContext(AdminModalContext);
  if (context === undefined) {
    throw new Error('useAdminModal must be used within an AdminModalProvider');
  }
  return context;
};
