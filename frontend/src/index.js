import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./feedback.css";
import App from "./App";
import { GoogleOAuthProvider } from '@react-oauth/google';

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId="585306456358-jmcoeuhreeb59d84vmb375gqa696lant.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
