import axiosInstance from "@/api/axiosInterceptorInstance";

// ============================================================================
// DEBIT MODULE INTERFACES
// (mirrors schemas/debit_model.py — PaymentMethod / DebitStatus enums,
// Debit/DebitPayment tables, and their Create/Response schemas)
// ============================================================================

export type PaymentMethod = "CASH" | "ONLINE";
export type DebitStatus = "ACTIVE" | "PARTIALLY_CLEARED" | "CLEARED";

export interface DebitResponse {
  id: number;
  person_name: string;
  debit_date: string; // YYYY-MM-DD
  amount: number;
  expected_return_date?: string | null;
  payment_method: PaymentMethod;
  receipt_no?: string | null;
  remarks?: string | null;
  created_at: string;
  cleared_amount: number; // derived: amount - remaining_balance
  remaining_balance: number;
  status: DebitStatus;
}

export interface DebitCreate {
  person_name: string;
  debit_date: string;
  amount: number;
  expected_return_date?: string;
  payment_method: PaymentMethod;
  receipt_no?: string;
  remarks?: string;
}

export interface DebitUpdate {
  person_name?: string;
  debit_date?: string;
  amount?: number;
  expected_return_date?: string;
  payment_method?: PaymentMethod;
  receipt_no?: string;
  remarks?: string;
}

export interface DebitPaymentResponse {
  id: number;
  debit_id: number;
  cleared_amount: number;
  payment_date: string; // YYYY-MM-DD
  payment_method: PaymentMethod;
  receipt_no?: string | null;
  remarks?: string | null;
  created_at: string;
}

export interface DebitPaymentCreate {
  debit_id: number;
  cleared_amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  receipt_no?: string;
  remarks?: string;
}

export interface DebitDetailResponse extends DebitResponse {
  payments: DebitPaymentResponse[];
}

export interface DebitMonthlyStat {
  month: number;
  year: number;
  taken: number;
  cleared: number;
}

export interface DebitSummaryResponse {
  total_debit_taken: number;
  total_debit_cleared: number;
  total_outstanding: number;
  active_count: number;
  partially_cleared_count: number;
  cleared_count: number;
  monthly: DebitMonthlyStat[];
}

export interface DebitFilters {
  date_from?: string;
  date_to?: string;
  status?: string; // comma-separated, e.g. "ACTIVE,PARTIALLY_CLEARED"
  payment_method?: PaymentMethod;
  person_name?: string;
}

export namespace DebitAPI {
  export const addDebit = async (data: DebitCreate): Promise<DebitResponse> => {
    try {
      const response = await axiosInstance.post<DebitResponse>("/debit/", data);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  export const getDebits = async (filters?: DebitFilters): Promise<DebitResponse[]> => {
    try {
      const response = await axiosInstance.get<DebitResponse[]>("/debit/all", {
        params: filters,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  export const getDebitById = async (id: number): Promise<DebitDetailResponse> => {
    try {
      const response = await axiosInstance.get<DebitDetailResponse>(`/debit/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  export const updateDebit = async (id: number, data: DebitUpdate): Promise<DebitResponse> => {
    try {
      const response = await axiosInstance.patch<DebitResponse>(`/debit/${id}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  export const deleteDebit = async (id: number): Promise<void> => {
    try {
      await axiosInstance.delete(`/debit/${id}`);
    } catch (error) {
      throw error;
    }
  };

  export interface DebitPaymentUpdate {
    cleared_amount?: number;
    payment_date?: string;
    payment_method?: PaymentMethod;
    receipt_no?: string;
    remarks?: string;
  }

  export const clearDebit = async (debitId: number, data: DebitPaymentCreate): Promise<DebitResponse> => {
    try {
      const response = await axiosInstance.post<DebitResponse>(`/debit/${debitId}/clear`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  export const updateDebitPayment = async (
    paymentId: number,
    data: DebitPaymentUpdate
  ): Promise<DebitPaymentResponse> => {
    try {
      const response = await axiosInstance.put<DebitPaymentResponse>(`/debit/payment/${paymentId}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  export const deleteDebitPayment = async (paymentId: number): Promise<void> => {
    try {
      await axiosInstance.delete(`/debit/payment/${paymentId}`);
    } catch (error) {
      throw error;
    }
  };

  export const getDebitSummary = async (): Promise<DebitSummaryResponse> => {
    try {
      const response = await axiosInstance.get<DebitSummaryResponse>("/debit/summary");
      return response.data;
    } catch (error) {
      throw error;
    }
  };
}
