import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./feedback.css";
import App from "./App";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { NotificationProvider } from "./components/Notifications/NotificationProvider";
import { installRuntimeUrlBridge } from "./config/runtimeUrls";

installRuntimeUrlBridge();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || "585306456358-jmcoeuhreeb59d84vmb375gqa696lant.apps.googleusercontent.com"}>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
