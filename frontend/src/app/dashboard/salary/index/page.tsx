import ViewSalary from '@/components/Salary/ViewSalary'
import React from 'react'

const page = () => {
  return (
    <div className="w-full min-h-screen overflow-y-auto">
      <div className="rounded-[24px] border border-border/80 bg-card/80 p-3 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-4">
        <ViewSalary />
      </div>
    </div>
  )
}

export default page
