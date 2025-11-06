import React, { useState } from 'react';
import { googleMeetService } from '../services/googleMeetService';
import { googleOAuthService } from '../services/googleOAuthService';

const GoogleMeetTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [meetApiStatus, setMeetApiStatus] = useState<'enabled' | 'disabled' | 'unknown'>('unknown');

  const testGoogleMeet = async () => {
    setIsLoading(true);
    setResult('');
    
    try {
      // Check if user is authenticated
      if (!googleOAuthService.isAuthenticated('calendar')) {
        setResult('❌ User not authenticated with Google. Please connect your Google account first.');
        setIsLoading(false);
        return;
      }

      // Test creating a consultation
      const testResult = await googleMeetService.scheduleConsultation(
        'test@example.com',
        'client@example.com',
        '123 Test Street, Test City, TS 12345',
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        30
      );

      setMeetApiStatus(googleMeetService.isMeetApiEnabled() ? 'enabled' : 'disabled');
      
      if (testResult.meetLink) {
        setResult(`✅ Google Meet consultation created successfully!\n\nEvent ID: ${testResult.eventId}\nMeet Link: ${testResult.meetLink}`);
      } else {
        setResult(`⚠️ Regular calendar event created (Google Meet API not enabled)\n\nEvent ID: ${testResult.eventId}\n\nTo enable video conferencing:\n1. Go to Google Cloud Console\n2. Find "Google Meet REST API"\n3. Click "Enable"\n4. Wait 1-2 minutes for activation`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      setResult(`❌ Error: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const success = await googleOAuthService.requestAccess({ context: 'calendar' });
      if (success) {
        console.log('Google authentication successful');
      } else {
        console.error('Google authentication failed');
      }
    } catch (error) {
      console.error('Error initiating Google auth:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Google Meet API Test</h2>
      
      <div className="space-y-4">
        {/* Authentication Status */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-700 mb-2">Authentication Status</h3>
          {googleOAuthService.isAuthenticated('calendar') ? (
            <div className="flex items-center text-green-600">
              <span className="material-symbols-outlined mr-2">check_circle</span>
              Connected to Google Calendar
            </div>
          ) : (
            <div className="flex items-center text-red-600">
              <span className="material-symbols-outlined mr-2">error</span>
              Not connected to Google Calendar
              <button
                onClick={handleGoogleAuth}
                className="ml-4 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                Connect
              </button>
            </div>
          )}
        </div>

        {/* API Status */}
        {meetApiStatus !== 'unknown' && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">Google Meet API Status</h3>
            {meetApiStatus === 'enabled' ? (
              <div className="flex items-center text-green-600">
                <span className="material-symbols-outlined mr-2">check_circle</span>
                Google Meet API is enabled - Video conferencing available
              </div>
            ) : (
              <div className="flex items-center text-yellow-600">
                <span className="material-symbols-outlined mr-2">warning</span>
                Google Meet API is disabled - Regular calendar events only
              </div>
            )}
          </div>
        )}

        {/* Test Button */}
        <button
          onClick={testGoogleMeet}
          disabled={isLoading || !googleOAuthService.isAuthenticated('calendar')}
          className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Testing...' : 'Test Google Meet Consultation'}
        </button>

        {/* Results */}
        {result && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">Test Results</h3>
            <pre className="whitespace-pre-wrap text-sm text-gray-800">{result}</pre>
          </div>
        )}

        {/* Instructions */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-700 mb-2">How This Works</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• If Google Meet API is enabled: Creates video consultation with Meet link</li>
            <li>• If Google Meet API is disabled: Creates regular calendar event as fallback</li>
            <li>• No errors or crashes - graceful degradation</li>
            <li>• Clear status messages show what's happening</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GoogleMeetTest;
