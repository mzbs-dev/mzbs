// Fetches every record matching the currently active filters (not just the
// current page) so the printed report is complete. Reuses the same filters
// already applied on screen, plus the same search-box text filter, and
// leaves on-screen pagination completely untouched.
const handlePrintClick = async () => {
  if (!activeFilters) return;
  setIsPreparingPrint(true);
  try {
    const selectedYear = activeFilters.fee_year === "all" ? undefined : activeFilters.fee_year;
    const response = await API3.Filter({
      class_id: activeFilters.class_id && Number(activeFilters.class_id) !== 0
        ? Number(activeFilters.class_id)
        : undefined,
      fee_month: activeFilters.fee_month && activeFilters.fee_month !== "all"
        ? activeFilters.fee_month
        : undefined,
      fee_year: selectedYear,
      fee_status: activeFilters.fee_status && activeFilters.fee_status !== "all"
        ? activeFilters.fee_status
        : undefined,
      page: 1,
      page_size: 100000,
    });
    const payload = response?.data;
    const records = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
    const searchLower = searchQuery.toLowerCase();
    const filtered = (records as FeeData[]).filter((fee) =>
      fee.student_name.toLowerCase().includes(searchLower) ||
      fee.father_name.toLowerCase().includes(searchLower) ||
      fee.class_name.toLowerCase().includes(searchLower) ||
      fee.fee_month.toLowerCase().includes(searchLower) ||
      fee.fee_status.toLowerCase().includes(searchLower)
    );
    setPrintData(filtered);
  } catch (error) {
    console.error("Failed to prepare print data", error);
    toast.error("Failed to prepare print data");
    setIsPreparingPrint(false);
  }
};

// Once the full dataset lands, print it, then clear it out again.
useEffect(() => {
  if (printData.length === 0) return;
  const meta = `Total records: ${printData.length} · Printed: ${new Date().toLocaleDateString()}`;
  printRecords('fees-print-area-full', 'Fees Report', meta);
  setPrintData([]);
  setIsPreparingPrint(false);
}, [printData, printRecords]);
