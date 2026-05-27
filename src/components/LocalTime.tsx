"use client";

import React, { useState, useEffect } from "react";

export function LocalTime({ date }: { date: Date | string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <span className="opacity-0">00:00 AM</span>;

  return (
    <>{new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</>
  );
}
