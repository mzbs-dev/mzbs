import { Header } from '@/components/dashboard/Header'
import TeacherTable from '@/components/teacher/TeacherTable'
import React from 'react'

const page = () => {
  return (
    <div className="w-full h-screen overflow-y-hidden bg-bg-light-secondary dark:bg-bg-dark-primary">
      <div className="pt-2 pl-2 pr-2">
        <Header value="Teacher" />
      </div>
      <TeacherTable />
    </div>
  )
}

export default page