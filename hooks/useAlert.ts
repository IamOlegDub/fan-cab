'use client';

import { useCallback, useState } from 'react';

type AlertType = 'success' | 'error' | 'info';

type AlertState = {
    message: string;
    type: AlertType;
} | null;

export function useAlert() {
    const [alert, setAlert] = useState<AlertState>(null);

    const showAlert = useCallback(
        (message: string, type: AlertType = 'info') => {
            setAlert({ message, type });

            window.setTimeout(() => {
                setAlert(null);
            }, 3000);
        },
        [],
    );

    return {
        alert,
        showAlert,
    };
}
