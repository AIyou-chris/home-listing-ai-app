import React from 'react'
import { render, screen } from '@testing-library/react'
import LoadingSpinner from '../LoadingSpinner'

describe('LoadingSpinner', () => {
	it('renders spinner by default', () => {
		render(<LoadingSpinner />)
		// There is no role; assert by presence of container
		expect(screen.getByText((_, node) => node?.className?.includes('flex') ?? false)).toBeInTheDocument()
	})

	it('renders text when provided', () => {
		render(<LoadingSpinner text='Loading...' />)
		expect(screen.getByText('Loading...')).toBeInTheDocument()
	})
})



