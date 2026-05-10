'use client';

import { StateProvider } from '@/src/components/stateManagement/store';

export default function ClientStateProvider({ children }) {
    return (
        <StateProvider>
            {children}
        </StateProvider>
    );
}
