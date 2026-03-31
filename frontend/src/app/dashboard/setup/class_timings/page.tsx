import ClassTiming from '@/components/ClassTiming/TimingTable'
import { Header } from '@/components/dashboard/Header'
import React from 'react'

const page = () => {
  return (
    <div className="w-[100%] h-screen overflow-y-hidden bg-bg-light-secondary dark:bg-bg-dark-primary">
      <div className="pt-2 pl-2 pr-2">
        <Header value="Class Timings" />
      </div>
      <ClassTiming />
    </div>
  )
}

export default page