export const authState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  role: null,
  groups: [],   // Array of group names from the API, e.g. ["editor"]
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
        role: action.payload.role,
        groups: action.payload.groups || [],
        isAuthenticated: true,
      };
    default:
      return state;
  }
};
