import MarkAttendance from '@/components/Attendance/MarkAttendance'
import React from 'react'

const page = () => {
  return (
    <div className="w-full container mx-auto h-screen overflow-y-hidden bg-bg-light-secondary dark:bg-bg-dark-primary">
      <div className="pt-2 pl-2 pr-2">
        {/* <Header value="Mark Attendance" /> */}
      </div>
      <MarkAttendance/>
    </div>
  )
}

export default page