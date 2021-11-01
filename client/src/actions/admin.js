import apiUrl from "../config/default";
import axios from "axios";
import { setAlert } from "./alert";
import {
  ADMIN_GET_USERS,
  ADMIN_GET_PAYMENTS,
  ADMIN_GET_ROLES,
  ADMIN_GET_STREAMS,
  ADMIN_CREATE_STREAM,
  ADMIN_DELETE_STREAM,
  ADMIN_EDIT_STREAM
} from "./types";

export const getUsers = () => async dispatch => {
  try {
    const res = await axios.get(`${apiUrl}/api/admin/users`);
    dispatch({
      type: ADMIN_GET_USERS,
      payload: res.data
    });
  } catch (err) {
    console.log(err);
    const errors = err.response.data.errors;
    if (errors) {
      errors.forEach(error => dispatch(setAlert(error.msg, "error")));
    }
  }
};

export const getPayments = () => async dispatch => {
  try {
    const res = await axios.get(`${apiUrl}/api/admin/payments`);
    dispatch({
      type: ADMIN_GET_PAYMENTS,
      payload: res.data
    });
  } catch (err) {
    console.log(err);
    const errors = err.response.data.errors;
    if (errors) {
      errors.forEach(error => dispatch(setAlert(error.msg, "error")));
    }
  }
};

export const getRoles = () => async dispatch => {
  try {
    const res = await axios.get(`${apiUrl}/api/admin/roles`);
    dispatch({
      type: ADMIN_GET_ROLES,
      payload: res.data
    });
  } catch (err) {
    console.log(err);
    const errors = err.response.data.errors;
    if (errors) {
      errors.forEach(error => dispatch(setAlert(error.msg, "error")));
    }
  }
};

export const getStreams = () => async dispatch => {
  try {
    const res = await axios.get(`${apiUrl}/api/admin/streams`);
    dispatch({
      type: ADMIN_GET_STREAMS,
      payload: res.data
    });
  } catch (err) {
    console.log(err);
    const errors = err.response.data.errors;
    if (errors) {
      errors.forEach(error => dispatch(setAlert(error.msg, "error")));
    }
  }
};

export const createStream = ({
  title,
  description,
  category,
  image_url,
  sling,
  sling_channel,
  hls_url,
  event_date,
  active
}) => async dispatch => {
  const axiosConfig = {
    headers: {
      "Content-Type": "application/json"
    }
  };
  const body = JSON.stringify({
    title,
    description,
    category,
    image_url,
    sling,
    sling_channel,
    hls_url,
    event_date,
    active
  });

  try {
    const res = await axios.post(
      `${apiUrl}/api/admin/streams`,
      body,
      axiosConfig
    );
    dispatch({
      type: ADMIN_CREATE_STREAM,
      payload: res.data
    });
    dispatch(setAlert("Stream created successfully!", "success"));
  } catch (err) {
    const errors = err.response.data.errors;
    if (errors) {
      errors.forEach(error => dispatch(setAlert(error.msg, "error")));
    }
  }
};

export const deleteStream = id => async dispatch => {
  try {
    const res = await axios.delete(`${apiUrl}/api/admin/streams/${id}`);
    dispatch({
      type: ADMIN_DELETE_STREAM,
      payload: res.data
    });
  } catch (err) {
    console.log(err);
    const errors = err.response.data.errors;
    if (errors) {
      errors.forEach(error => dispatch(setAlert(error.msg, "error")));
    }
  }
};

export const editStream = ({
  _id,
  title,
  description,
  category,
  image_url,
  sling,
  sling_channel,
  hls_url,
  event_date,
  active
}) => async dispatch => {
  const axiosConfig = {
    headers: {
      "Content-Type": "application/json"
    }
  };
  const body = JSON.stringify({
    title,
    description,
    category,
    image_url,
    sling,
    sling_channel,
    hls_url,
    event_date,
    active
  });

  try {
    const res = await axios.patch(
      `${apiUrl}/api/admin/streams/${_id}`,
      body,
      axiosConfig
    );
    dispatch({
      type: ADMIN_EDIT_STREAM,
      payload: res.data
    });
    dispatch(setAlert("Stream edited successfully!", "success"));
  } catch (err) {
    const errors = err.response.data.errors;
    if (errors) {
      errors.forEach(error => dispatch(setAlert(error.msg, "error")));
    }
  }
};
