import React, { useState } from 'react';

export interface ReportInputData {
    address: string;
    price: string;
    beds: string;
    baths: string;
    sqft: string;
    features: string;
    propertyType: string;
}

interface ReportInputFormProps {
    onSubmit: (data: ReportInputData) => void;
    isLoading: boolean;
}

const ReportInputForm: React.FC<ReportInputFormProps> = ({ onSubmit, isLoading }) => {
    const [formData, setFormData] = useState<ReportInputData>({
        address: '',
        price: '',
        beds: '',
        baths: '',
        sqft: '',
        features: '',
        propertyType: 'Single Family Home'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-600">edit_document</span>
                Property Details
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Property Address</label>
                    <input
                        type="text"
                        name="address"
                        required
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="e.g. 123 Maple Street, Springfield"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Suggested List Price</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-slate-500">$</span>
                            <input
                                type="text"
                                name="price"
                                required
                                value={formData.price}
                                onChange={handleChange}
                                placeholder="500,000"
                                className="w-full pl-7 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Property Type</label>
                        <select
                            name="propertyType"
                            value={formData.propertyType}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            <option>Single Family Home</option>
                            <option>Condo / Townhouse</option>
                            <option>Multi-Family</option>
                            <option>Luxury Estate</option>
                            <option>Land</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Beds</label>
                        <input
                            type="number"
                            name="beds"
                            required
                            value={formData.beds}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Baths</label>
                        <input
                            type="number"
                            step="0.5"
                            name="baths"
                            required
                            value={formData.baths}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Sq Ft</label>
                        <input
                            type="number"
                            name="sqft"
                            required
                            value={formData.sqft}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Key Features & Selling Points</label>
                    <textarea
                        name="features"
                        required
                        rows={4}
                        value={formData.features}
                        onChange={handleChange}
                        placeholder="e.g. Renovated chef's kitchen, saltwater pool, hardwood floors, close to top-rated schools..."
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-slate-500">The AI will use these details to write the property analysis.</p>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                                Generating Report...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">auto_awesome</span>
                                Generate Proposal
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ReportInputForm;
