
import React, { useEffect, useMemo, useState } from 'react'
import { Appointment } from '../types'

interface CalendarViewProps {
  appointments: Appointment[]
  selectedDate?: string
  onSelectDate?: (isoDate: string) => void
}

const pad = (value: number) => String(value).padStart(2, '0')

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const parseDateString = (value?: string | null): Date | null => {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    const [, year, month, day] = isoMatch
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const [, month, day, year] = slashMatch
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const resolveAppointmentDateKey = (appointment: Appointment): string => {
  if (appointment.startIso) {
    const fromIso = new Date(appointment.startIso)
    if (!Number.isNaN(fromIso.getTime())) {
      return formatDateKey(fromIso)
    }
  }

  const parsed = parseDateString(appointment.date)
  if (parsed) return formatDateKey(parsed)

  return ''
}

const parseTimeLabel = (label?: string | null): { hour: number; minute: number } => {
  if (!label) return { hour: 12, minute: 0 }
  const explicit = label.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (explicit) {
    let hour = Number(explicit[1])
    const minute = explicit[2] ? Number(explicit[2]) : 0
    const meridiem = explicit[3]?.toLowerCase()
    if (meridiem === 'pm' && hour < 12) hour += 12
    if (meridiem === 'am' && hour === 12) hour = 0
    return { hour, minute }
  }

  const lower = label.toLowerCase()
  if (lower.includes('morning')) return { hour: 10, minute: 0 }
  if (lower.includes('afternoon')) return { hour: 14, minute: 0 }
  if (lower.includes('evening')) return { hour: 18, minute: 0 }
  return { hour: 12, minute: 0 }
}

const getAppointmentTimestamp = (appointment: Appointment): number => {
  if (appointment.startIso) {
    const ts = Date.parse(appointment.startIso)
    if (!Number.isNaN(ts)) return ts
  }

  const base = parseDateString(appointment.date)
  if (!base) return 0
  const { hour, minute } = parseTimeLabel(appointment.time)
  base.setHours(hour, minute, 0, 0)
  return base.getTime()
}

const formatAppointmentTime = (appointment: Appointment): string => {
  if (appointment.time) return appointment.time
  if (appointment.startIso) {
    const parsed = new Date(appointment.startIso)
    if (!Number.isNaN(parsed.getTime())) {
      const hours24 = parsed.getHours()
      const minutes = pad(parsed.getMinutes())
      const suffix = hours24 >= 12 ? 'PM' : 'AM'
      const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
      return `${hours12}:${minutes} ${suffix}`
    }
  }
  return 'Time TBD'
}

const describeDateForAria = (
  date: Date,
  count: number,
  isSelected: boolean
): string => {
  const readable = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
  const appointmentsLabel =
    count === 0
      ? 'No appointments scheduled.'
      : `${count} appointment${count === 1 ? '' : 's'} scheduled.`
  const selectedLabel = isSelected ? 'Selected.' : ''
  return `${readable}. ${appointmentsLabel} ${selectedLabel}`.trim()
}

const CalendarView: React.FC<CalendarViewProps> = ({
  appointments,
  selectedDate,
  onSelectDate
}) => {
  const selectedDateKey = selectedDate ? formatDateKey(parseDateString(selectedDate) ?? new Date()) : ''

  const initialDate = selectedDateKey
    ? parseDateString(selectedDateKey) ?? new Date()
    : new Date()

  const [currentDate, setCurrentDate] = useState(initialDate)
  const [internalSelectedKey, setInternalSelectedKey] = useState(
    selectedDateKey || formatDateKey(new Date())
  )

  useEffect(() => {
    if (!selectedDateKey) return
    setInternalSelectedKey(selectedDateKey)
    const parsed = parseDateString(selectedDateKey)
    if (!parsed) return
    setCurrentDate(prev => {
      const sameMonth =
        prev.getFullYear() === parsed.getFullYear() &&
        prev.getMonth() === parsed.getMonth()
      return sameMonth ? prev : parsed
    })
  }, [selectedDateKey])

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    appointments.forEach(appt => {
      const key = resolveAppointmentDateKey(appt)
      if (!key) return
      const list = map.get(key) ?? []
      list.push(appt)
      map.set(key, list)
    })
    map.forEach(list => {
      list.sort((a, b) => getAppointmentTimestamp(a) - getAppointmentTimestamp(b))
    })
    return map
  }, [appointments])

  const changeMonth = (amount: number) => {
    setCurrentDate(prevDate => {
      const next = new Date(prevDate)
      next.setMonth(prevDate.getMonth() + amount)
      return next
    })
  }

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startingDayOfWeek = firstDayOfMonth.getDay()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const handleSelectDay = (key: string) => {
    if (!selectedDate) {
      setInternalSelectedKey(key)
    }
    onSelectDate?.(key)
  }

  const renderDayCell = (day: number) => {
    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    const key = formatDateKey(dayDate)
    const isToday = dayDate.getTime() === today.getTime()
    const isSelected = internalSelectedKey === key
    const appointmentsForDay = appointmentsByDate.get(key) ?? []
    const hasAppointments = appointmentsForDay.length > 0

    const baseButtonClass =
      'flex h-full w-full flex-col rounded-md p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
    const selectedClass = isSelected
      ? 'bg-primary-50 border border-primary-200'
      : 'hover:bg-slate-50'
    const ariaLabel = describeDateForAria(dayDate, appointmentsForDay.length, isSelected)

    return (
      <div
        key={key}
        className="border-r border-b border-slate-200/80 min-h-[110px]"
      >
        <button
          type="button"
          onClick={() => handleSelectDay(key)}
          className={`${baseButtonClass} ${selectedClass}`}
          aria-label={ariaLabel}
        >
          <div className="flex items-center justify-between">
            <time
              dateTime={dayDate.toISOString()}
              className={
                isToday
                  ? 'flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white'
                  : 'text-sm font-semibold text-slate-700'
              }
            >
              {day}
            </time>
            {hasAppointments && (
              <span className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                {appointmentsForDay.length}
              </span>
            )}
          </div>
          {hasAppointments && (
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              {appointmentsForDay.slice(0, 2).map(appt => (
                <p key={appt.id} className="truncate">
                  <span className="font-semibold text-slate-700">
                    {formatAppointmentTime(appt)}
                  </span>
                  <span className="mx-1 text-slate-400">•</span>
                  <span>{appt.type}</span>
                </p>
              ))}
              {appointmentsForDay.length > 2 && (
                <p className="text-[11px] font-semibold text-primary-600">
                  +{appointmentsForDay.length - 2} more
                </p>
              )}
            </div>
          )}
        </button>
      </div>
    )
  }

  const calendarDays: React.ReactNode[] = []
  for (let i = 0; i < startingDayOfWeek; i += 1) {
    calendarDays.push(
      <div key={`blank-${i}`} className="border-r border-b border-slate-200/80 min-h-[110px]" />
    )
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarDays.push(renderDayCell(day))
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200/80 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Previous month"
          >
            <span className="material-symbols-outlined h-5 w-5">chevron_left</span>
          </button>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Next month"
          >
            <span className="material-symbols-outlined h-5 w-5">chevron_right</span>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-xs font-semibold text-slate-500">
        {dayHeaders.map(day => (
          <div
            key={day}
            className="border-b border-l border-slate-200/80 py-2 text-center first:border-l-0"
          >
            {day}
          </div>
        ))}
        {calendarDays}
      </div>
    </div>
  )
}

export default CalendarView