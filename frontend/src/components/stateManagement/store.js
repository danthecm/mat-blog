import React, { useReducer } from "react";
import { textReducer, textState } from "./genericReducer";
import { authReducer, authState } from "./authReducer";

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
  dispatch: () => {},
});


const { Provider } = store;

const StateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(combinedReducer, initialState);
  return <Provider value={{ state, dispatch }}>{children}</Provider>;
};

export { store, StateProvider };
