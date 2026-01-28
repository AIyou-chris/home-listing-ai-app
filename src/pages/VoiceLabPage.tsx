
import React from 'react';
import Sidebar from '../components/Sidebar';

const VoiceLabPage: React.FC = () => {
    return (
        <div className="flex bg-gray-50 min-h-screen">
            <Sidebar isOpen={true} onClose={() => { }} />
            <div className="flex-1 p-8 ml-64">
                <h1 className="text-3xl font-bold mb-6">Voice Lab</h1>
                <div className="bg-white p-6 rounded-lg shadow">
                    <p>Voice Lab features coming soon...</p>
                </div>
            </div>
        </div>
    );
};

export default VoiceLabPage;
