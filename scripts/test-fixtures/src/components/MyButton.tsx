// Test fixture: a React component
import { useState } from "react";
import type { ButtonProps } from "@/types/ui";
import { formatLabel } from "@/lib/utils";

export default function MyButton({ label, onClick }: ButtonProps) {
  const [pressed, setPressed] = useState(false);
  const display = formatLabel(label);
  return (
    <button onClick={() => { setPressed(true); onClick(); }}>
      {pressed ? "✓" : display}
    </button>
  );
}
