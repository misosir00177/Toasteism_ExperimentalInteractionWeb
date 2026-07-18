"use client";

import { useState } from "react";
import { ToastScene } from "../components/ToastScene";
import { InteractionHint } from "../components/InteractionHint";
import { RegenerateButton } from "../components/RegenerateButton";

export default function Home() {
  const [resetTrigger, setResetTrigger] = useState(0);

  return (
    <main className="relative w-screen h-screen bg-[#0F1115] overflow-hidden">
      <ToastScene resetTrigger={resetTrigger} />
      <InteractionHint />
      <RegenerateButton onClick={() => setResetTrigger(prev => prev + 1)} />
    </main>
  );
}
