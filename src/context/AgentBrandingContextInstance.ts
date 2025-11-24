import { createContext } from 'react';
import type { AgentBrandingContextValue } from './AgentBrandingContext';

export const AgentBrandingContext = createContext<AgentBrandingContextValue | null>(null);
