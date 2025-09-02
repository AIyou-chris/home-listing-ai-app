import React from 'react'
import { render, screen } from '@testing-library/react'
import { Logo } from '../Logo'

describe('Logo', () => {
	it('renders with alt text and src', () => {
		render(<Logo className='w-6 h-6' />)
		const img = screen.getByAltText('HomeListingAI Logo') as HTMLImageElement
		expect(img).toBeInTheDocument()
		expect(img.src).toContain('/newlogo.png')
	})
})



