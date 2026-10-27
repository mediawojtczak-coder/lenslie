"use client";

import type { ReactNode } from "react";

// Przycisk wysyłający formularz dopiero po potwierdzeniu
export default function ConfirmButton({ message, children }: { message: string; children: ReactNode }) {
  return (
    <button
      type="submit"
      className="btn btn-small btn-danger"
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
