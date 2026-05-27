'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useDispatch, useSelector } from 'react-redux';
import { setUserLog, clearUserLog } from '@/store/modules/user';

export default function SessionToReduxSync() {
	const { data: session, status } = useSession();
	const dispatch = useDispatch();
	const reduxEmail = useSelector((state) => state.user.email);

	useEffect(() => {
		if (status === 'loading') return;

		if (status === 'authenticated' && session?.user?.email) {
			if (session.user.email !== reduxEmail) {
				dispatch(setUserLog({ id: session.user.id, email: session.user.email }));
			}
		} else if (status === 'unauthenticated' && reduxEmail) {
			dispatch(clearUserLog());
		}
	}, [status, session, reduxEmail, dispatch]);

	return null;
}
