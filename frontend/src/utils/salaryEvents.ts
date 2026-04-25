/**
 * Salary Event Bus
 * Simple event system for cross-component salary updates
 * When salary data changes in one component, all subscribed components are notified
 */

type SalaryUpdateCallback = () => void;

class SalaryEventBus {
  private listeners: SalaryUpdateCallback[] = [];

  /**
   * Subscribe to salary update events
   * @param callback Function to call when salary data changes
   * @returns Unsubscribe function
   */
  subscribe(callback: SalaryUpdateCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Emit a salary update event
   * This notifies all subscribed components to refresh their data
   */
  emit(): void {
    this.listeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error("Error in salary event listener:", error);
      }
    });
  }
}

export const salaryEventBus = new SalaryEventBus();
