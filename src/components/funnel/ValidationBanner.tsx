import React from 'react'

interface ValidationBannerProps {
  missing: string[]
  malformed: string[]
}

export const ValidationBanner: React.FC<ValidationBannerProps> = ({ missing, malformed }) => {
  if (missing.length === 0 && malformed.length === 0) return null

  return (
    <div className="px-6 pt-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 space-y-1">
        {missing.length > 0 && (
          <p>
            Missing variables: <strong>{missing.map((variable) => `{{${variable}}}`).join(', ')}</strong>
          </p>
        )}
        {malformed.length > 0 && (
          <p>
            Check placeholders for syntax errors. Use the format {'{{variable_name}}'}.
          </p>
        )}
      </div>
    </div>
  )
}

