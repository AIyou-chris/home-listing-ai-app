import { Lead, Appointment } from '../types';

export interface ExportOptions {
  format: 'csv' | 'json';
  includeHeaders: boolean;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
}

export class ExportService {
  static exportLeadsToCSV(leads: Lead[], options: Partial<ExportOptions> = {}): string {
    const defaultOptions: ExportOptions = {
      format: 'csv',
      includeHeaders: true,
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h'
    };
    
    const opts = { ...defaultOptions, ...options };
    
    const headers = [
      'Name',
      'Email',
      'Phone',
      'Status',
      'Date Added',
      'Last Message',
      'Source',
      'Notes'
    ];
    
    const rows = leads.map(lead => [
      lead.name,
      lead.email || '',
      lead.phone || '',
      lead.status,
      this.formatDate(lead.date, opts.dateFormat),
      lead.lastMessage || '',
      lead.source || '',
      lead.notes || ''
    ]);
    
    let csv = '';
    
    if (opts.includeHeaders) {
      csv += headers.join(',') + '\n';
    }
    
    rows.forEach(row => {
      csv += row.map(field => this.escapeCSVField(field)).join(',') + '\n';
    });
    
    return csv;
  }
  
  static exportAppointmentsToCSV(appointments: Appointment[], options: Partial<ExportOptions> = {}): string {
    const defaultOptions: ExportOptions = {
      format: 'csv',
      includeHeaders: true,
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h'
    };
    
    const opts = { ...defaultOptions, ...options };
    
    const headers = [
      'Lead Name',
      'Property Address',
      'Date',
      'Time',
      'Type',
      'Status',
      'Notes'
    ];
    
    const rows = appointments.map(appt => [
      appt.leadName,
      appt.propertyAddress,
      this.formatDate(appt.date, opts.dateFormat),
      this.formatTime(appt.time, opts.timeFormat),
      appt.type || '',
      appt.status || 'Scheduled',
      appt.notes || ''
    ]);
    
    let csv = '';
    
    if (opts.includeHeaders) {
      csv += headers.join(',') + '\n';
    }
    
    rows.forEach(row => {
      csv += row.map(field => this.escapeCSVField(field)).join(',') + '\n';
    });
    
    return csv;
  }
  
  static exportCombinedData(leads: Lead[], appointments: Appointment[], options: Partial<ExportOptions> = {}): string {
    const defaultOptions: ExportOptions = {
      format: 'csv',
      includeHeaders: true,
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h'
    };
    
    const opts = { ...defaultOptions, ...options };
    
    const headers = [
      'Type',
      'Name',
      'Email',
      'Phone',
      'Status',
      'Date',
      'Time',
      'Property Address',
      'Last Message',
      'Source',
      'Notes'
    ];
    
    const rows: string[][] = [];
    
    // Add leads
    leads.forEach(lead => {
      rows.push([
        'Lead',
        lead.name,
        lead.email || '',
        lead.phone || '',
        lead.status,
        this.formatDate(lead.date, opts.dateFormat),
        '',
        '',
        lead.lastMessage || '',
        lead.source || '',
        lead.notes || ''
      ]);
    });
    
    // Add appointments
    appointments.forEach(appt => {
      rows.push([
        'Appointment',
        appt.leadName,
        '',
        '',
        appt.status || 'Scheduled',
        this.formatDate(appt.date, opts.dateFormat),
        this.formatTime(appt.time, opts.timeFormat),
        appt.propertyAddress,
        '',
        '',
        appt.notes || ''
      ]);
    });
    
    let csv = '';
    
    if (opts.includeHeaders) {
      csv += headers.join(',') + '\n';
    }
    
    rows.forEach(row => {
      csv += row.map(field => this.escapeCSVField(field)).join(',') + '\n';
    });
    
    return csv;
  }
  
  static downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
  
  static generateGoogleSheetsURL(csvContent: string): string {
    // Create a data URL for the CSV content
    const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    
    // Google Sheets import URL
    return `https://docs.google.com/spreadsheets/d/create?usp=data_import&t=csv&url=${encodeURIComponent(dataUrl)}`;
  }
  
  private static escapeCSVField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }
  
  private static formatDate(dateString: string, format: string): string {
    const date = new Date(dateString);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    
    switch (format) {
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      default:
        return `${month}/${day}/${year}`;
    }
  }
  
  private static formatTime(timeString: string, format: string): string {
    if (!timeString) return '';
    
    if (format === '24h') {
      return timeString;
    }
    
    // Convert 24h to 12h format
    const time = timeString.match(/(\d{1,2}):(\d{2})/);
    if (time) {
      let hours = parseInt(time[1]);
      const minutes = time[2];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      
      if (hours > 12) {
        hours -= 12;
      } else if (hours === 0) {
        hours = 12;
      }
      
      return `${hours}:${minutes} ${ampm}`;
    }
    
    return timeString;
  }
  
  static getExportStats(leads: Lead[], appointments: Appointment[]) {
    return {
      totalLeads: leads.length,
      totalAppointments: appointments.length,
      leadsByStatus: leads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      appointmentsByStatus: appointments.reduce((acc, appt) => {
        const status = appt.status || 'Scheduled';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      exportDate: new Date().toLocaleString()
    };
  }
}
