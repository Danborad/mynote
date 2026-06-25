import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { NotesProvider } from './contexts/NotesContext.jsx'

async function setupNativeStatusBar() {
    const cap = window.Capacitor
    if (!cap || typeof cap.isNativePlatform !== 'function' || !cap.isNativePlatform()) {
        return
    }

    try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        await StatusBar.setOverlaysWebView({ overlay: false })
        await StatusBar.setBackgroundColor({ color: '#EAF2FA' })
        await StatusBar.setStyle({ style: Style.Dark })
    } catch {
        // ignore plugin errors on unsupported platforms
    }
}

setupNativeStatusBar()

function markIconFontReady() {
    const root = document.documentElement
    root.classList.remove('icons-loading')
    root.classList.add('icons-ready')
}

if (document.fonts?.load) {
    document.fonts.load('24px "Material Icons Outlined"')
        .then(markIconFontReady)
        .catch(markIconFontReady)
} else {
    markIconFontReady()
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ThemeProvider>
            <AuthProvider>
                <NotesProvider>
                    <App />
                </NotesProvider>
            </AuthProvider>
        </ThemeProvider>
    </React.StrictMode>,
)
