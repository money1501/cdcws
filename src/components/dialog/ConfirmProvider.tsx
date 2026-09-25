import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ConfirmDialog,
  type ConfirmIconType,
  type ConfirmVariant,
} from './ConfirmDialog';

export interface ConfirmOptions {
  title?: ReactNode;
  message?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: ConfirmIconType;
}

export type ConfirmFunction = (
  options?: ConfirmOptions | string,
) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFunction | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ConfirmOptions>({});
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm: ConfirmFunction = useCallback((options) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      if (typeof options === 'string') {
        setConfig({ title: 'Confirmation', message: options });
      } else {
        setConfig(options ?? {});
      }
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    resolverRef.current?.(true);
    resolverRef.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resolverRef.current?.(false);
    resolverRef.current = null;
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        isOpen={isOpen}
        title={config.title ?? 'Are you sure?'}
        message={config.message ?? 'This action cannot be undone.'}
        confirmText={config.confirmText ?? 'Delete'}
        cancelText={config.cancelText ?? 'Cancel'}
        variant={config.variant ?? 'danger'}
        icon={config.icon}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFunction {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a <ConfirmProvider>');
  }
  return context;
}
