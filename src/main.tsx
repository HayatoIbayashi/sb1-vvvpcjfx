import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from "react-oidc-context";

const cognitoAuthConfig = {
  authority: "https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_rYbPqg2yR",
  client_id: "51p21ae4hhsgjtd1jfakg4mpiu",
  //redirect_uri: "https://main.d3929j8czi5hb2.amplifyapp.com/",
  redirect_uri: "http://localhost:5173/",
  response_type: "code",
  scope: "phone openid email",
};

createRoot(document.getElementById('root')!).render(
  <AuthProvider {...cognitoAuthConfig}>
    <App />
  </AuthProvider>
);
