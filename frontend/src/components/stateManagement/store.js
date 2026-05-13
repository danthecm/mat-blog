import React, { useReducer, useEffect } from "react";
import { textReducer, textState } from "./genericReducer";
import { authReducer, authState } from "./authReducer";
import api from "@/src/components/utils/api";

const reduceReducer = (...reducers) => (prevState, value, ...args) =>
  reducers.reduce(
    (newState, reducer) => reducer(newState, value, ...args),
    prevState
  );

const combinedReducer = reduceReducer(
    textReducer,
    authReducer
)


const initialState = {
  ...textState,
  ...authState
};

const store = React.createContext({
  state: initialState,
  dispatch: (action) => {},
});


const { Provider } = store;

const StateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(combinedReducer, initialState);

  useEffect(() => {
    const rehydrate = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          // Verify token by fetching user profile
          const userRes = await api.get('users/me/');
          dispatch({
            type: 'SET_USER',
            payload: {
              user: userRes.data.username,
              role: userRes.data.role,
              groups: userRes.data.groups || [],
            }
          });
        } catch (err) {
          console.error("Session rehydration failed", err);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          dispatch({ type: 'FINISH_HYDRATION' });
        }
      } else {
        dispatch({ type: 'FINISH_HYDRATION' });
      }
    };
    rehydrate();
  }, []);

  return <Provider value={{ state, dispatch }}>{children}</Provider>;
};


export { store, StateProvider };
