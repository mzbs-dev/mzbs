import { Header } from "@/components/dashboard/Header";
import ModernStudentTable from "@/components/Students/StudentTable";
import React from "react";

const page = () => {
  return (
    <div className="w-full md:w-[85%] h-screen overflow-y-auto overflow-x-auto bg-bg-light-secondary dark:bg-bg-dark-primary">
      <div className="w-full">
        <Header value="Students List" />
      </div>
      {/* <AddNewStudent/> */}
      <div className="px-3 sm:px-6 md:px-4">
        <ModernStudentTable />
      </div>
    </div>
  );
};

export default page;