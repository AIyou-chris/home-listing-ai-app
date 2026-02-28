import React from 'react'

interface EmptyStateCardProps {
  className?: string
  message?: string
}

const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  className = '',
  message = 'No data yet — publish a listing to start capturing leads.'
}) => (
  <div className={`rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center ${className}`}>
    <p className="text-sm font-semibold text-slate-800">{message}</p>
  </div>
)

export default EmptyStateCard
