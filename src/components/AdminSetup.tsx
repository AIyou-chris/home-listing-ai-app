import React, { useState } from 'react';
// Firebase removed

const AdminSetup: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        try {
            // Use HTTP function to avoid CORS issues
            const response = await fetch('https://us-central1-home-listing-ai.cloudfunctions.net/setupInitialAdminHttp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();
            console.log('Setup result:', result);
            
            if (response.ok) {
                setMessage({
                    type: 'success',
                    text: 'Admin user created successfully! You can now login with these credentials.'
                });
            } else {
                throw new Error(result.error || 'Failed to setup admin user');
            }
        } catch (error: any) {
            console.error('Setup error:', error);
            setMessage({
                type: 'error',
                text: error.message || 'Failed to setup admin user'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <div className="mx-auto h-12 w-12 bg-red-600 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-2xl">admin_panel_settings</span>
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
                        Admin Setup
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-400">
                        Create the initial admin user
                    </p>
                </div>
                
                <form className="mt-8 space-y-6" onSubmit={handleSetup}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">
                                Email address
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-600 placeholder-slate-400 text-white bg-slate-800 rounded-t-md focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
                                placeholder="Email address"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-600 placeholder-slate-400 text-white bg-slate-800 rounded-b-md focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
                                placeholder="Password"
                            />
                        </div>
                    </div>

                    {message && (
                        <div className={`rounded-md p-4 ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <span className={`material-symbols-outlined ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                        {message.type === 'success' ? 'check_circle' : 'error'}
                                    </span>
                                </div>
                                <div className="ml-3">
                                    <h3 className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                                        {message.text}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <span className="material-symbols-outlined animate-spin">hourglass_empty</span>
                            ) : (
                                <>
                                    <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                                        <span className="material-symbols-outlined text-red-500 group-hover:text-red-400">
                                            admin_panel_settings
                                        </span>
                                    </span>
                                    Setup Admin User
                                </>
                            )}
                        </button>
                    </div>

                    <div className="text-center">
                        <p className="text-xs text-slate-500">
                            ⚠️ This should only be run once to create the initial admin user.
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminSetup;
