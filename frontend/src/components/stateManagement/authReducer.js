export const authState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  role: null,
};

export const authReducer = (state = authState, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        isAuthenticated: true,
        role: action.payload.role,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        accessToken: null,
        isAuthenticated: false,
        role: null,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        role: action.payload.role,
        isAuthenticated: true,
      };
    default:
      return state;
  }
};
