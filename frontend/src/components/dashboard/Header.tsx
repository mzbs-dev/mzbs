import React from "react";

interface HeaderProps {
  value: string;
}

export const Header = ({ value }: HeaderProps) => {
  return (
    <div className="flex flex-col px-5 py-4 rounded-md shadow-md w-[100%] h-[4.3rem] justify-between dark:bg-secondary bg-primary">
      <h2 className="text-3xl text-center font-bold font-sans text-gray-100">
        {value}
      </h2>
    </div>
  );
};