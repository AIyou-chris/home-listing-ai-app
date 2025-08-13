
import React, { useState, useMemo } from 'react';
import { Appointment } from '../types';

interface CalendarViewProps {
    appointments: Appointment[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ appointments }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const appointmentDates = useMemo(() => {
        const dateSet = new Set<string>();
        appointments.forEach(appt => {
            const date = new Date(appt.date);
            if (!isNaN(date.getTime())) {
                dateSet.add(date.toISOString().split('T')[0]); // Store as YYYY-MM-DD
            }
        });
        return dateSet;
    }, [appointments]);

    const changeMonth = (amount: number) => {
        setCurrentDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setMonth(newDate.getMonth() + amount);
            return newDate;
        });
    };

    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, ...

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const calendarDays = [];
    // Add blank days for the start of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarDays.push(<div key={`blank-${i}`} className="border-r border-b border-slate-200/80"></div>);
    }

    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const isToday = dayDate.getTime() === today.getTime();
        const hasAppointment = appointmentDates.has(dayDate.toISOString().split('T')[0]);

        calendarDays.push(
            <div key={day} className="border-r border-b border-slate-200/80 p-2 h-24 flex flex-col">
                <div className="flex justify-between items-center">
                    <time
                        dateTime={dayDate.toISOString()}
                        className={`text-sm font-semibold ${isToday ? 'bg-primary-600 text-white rounded-full w-7 h-7 flex items-center justify-center' : 'text-slate-700'}`}
                    >
                        {day}
                    </time>
                    {hasAppointment && !isToday && <div className="w-2 h-2 bg-green-500 rounded-full" title="Appointment"></div>}
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200/80 p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex items-center space-x-1">
                    <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition">
                        <span className="material-symbols-outlined w-5 h-5">chevron_left</span>
                    </button>
                     <button onClick={() => changeMonth(1)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition">
                        <span className="material-symbols-outlined w-5 h-5">chevron_right</span>
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500 border-t border-l border-slate-200/80">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                     <div key={day} className="py-2 border-r border-b border-slate-200/80">{day}</div>
                ))}
                {calendarDays}
            </div>
        </div>
    );
};

export default CalendarView;