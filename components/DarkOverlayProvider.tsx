import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { DarkScreenOverlay } from './DarkScreenOverlay';

interface DarkOverlayContextType {
  showDarkOverlay: () => void;
  hideDarkOverlay: () => void;
  isDarkOverlayVisible: boolean;
}

const DarkOverlayContext = createContext<DarkOverlayContextType | null>(null);

export function useDarkOverlay() {
  const context = useContext(DarkOverlayContext);
  if (!context) {
    throw new Error('useDarkOverlay must be used within a DarkOverlayProvider');
  }
  return context;
}

interface DarkOverlayProviderProps {
  children: ReactNode;
}

export function DarkOverlayProvider({ children }: DarkOverlayProviderProps) {
  const [isVisible, setIsVisible] = useState(false);

  const showDarkOverlay = useCallback(() => {
    setIsVisible(true);
  }, []);

  const hideDarkOverlay = useCallback(() => {
    setIsVisible(false);
  }, []);

  return (
    <DarkOverlayContext.Provider
      value={{
        showDarkOverlay,
        hideDarkOverlay,
        isDarkOverlayVisible: isVisible,
      }}
    >
      {children}
      <DarkScreenOverlay visible={isVisible} onDismiss={hideDarkOverlay} />
    </DarkOverlayContext.Provider>
  );
}
