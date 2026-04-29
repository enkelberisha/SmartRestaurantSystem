import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from '@/app/App'
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/home.css";
import "@/styles/auth-layout.css";
import "@/styles/role-page.css";
import "@/styles/superadmin.css";
import { UserProvider } from "@/context/UserContext";
import { ToastProvider } from "@/superadmin/context/ToastContext";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <UserProvider>
                <ToastProvider>
                    <BrowserRouter>
                        <App />
                    </BrowserRouter>
                </ToastProvider>
            </UserProvider>
        </QueryClientProvider>
    </React.StrictMode>,
)
