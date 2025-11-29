import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScheduleAppointmentModal, { type ScheduleAppointmentFormData } from '../ScheduleAppointmentModal'

const formatDateForInput = (date: Date) => {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

describe('ScheduleAppointmentModal', () => {
	it('prefills date and time and submits complete appointment payload', async () => {
		const handleSchedule = jest.fn<void, [ScheduleAppointmentFormData]>()
		const user = userEvent.setup()
		const today = new Date()
		const dateValue = formatDateForInput(today)

		render(
			<ScheduleAppointmentModal
				initialDate={dateValue}
				initialTime='10:00 AM'
				onClose={jest.fn()}
				onSchedule={handleSchedule}
			/>
		)

		await user.type(screen.getByLabelText('Name *'), 'Alex Agent')
		await user.type(screen.getByLabelText('Email *'), 'alex@example.com')

		const messageField = screen.getByLabelText('Message')
		await user.type(messageField, 'Testing schedule flow')

		expect((screen.getByLabelText('Preferred Date *') as HTMLInputElement).value).toBe(dateValue)
		expect((screen.getByLabelText('Preferred Time *') as HTMLSelectElement).value).toBe('10:00 AM')
		expect(messageField).toHaveValue('Testing schedule flow')

		const form = document.querySelector('form') as HTMLFormElement
		fireEvent.submit(form)

		expect(handleSchedule).toHaveBeenCalledTimes(1)
		expect(handleSchedule).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'Alex Agent',
				email: 'alex@example.com',
				date: dateValue,
				time: '10:00 AM',
				message: 'Testing schedule flow'
			})
		)
	})
})

