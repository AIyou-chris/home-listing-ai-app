import React from 'react'

interface VariableHighlighterProps {
  message: string
  onVariableClick?: (variable: string) => void
}

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9._-]+)\s*\}\}/g

export const VariableHighlighter: React.FC<VariableHighlighterProps> = ({ message, onVariableClick }) => {
  const segments: Array<{ text: string; variable?: string }> = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = VARIABLE_PATTERN.exec(message)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: message.slice(lastIndex, match.index) })
    }

    segments.push({ text: match[0], variable: match[1] })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < message.length) {
    segments.push({ text: message.slice(lastIndex) })
  }

  return (
    <span className="whitespace-pre-wrap break-words">
      {segments.map((segment, index) =>
        segment.variable ? (
          <button
            key={`${segment.variable}-${index}`}
            type="button"
            onClick={() => onVariableClick?.(segment.variable!)}
            className="text-primary-600 font-semibold hover:underline focus:outline-none focus:ring-1 focus:ring-primary-500 rounded"
          >
            {segment.text}
          </button>
        ) : (
          <React.Fragment key={index}>{segment.text}</React.Fragment>
        )
      )}
    </span>
  )
}

