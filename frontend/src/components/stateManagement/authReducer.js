export const authState = {
  user: null,
  display_name: null,
  avatar: null,
  accessToken: null,
  isAuthenticated: false,
  isHydrated: false, // Track if we've checked localStorage on mount
  role: null,
  groups: [],
};


export const authReducer = (state = authState, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        display_name: action.payload.display_name,
        avatar: action.payload.avatar,
        accessToken: action.payload.accessToken,
        isAuthenticated: true,
        role: action.payload.role,
        groups: action.payload.groups || [],
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        accessToken: null,
        isAuthenticated: false,
        role: null,
        groups: [],
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        display_name: action.payload.display_name,
        avatar: action.payload.avatar,
        role: action.payload.role,
        groups: action.payload.groups || [],
        isAuthenticated: true,
        isHydrated: true,
      };
    case 'FINISH_HYDRATION':
      return {
        ...state,
        isHydrated: true,
      };

    default:
      return state;
  }
};
