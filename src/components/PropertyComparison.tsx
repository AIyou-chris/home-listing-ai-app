import React, { useState } from 'react';
import { Property } from '../types';

interface PropertyComparisonProps {
  properties: Property[];
  onClose: () => void;
}

const PropertyComparison: React.FC<PropertyComparisonProps> = ({
  properties,
  onClose
}) => {
  const [selectedProperties, setSelectedProperties] = useState<Property[]>([]);
  const [comparisonMode, setComparisonMode] = useState<'grid' | 'table'>('grid');

  const addToComparison = (property: Property) => {
    if (selectedProperties.length < 3 && !selectedProperties.find(p => p.id === property.id)) {
      setSelectedProperties([...selectedProperties, property]);
    }
  };

  const removeFromComparison = (propertyId: string) => {
    setSelectedProperties(selectedProperties.filter(p => p.id !== propertyId));
  };

  const clearComparison = () => {
    setSelectedProperties([]);
  };

  const ComparisonCard: React.FC<{ property: Property }> = ({ property }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
      <div className="relative">
        <button
          onClick={() => removeFromComparison(property.id)}
          className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
          aria-label="Remove from comparison"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
        
        <img
          src={property.imageUrl}
          alt={property.title}
          className="w-full h-48 object-cover rounded-lg mb-4"
        />
        
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{property.title}</h3>
        <p className="text-2xl font-bold text-primary-600 mb-2">${property.price?.toLocaleString()}</p>
        <p className="text-slate-600 mb-4">{property.address}</p>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Bedrooms:</span>
            <span className="font-medium ml-1">{property.bedrooms}</span>
          </div>
          <div>
            <span className="text-slate-500">Bathrooms:</span>
            <span className="font-medium ml-1">{property.bathrooms}</span>
          </div>
          <div>
            <span className="text-slate-500">Square Feet:</span>
            <span className="font-medium ml-1">{property.squareFeet?.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-slate-500">Status:</span>
            <span className={`font-medium ml-1 px-2 py-0.5 rounded-full text-xs ${
              property.status === 'Active' ? 'bg-green-100 text-green-700' :
              property.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {property.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const ComparisonTable: React.FC = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Property</th>
              {selectedProperties.map((property) => (
                <th key={property.id} className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  <div className="flex items-center space-x-2">
                    <img
                      src={property.imageUrl}
                      alt={property.title}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div>
                      <p className="font-medium">{property.title}</p>
                      <p className="text-xs text-slate-500">{property.address}</p>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr>
              <td className="px-6 py-4 text-sm font-medium text-slate-900">Price</td>
              {selectedProperties.map((property) => (
                <td key={property.id} className="px-6 py-4 text-sm text-slate-900">
                  ${property.price?.toLocaleString()}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-6 py-4 text-sm font-medium text-slate-900">Bedrooms</td>
              {selectedProperties.map((property) => (
                <td key={property.id} className="px-6 py-4 text-sm text-slate-900">
                  {property.bedrooms}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-6 py-4 text-sm font-medium text-slate-900">Bathrooms</td>
              {selectedProperties.map((property) => (
                <td key={property.id} className="px-6 py-4 text-sm text-slate-900">
                  {property.bathrooms}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-6 py-4 text-sm font-medium text-slate-900">Square Feet</td>
              {selectedProperties.map((property) => (
                <td key={property.id} className="px-6 py-4 text-sm text-slate-900">
                  {property.squareFeet?.toLocaleString()}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-6 py-4 text-sm font-medium text-slate-900">Status</td>
              {selectedProperties.map((property) => (
                <td key={property.id} className="px-6 py-4 text-sm text-slate-900">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    property.status === 'Active' ? 'bg-green-100 text-green-700' :
                    property.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {property.status}
                  </span>
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-6 py-4 text-sm font-medium text-slate-900">Price per Sq Ft</td>
              {selectedProperties.map((property) => (
                <td key={property.id} className="px-6 py-4 text-sm text-slate-900">
                  ${property.price && property.squareFeet 
                    ? Math.round(property.price / property.squareFeet).toLocaleString()
                    : 'N/A'
                  }
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Property Comparison</h2>
              <p className="text-slate-600 mt-1">Compare up to 3 properties side by side</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Close comparison"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setComparisonMode('grid')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  comparisonMode === 'grid'
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Grid View
              </button>
              <button
                onClick={() => setComparisonMode('table')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  comparisonMode === 'table'
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Table View
              </button>
            </div>
            
            {selectedProperties.length > 0 && (
              <button
                onClick={clearComparison}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Property Selection */}
        {selectedProperties.length < 3 && (
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Properties to Compare</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {properties
                .filter(p => !selectedProperties.find(sp => sp.id === p.id))
                .slice(0, 6)
                .map((property) => (
                  <div
                    key={property.id}
                    className="border border-slate-200 rounded-lg p-4 hover:border-primary-300 transition-colors cursor-pointer"
                    onClick={() => addToComparison(property)}
                  >
                    <img
                      src={property.imageUrl}
                      alt={property.title}
                      className="w-full h-32 object-cover rounded mb-3"
                    />
                    <h4 className="font-medium text-slate-900 mb-1">{property.title}</h4>
                    <p className="text-primary-600 font-semibold">${property.price?.toLocaleString()}</p>
                    <p className="text-sm text-slate-500">{property.address}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Comparison Display */}
        {selectedProperties.length > 0 && (
          <div className="p-6">
            {comparisonMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {selectedProperties.map((property) => (
                  <ComparisonCard key={property.id} property={property} />
                ))}
              </div>
            ) : (
              <ComparisonTable />
            )}
          </div>
        )}

        {/* Empty State */}
        {selectedProperties.length === 0 && (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">compare</span>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Properties Selected</h3>
            <p className="text-slate-600">Select up to 3 properties above to start comparing</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyComparison;
