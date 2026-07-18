"use client";

export function RegenerateButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-8 right-8 text-[#E5E7EB] border border-[#374151] px-4 py-2 font-mono text-xs hover:bg-[#374151] hover:text-white transition-colors duration-300 uppercase tracking-wider"
    >
      [ REGENERATE ]
    </button>
  );
}
