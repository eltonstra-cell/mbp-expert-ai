"use client";

import { createContext, useContext } from "react";

export const IaPermitidaContext = createContext(true);

export function useIaPermitida(): boolean {
  return useContext(IaPermitidaContext);
}
