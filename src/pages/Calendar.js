import React, { useState } from 'react';

const Calendar = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState('week');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const events = [
    // Sample data - will be replaced with Google Calendar data
    {
      id: 1,
      title: 'Session with John Doe',
      start: '2023-01-15T09:00:00',
      end: '2023-01-15T10:00:00',
      client: 'John Doe',
      therapist: 'Dr. Sarah Johnson',
      type: 'session',
      status: 'confirmed'
    }
  ];

  const renderCalendarHeader = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return (
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {selectedDate.toLocaleDateString(undefined, options)}
        </h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setView('day')}
            className={`px-4 py-2 rounded ${
              view === 'day'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setView('week')}
            className={`px-4 py-2 rounded ${
              view === 'week'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setView('month')}
            className={`px-4 py-2 rounded ${
              view === 'month'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Month
          </button>
        </div>
      </div>
    );
  };

  const renderCalendarView = () => {
    if (view === 'day') {
      return (
        <div className="bg-white rounded-lg shadow">
          <div className="grid grid-cols-1">
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} className="border-b p-2">
                <div className="text-sm text-gray-500">
                  {i.toString().padStart(2, '0')}:00
                </div>
                {events
                  .filter(event => {
                    const eventStart = new Date(event.start);
                    return (
                      eventStart.getDate() === selectedDate.getDate() &&
                      eventStart.getMonth() === selectedDate.getMonth() &&
                      eventStart.getFullYear() === selectedDate.getFullYear() &&
                      eventStart.getHours() === i
                    );
                  })
                  .map(event => (
                    <div
                      key={event.id}
                      className="mt-2 p-2 bg-indigo-100 rounded cursor-pointer"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="font-medium">{event.title}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(event.start).toLocaleTimeString()} -{' '}
                        {new Date(event.end).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (view === 'week') {
      return (
        <div className="bg-white rounded-lg shadow">
          <div className="grid grid-cols-7">
            {Array.from({ length: 7 }, (_, i) => {
              const date = new Date(selectedDate);
              date.setDate(selectedDate.getDate() - selectedDate.getDay() + i);
              return (
                <div key={i} className="border-b p-2">
                  <div className="text-sm font-medium">
                    {date.toLocaleDateString(undefined, { weekday: 'short' })}
                  </div>
                  <div className="text-sm text-gray-500">
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 7 }, (_, i) => {
              const date = new Date(selectedDate);
              date.setDate(selectedDate.getDate() - selectedDate.getDay() + i);
              return (
                <div key={i} className="border-r p-2 min-h-[500px]">
                  {events
                    .filter(event => {
                      const eventDate = new Date(event.start);
                      return (
                        eventDate.getDate() === date.getDate() &&
                        eventDate.getMonth() === date.getMonth() &&
                        eventDate.getFullYear() === date.getFullYear()
                      );
                    })
                    .map(event => (
                      <div
                        key={event.id}
                        className="mt-2 p-2 bg-indigo-100 rounded cursor-pointer"
                        onClick={() => setSelectedEvent(event)}
                      >
                        <div className="font-medium">{event.title}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(event.start).toLocaleTimeString()} -{' '}
                          {new Date(event.end).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (view === 'month') {
      const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDay = firstDay.getDay();

      return (
        <div className="bg-white rounded-lg shadow">
          <div className="grid grid-cols-7">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="border-b p-2 text-center font-medium">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 42 }, (_, i) => {
              const day = i - startingDay + 1;
              const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
              return (
                <div
                  key={i}
                  className={`border p-2 min-h-[100px] ${
                    day < 1 || day > daysInMonth ? 'bg-gray-50' : ''
                  }`}
                >
                  {day > 0 && day <= daysInMonth && (
                    <>
                      <div className="text-sm">{day}</div>
                      {events
                        .filter(event => {
                          const eventDate = new Date(event.start);
                          return (
                            eventDate.getDate() === day &&
                            eventDate.getMonth() === selectedDate.getMonth() &&
                            eventDate.getFullYear() === selectedDate.getFullYear()
                          );
                        })
                        .map(event => (
                          <div
                            key={event.id}
                            className="mt-1 p-1 bg-indigo-100 rounded text-xs cursor-pointer"
                            onClick={() => setSelectedEvent(event)}
                          >
                            {event.title}
                          </div>
                        ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="container mx-auto px-4">
      {renderCalendarHeader()}
      {renderCalendarView()}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Event Details</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Title</label>
                <div className="font-medium">{selectedEvent.title}</div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Client</label>
                <div>{selectedEvent.client}</div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Therapist</label>
                <div>{selectedEvent.therapist}</div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Time</label>
                <div>
                  {new Date(selectedEvent.start).toLocaleString()} -{' '}
                  {new Date(selectedEvent.end).toLocaleString()}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Status</label>
                <div>{selectedEvent.status}</div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                  Edit Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
