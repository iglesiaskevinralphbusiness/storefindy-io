'use client';

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SessionProvider } from 'next-auth/react';
import { store, persistor } from '@/store';
import SessionToReduxSync from './SessionToReduxSync';

export default function StoreProvider({ children }) {
	return (
		<SessionProvider>
			<Provider store={store}>
				<PersistGate loading={null} persistor={persistor}>
					<SessionToReduxSync />
					{children}
				</PersistGate>
			</Provider>
		</SessionProvider>
	);
}
