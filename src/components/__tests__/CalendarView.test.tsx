import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CalendarView from '../CalendarView'
import type { Appointment } from '../../types'

describe('CalendarView', () => {
	it('highlights appointments and emits selected date when a day is clicked', async () => {
		const appointments: Appointment[] = [
			{ id: 'appt-1', type: 'Showing', date: '2025-08-16', time: '10:00 AM' },
			{ id: 'appt-2', type: 'Consultation', date: '2025-08-16', time: '2:00 PM' },
			{ id: 'appt-3', type: 'Follow-up', date: '2025-08-17', time: '3:00 PM' }
		]
		const handleSelect = jest.fn()
		const user = userEvent.setup()

		render(
			<CalendarView
				appointments={appointments}
				selectedDate='2025-08-16'
				onSelectDate={handleSelect}
			/>
		)

		const targetDay = screen.getByRole('button', { name: /August 16, 2025/ })
		await user.click(targetDay)

		expect(handleSelect).toHaveBeenCalledWith('2025-08-16')

		const scoped = within(targetDay)
		expect(scoped.getByText('10:00 AM')).toBeInTheDocument()
		expect(scoped.getByText('Consultation')).toBeInTheDocument()
		expect(scoped.getByText('2')).toBeInTheDocument()
	})
})

