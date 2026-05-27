import { createSlice } from '@reduxjs/toolkit';

// Slice
const slice = createSlice({
	name: 'userModule',
	initialState: {
		id: null,
		email: null,
		isLoggedIn: false,
	},
	reducers: {
		SET_USER_LOG: (state, action) => {
			const { id, email } = action.payload;
			state.id = id || null;
			state.email = email || null;
			state.isLoggedIn = !!email;
		},
		CLEAR_USER_LOG: (state) => {
			state.id = null;
			state.email = null;
			state.isLoggedIn = false;
		},
	},
});

export default slice.reducer;

// Actions
const {
	SET_USER_LOG,
	CLEAR_USER_LOG,
} = slice.actions;

export const setUserLog = (payload) => async dispatch => {
	dispatch(SET_USER_LOG(payload));
}

export const clearUserLog = () => async dispatch => {
	dispatch(CLEAR_USER_LOG());
}
