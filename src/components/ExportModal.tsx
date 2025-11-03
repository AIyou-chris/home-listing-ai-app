import React, { useState } from 'react';
import { Lead, Appointment } from '../types';
import { ExportService, ExportOptions } from '../services/exportService';

type ExportType = 'leads' | 'appointments' | 'combined';
type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
type TimeFormat = '12h' | '24h';

const EXPORT_TYPE_OPTIONS: Array<{ id: ExportType; label: string; icon: string }> = [
  { id: 'leads', label: 'Leads Only', icon: 'group' },
  { id: 'appointments', label: 'Appointments Only', icon: 'calendar_today' },
  { id: 'combined', label: 'Combined Data', icon: 'merge_type' }
];

const DATE_FORMAT_OPTIONS: Array<{ value: DateFormat; label: string }> = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (International)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' }
];

const TIME_FORMAT_OPTIONS: Array<{ value: TimeFormat; label: string }> = [
  { value: '12h', label: '12-hour (AM/PM)' },
  { value: '24h', label: '24-hour' }
];

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  appointments: Appointment[];
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, leads, appointments }) => {
  const [exportType, setExportType] = useState<ExportType>('leads');
  const [dateFormat, setDateFormat] = useState<DateFormat>('MM/DD/YYYY');
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('12h');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const exportStats = ExportService.getExportStats(leads, appointments);

  const handleExport = async (destination: 'download' | 'sheets') => {
    setIsExporting(true);
    
    try {
      const options: ExportOptions = {
        format: 'csv',
        includeHeaders,
        dateFormat,
        timeFormat
      };

      let csvContent = '';
      let filename = '';

      switch (exportType) {
        case 'leads':
          csvContent = ExportService.exportLeadsToCSV(leads, options);
          filename = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'appointments':
          csvContent = ExportService.exportAppointmentsToCSV(appointments, options);
          filename = `appointments_export_${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'combined':
          csvContent = ExportService.exportCombinedData(leads, appointments, options);
          filename = `leads_and_appointments_export_${new Date().toISOString().split('T')[0]}.csv`;
          break;
      }

      if (destination === 'download') {
        ExportService.downloadCSV(csvContent, filename);
      } else {
        const sheetsUrl = ExportService.generateGoogleSheetsURL(csvContent);
        window.open(sheetsUrl, '_blank');
      }

      // Show success message
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 1000);

    } catch (error) {
      console.error('Export failed:', error);
      setIsExporting(false);
      alert('Export failed. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Export Data</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Export Stats */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-slate-900 mb-2">Data Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Total Leads:</span>
                <span className="font-semibold ml-2">{exportStats.totalLeads}</span>
              </div>
              <div>
                <span className="text-slate-600">Total Appointments:</span>
                <span className="font-semibold ml-2">{exportStats.totalAppointments}</span>
              </div>
              <div>
                <span className="text-slate-600">Export Date:</span>
                <span className="font-semibold ml-2">{exportStats.exportDate}</span>
              </div>
            </div>
          </div>

          {/* Export Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">Export Type</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {EXPORT_TYPE_OPTIONS.map(option => {
                const count =
                  option.id === 'leads'
                    ? leads.length
                    : option.id === 'appointments'
                      ? appointments.length
                      : leads.length + appointments.length;

                return (
                <button
                  key={option.id}
                  onClick={() => setExportType(option.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    exportType === option.id
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-xl">{option.icon}</span>
                    <div className="text-left">
                      <div className="font-semibold">{option.label}</div>
                      <div className="text-sm opacity-75">{count} items</div>
                    </div>
                  </div>
                </button>
                );
              })}
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Date Format</label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value as DateFormat)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {DATE_FORMAT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Time Format</label>
              <select
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value as TimeFormat)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {TIME_FORMAT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeHeaders"
                checked={includeHeaders}
                onChange={(e) => setIncludeHeaders(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="includeHeaders" className="ml-2 text-sm text-slate-700">
                Include column headers
              </label>
            </div>
          </div>

          {/* Export Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => handleExport('download')}
              disabled={isExporting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined">download</span>
              {isExporting ? 'Exporting...' : 'Download CSV'}
            </button>
            
            <button
              onClick={() => handleExport('sheets')}
              disabled={isExporting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined">table_chart</span>
              {isExporting ? 'Opening...' : 'Open in Google Sheets'}
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Tip:</strong> The CSV file can be imported into Excel, Google Sheets, or any CRM system. 
              Google Sheets will automatically create a new spreadsheet with your data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
