// Test fixture: type definitions file
export interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}

export interface DataItem {
  id: string;
  name: string;
  value: number;
}

export type Status = "idle" | "loading" | "success" | "error";

export type Nullable<T> = T | null;
