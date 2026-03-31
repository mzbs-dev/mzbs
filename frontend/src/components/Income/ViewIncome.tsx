// "use client";
// import { IncomeCategory } from "@/models/income/income";
// import React, { useEffect, useState } from "react";
// import { IncomeAPI as API } from "@/api/Income/IncomeAPI";
// import { useForm } from "react-hook-form";

// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table"; // Adjust the import path based on your project structure
// import { Header } from "../dashboard/Header";
// import Loader from "../Loader";

// // Define interfaces for form values and income data
// interface IncomeFormValues {
//   category_id: number;
// }

// interface IncomeDataItem {
//   id: number;
//   date: string;
//   category: string;
//   source: string;
//   description: string;
//   contact: string;
//   amount: number;
// }

// // Define API response type
// interface ApiResponse<T> {
//   data: T;
//   status: number;
//   message?: string;
// }

// const ViewIncome = () => {
//   const {
//     register,
//     formState: { errors },
//   } = useForm<IncomeFormValues>();
//   const [isLoading, setIsLoading] = useState(false);
//   const [incomeCategory, setIncomeCategory] = useState<IncomeCategory[]>([]);
//   const [incomeData, setIncomeData] = useState<IncomeDataItem[]>([]); // State to store income data

//   useEffect(() => {
//     getCategories();
//   }, []);

//   const getCategories = async () => {
//     setIsLoading(true);
//     try {
//       const res = (await API.GetIncomeCategory()) as ApiResponse<IncomeCategory[]>;
//       const data = res.data.map((item: IncomeCategory) => ({
//         income_cat_name_id: item.income_cat_name_id,
//         income_cat_name: item.income_cat_name,
//         created_at: item.created_at,
//       }));
//       setIncomeCategory(data);
//     } catch (error) {
//       console.error("Error fetching income categories:", error);
//       setIncomeCategory([]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const getIncome = async (CategoryId: number) => {
//     setIsLoading(true);
//     try {
//       const res = (await API.GetIncomeData(CategoryId)) as ApiResponse<IncomeDataItem[]>;
//       setIncomeData(res.data); // Store the income data in state
//     } catch (error) {
//       console.error("Error fetching income data:", error);
//       setIncomeData([]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="container mx-auto">
//       <Header value="View Income" />
//       <Loader isActive={isLoading} />

//       <form className="space-y-4 border w-full my-2">
//         <div className="space-y-4 px-2 rounded-md">
//           <label className="font-bold text-sm dark:text-gray-300">
//             Category:{" "}
//           </label>
//           <select
//             {...register("category_id", {
//               valueAsNumber: true,
//               required: "Category is required",
//             })}
//             className="w-[14rem] border bg-white rounded-md px-3 py-2 focus:ring focus:ring-indigo-300 dark:bg-background dark:text-gray-300"
//             onChange={(e) => getIncome(Number(e.target.value))} // Call getIncome with selected income_cat_name_id
//           >
//             <option disabled selected value="">
//               Select Category
//             </option>
//             {incomeCategory.map((category) => (
//               <option
//                 key={category.income_cat_name_id}
//                 value={category.income_cat_name_id}
//               >
//                 {category.income_cat_name}
//               </option>
//             ))}
//           </select>
//           <p className="text-red-500 text-xs">
//             {typeof errors.category_id?.message === "string" &&
//               errors.category_id?.message}
//           </p>
//         </div>
//       </form>

//       {/* Table to display income data */}
//       <div className="mt-4 container mx-auto bg-white dark:bg-background rounded-md">
//         {incomeData.length > 0 ? (
//           <Table>
//             <TableHeader className="bg-primary dark:bg-secondary hover:bg-none">
//               <TableRow>
//                 <TableHead className="text-gray-100">ID</TableHead>
//                 <TableHead className="text-gray-100">Date</TableHead>
//                 <TableHead className="text-gray-100">Category</TableHead>
//                 <TableHead className="text-gray-100">Source</TableHead>
//                 <TableHead className="text-gray-100">Description</TableHead>
//                 <TableHead className="text-gray-100">Contact</TableHead>
//                 <TableHead className="text-gray-100">Amount</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {incomeData.map((item) => (
//                 <TableRow className="h-[1rem]" key={item.id}>
//                   <TableCell>{item.id}</TableCell>
//                   <TableCell>{item.date}</TableCell>
//                   <TableCell>{item.category}</TableCell>
//                   <TableCell>{item.source}</TableCell>
//                   <TableCell>{item.description}</TableCell>
//                   <TableCell>{item.contact}</TableCell>
//                   <TableCell>{item.amount}</TableCell>
//                 </TableRow>
//               ))}
//             </TableBody>
//           </Table>
//         ) : (
//           <p>Select Category for View Income.</p>
//         )}
//       </div>
//     </div>
//   );
// };

// export default ViewIncome;

"use client";
import { IncomeCategory } from "@/models/income/income";
import React, { useEffect, useState } from "react";
import { IncomeAPI as API } from "@/api/Income/IncomeAPI";
import { useForm } from "react-hook-form";
import { usePrint } from "@/components/print/usePrint";
import { Printer } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Header } from "../dashboard/Header";
import Loader from "../Loader";

interface IncomeFormValues {
  category_id: number;
}

interface IncomeDataItem {
  id: number;
  date: string;
  category: string;
  source: string;
  description: string;
  contact: string;
  amount: number;
}

interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

const ViewIncome = () => {
  const {
    register,
    formState: { errors },
  } = useForm<IncomeFormValues>();
  const { printRecords } = usePrint();

  const [isLoading, setIsLoading] = useState(false);
  const [incomeCategory, setIncomeCategory] = useState<IncomeCategory[]>([]);
  const [incomeData, setIncomeData] = useState<IncomeDataItem[]>([]);

  // Load categories + all incomes on first mount
  useEffect(() => {
    getCategories();
    getAllIncome();
  }, []);

  const getCategories = async () => {
    setIsLoading(true);
    try {
      const res = (await API.GetIncomeCategory()) as ApiResponse<IncomeCategory[]>;
      const data = res.data.map((item: IncomeCategory) => ({
        income_cat_name_id: item.income_cat_name_id,
        income_cat_name: item.income_cat_name,
        created_at: item.created_at,
      }));
      setIncomeCategory(data);
    } catch (error) {
      console.error("Error fetching income categories:", error);
      setIncomeCategory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getAllIncome = async () => {
    setIsLoading(true);
    try {
      // The frontend API wrapper doesn't expose GetAllIncome, use GetIncomeData with 0 (component treats 0 as "All")
      const res = (await API.GetIncomeData(0)) as ApiResponse<IncomeDataItem[]>;
      setIncomeData(res.data);
    } catch (error) {
      console.error("Error fetching all income data:", error);
      setIncomeData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getIncome = async (CategoryId: number) => {
    if (CategoryId === 0) {
      // Special case for "All"
      getAllIncome();
      return;
    }
    setIsLoading(true);
    try {
      const res = (await API.GetIncomeData(CategoryId)) as ApiResponse<IncomeDataItem[]>;
      setIncomeData(res.data);
    } catch (error) {
      console.error("Error fetching income data:", error);
      setIncomeData([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto">
      <Header value="View Income" />
      <Loader isActive={isLoading} />

      <form className="space-y-4 border w-full my-2">
        <div className="space-y-4 px-2 rounded-md">
          <label className="font-bold text-sm dark:text-gray-300">Category: </label>
          <select
            {...register("category_id", { valueAsNumber: true })}
            className="w-[14rem] border bg-white rounded-md px-3 py-2 focus:ring focus:ring-indigo-300 dark:bg-background dark:text-gray-300"
            onChange={(e) => getIncome(Number(e.target.value))}
          >
            <option value={0}>All</option>
            {incomeCategory.map((category) => (
              <option
                key={category.income_cat_name_id}
                value={category.income_cat_name_id}
              >
                {category.income_cat_name}
              </option>
            ))}
          </select>
          <p className="text-red-500 text-xs">
            {typeof errors.category_id?.message === "string" &&
              errors.category_id?.message}
          </p>
        </div>
      </form>

      <div className="mt-4 container mx-auto bg-white dark:bg-background rounded-md">
        {incomeData.length > 0 ? (
          <>
            <div className="flex justify-between items-center p-4 no-print">
              <h3 className="text-lg font-semibold">Income Data</h3>
              <button
                onClick={() => {
                  const meta = `Total records: ${incomeData.length} · Printed: ${new Date().toLocaleDateString()}`;
                  printRecords('income-print-area', 'Income Report', meta);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                <Printer size={16} />
                Print
              </button>
            </div>
            <div id="income-print-area">
              <Table>
                <TableHeader className="bg-primary dark:bg-secondary hover:bg-none">
                  <TableRow>
                    <TableHead className="text-gray-100">ID</TableHead>
                    <TableHead className="text-gray-100">Date</TableHead>
                    <TableHead className="text-gray-100">Category</TableHead>
                    <TableHead className="text-gray-100">Source</TableHead>
                    <TableHead className="text-gray-100">Description</TableHead>
                    <TableHead className="text-gray-100">Contact</TableHead>
                    <TableHead className="text-gray-100">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeData.map((item) => (
                    <TableRow className="h-[1rem]" key={item.id}>
                      <TableCell>{item.id}</TableCell>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.source}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.contact}</TableCell>
                      <TableCell>{item.amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <p>No income records available.</p>
        )}
      </div>
    </div>
  );
};

export default ViewIncome;

