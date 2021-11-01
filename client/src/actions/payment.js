import apiUrl from "../config/default";
import axios from "axios";
import { setAlert } from "./alert";
import { loadUser } from "./auth";
import { TRANSACTION_COMPLETE, GET_PAYMENTS } from "./types";

export const completeTransaction = (
  { orderID },
  expires_at,
  history,
  cost
) => async dispatch => {
  const axiosConfig = {
    headers: {
      "Content-Type": "application/json"
    }
  };
  const body = JSON.stringify({ orderID, expires_at, cost });

  try {
    const res = await axios.post(
      `${apiUrl}/api/payments/paypal/transaction-complete`,
      body,
      axiosConfig
    );
    dispatch({
      type: TRANSACTION_COMPLETE,
      payload: res.data
    });
    dispatch(loadUser()).then(() => history.push("/home"));
  } catch (err) {
    const errors = err.response.data.errors;
    if (errors) {
      errors.forEach(error => dispatch(setAlert(error.msg, "error")));
    }
  }
};

export const getPayments = () => async dispatch => {
  try {
    const res = await axios.get(`${apiUrl}/api/payments`);
    dispatch({
      type: GET_PAYMENTS,
      payload: res.data
    });
  } catch (err) {
    dispatch({
      // type: AUTH_ERROR
    });
  }
};
