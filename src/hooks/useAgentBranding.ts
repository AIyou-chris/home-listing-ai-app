import { useContext } from 'react';
import type { AgentBrandingContextValue } from '../context/AgentBrandingContext';
import { AgentBrandingContext } from '../context/AgentBrandingContextInstance';

export const useAgentBranding = (): AgentBrandingContextValue => {
  const context = useContext(AgentBrandingContext);
  if (!context) {
    throw new Error('useAgentBranding must be used within an AgentBrandingProvider');
  }
  return context;
};
