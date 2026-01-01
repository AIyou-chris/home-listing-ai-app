import React from 'react'
import Modal from './Modal'
import { Property, isAIDescription } from '../types'

interface PropertyInfoModalProps {
    property: Property
    onClose: () => void
}

const InfoPill: React.FC<{ icon: string, value: string | number, label: string }> = ({ icon, value, label }) => (
    <div className="flex flex-col items-center justify-center space-y-1 p-3 bg-slate-50 rounded-xl">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-700 shadow-sm border border-slate-200">
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
        <p className="font-bold text-slate-800 text-sm">{value}</p>
        <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
    </div>
);

const PropertyInfoModal: React.FC<PropertyInfoModalProps> = ({ property, onClose }) => {
    const descriptionText = isAIDescription(property.description)
        ? property.description.paragraphs.join('\n\n')
        : (typeof property.description === 'string' ? property.description : '');

    const title = isAIDescription(property.description) ? property.description.title : 'About This Home';

    const header = (
        <div>
            <h3 className='text-xl font-bold text-slate-800'>Property Info</h3>
        </div>
    )

    return (
        <Modal title={header} onClose={onClose}>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-3 gap-3">
                    <InfoPill icon="bed" value={property.bedrooms} label="Beds" />
                    <InfoPill icon="bathtub" value={property.bathrooms} label="Baths" />
                    <InfoPill icon="fullscreen" value={property.squareFeet.toLocaleString()} label="Sq Ft" />
                </div>

                <div>
                    <h4 className="font-bold text-slate-800 mb-2">{title}</h4>
                    <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                        {descriptionText}
                    </div>
                </div>

                {property.features && property.features.length > 0 && (
                    <div>
                        <h4 className="font-bold text-slate-800 mb-2">Amenities</h4>
                        <div className="flex flex-wrap gap-2">
                            {property.features.map((f, i) => (
                                <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full border border-blue-100">
                                    {f}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
}

export default PropertyInfoModal
