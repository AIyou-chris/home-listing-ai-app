import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import ScheduleAppointmentModal, { ScheduleAppointmentFormData } from '../components/ScheduleAppointmentModal'
import { scheduleAppointment, AppointmentKind } from '../services/schedulerService'

interface OpenOptions {
  name?: string
  email?: string
  phone?: string
  kind?: AppointmentKind
  defaultMessage?: string
}

interface SchedulerContextValue {
  openScheduler: (opts?: OpenOptions) => void
}

const SchedulerContext = createContext<SchedulerContextValue | undefined>(
  undefined
)

export const SchedulerProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [prefill, setPrefill] = useState<OpenOptions | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const openScheduler = useCallback((opts?: OpenOptions) => {
    setPrefill(opts || null)
    setIsOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setPrefill(null)
  }, [])

  const ctxValue = useMemo(() => ({ openScheduler }), [openScheduler])

  return (
    <SchedulerContext.Provider value={ctxValue}>
      {children}
      {isOpen && (
        <ScheduleAppointmentModal
          lead={
            prefill?.name || prefill?.email || prefill?.phone
              ? {
                  id: 'prefill',
                  name: prefill?.name || '',
                  email: prefill?.email || '',
                  phone: prefill?.phone || '',
                  status: 'New',
                  date: new Date().toISOString(),
                  lastMessage: prefill?.defaultMessage || ''
                }
              : null
          }
          onClose={handleClose}
          onSchedule={async (data: ScheduleAppointmentFormData) => {
            if (submitting) return
            setSubmitting(true)
            try {
              await scheduleAppointment({
                name: data.name,
                email: data.email,
                phone: data.phone,
                date: data.date,
                time: data.time,
                message: data.message,
                kind: data.kind || prefill?.kind || 'Consultation',
                remindAgent: data.remindAgent,
                remindClient: data.remindClient,
                agentReminderMinutes: data.agentReminderMinutes,
                clientReminderMinutes: data.clientReminderMinutes
              })
              handleClose()
              alert('Appointment scheduled successfully')
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : 'Failed to schedule appointment'
              console.error('Schedule error', error)
              alert(message)
            } finally {
              setSubmitting(false)
            }
          }}
        />
      )}
    </SchedulerContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useScheduler = (): SchedulerContextValue => {
  const ctx = useContext(SchedulerContext)
  if (!ctx) throw new Error('useScheduler must be used within SchedulerProvider')
  return ctx
}

