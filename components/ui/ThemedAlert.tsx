import { useState, createContext, useContext, useCallback, ReactNode } from 'react';
import { View, StyleSheet, Modal, Pressable } from 'react-native';
import { Text, Heading } from './Text';
import { colors, spacing, borderRadius } from '@/theme/tokens';

interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

interface AlertContextType {
  showAlert: (title: string, message?: string, buttons?: AlertButton[]) => void;
}

const AlertContext = createContext<AlertContextType | null>(null);

export function useThemedAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useThemedAlert must be used within ThemedAlertProvider');
  }
  return context;
}

interface ThemedAlertProviderProps {
  children: ReactNode;
}

export function ThemedAlertProvider({ children }: ThemedAlertProviderProps) {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: '',
    message: undefined,
    buttons: [],
  });

  const showAlert = useCallback((title: string, message?: string, buttons?: AlertButton[]) => {
    setAlertState({
      visible: true,
      title,
      message,
      buttons: buttons || [{ text: 'OK', style: 'default' }],
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleButtonPress = useCallback(
    (button: AlertButton) => {
      hideAlert();
      if (button.onPress) {
        setTimeout(() => button.onPress?.(), 100);
      }
    },
    [hideAlert]
  );

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal
        visible={alertState.visible}
        transparent
        animationType="fade"
        onRequestClose={hideAlert}
      >
        <Pressable style={styles.overlay} onPress={hideAlert}>
          <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
            <View style={styles.content}>
              <Heading variant="h4" color="primary" align="center">
                {alertState.title}
              </Heading>
              {alertState.message && (
                <Text variant="body" color="secondary" align="center" style={styles.message}>
                  {alertState.message}
                </Text>
              )}
            </View>
            <View style={styles.buttonContainer}>
              {alertState.buttons.map((button, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.button,
                    index > 0 && styles.buttonBorder,
                    button.style === 'destructive' && styles.destructiveButton,
                  ]}
                  onPress={() => handleButtonPress(button)}
                >
                  <Text
                    variant="body"
                    weight={button.style === 'cancel' ? 'normal' : 'semibold'}
                    color={button.style === 'destructive' ? 'error' : 'primary'}
                    align="center"
                  >
                    {button.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AlertContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  container: {
    backgroundColor: colors.gray[900],
    borderRadius: borderRadius.xl,
    width: '100%',
    maxWidth: 320,
    overflow: 'hidden',
  },
  content: {
    padding: spacing.lg,
  },
  message: {
    marginTop: spacing.sm,
  },
  buttonContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[800],
    flexDirection: 'row',
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonBorder: {
    borderLeftWidth: 1,
    borderLeftColor: colors.gray[800],
  },
  destructiveButton: {},
});
