
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
        const dayString = dayDate.toISOString().split('T')[0];
        const isToday = dayDate.toDateString() === today.toDateString();

        // Find appointments for this day
        const dayAppointments = appointments.filter(appt => {
            const apptDate = new Date(appt.date);
            return !isNaN(apptDate.getTime()) && apptDate.toISOString().split('T')[0] === dayString;
        });

        const typeColors: Record<string, string> = {
            'Showing': 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
            'Consultation': 'bg-blue-50 text-blue-700 border-blue-100',
            'Open House': 'bg-amber-50 text-amber-700 border-amber-100',
            'Virtual Tour': 'bg-indigo-50 text-indigo-700 border-indigo-100',
            'Follow-up': 'bg-slate-50 text-slate-700 border-slate-100'
        };

        calendarDays.push(
            <div key={day} className={`border-r border-b border-slate-200/80 p-1 min-h-[6rem] flex flex-col transition-colors hover:bg-slate-50 ${isToday ? 'bg-indigo-50/30' : ''}`}>
                <div className="flex justify-between items-center mb-1">
                    <time
                        dateTime={dayDate.toISOString()}
                        className={`text-xs font-bold leading-none p-1 rounded-full ${isToday ? 'bg-primary-600 text-white w-6 h-6 flex items-center justify-center' : 'text-slate-700'}`}
                    >
                        {day}
                    </time>
                    <span className="text-[10px] text-slate-400 font-medium">{dayAppointments.length > 0 ? dayAppointments.length : ''}</span>
                </div>

                <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                    {dayAppointments.slice(0, 3).map(appt => (
                        <div
                            key={appt.id}
                            className={`text-[10px] px-1.5 py-0.5 rounded border truncate cursor-pointer hover:opacity-80 ${typeColors[appt.type] || 'bg-slate-50 text-slate-600 border-slate-100'}`}
                            title={`${appt.time} - ${appt.type} with ${appt.leadName || 'Lead'}`}
                        >
                            <span className="font-bold opacity-75 mr-1">{appt.time.replace(/\s*[ap]m/i, '')}</span>
                            <span className="font-semibold">{appt.type}</span>
                        </div>
                    ))}
                    {dayAppointments.length > 3 && (
                        <div className="text-[10px] text-slate-400 font-medium pl-1">
                            +{dayAppointments.length - 3} more
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200/80 p-2 sm:p-5">
            <div className="flex items-center justify-between mb-4 px-1">
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