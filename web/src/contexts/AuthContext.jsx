import { createContext, useContext, useState, useEffect } from 'react';
import {
    authApi,
    captchaApi,
    isAuthenticated,
    clearToken,
    getServerUrl,
    setServerUrl,
    clearServerUrl,
    isRemoteConfigured,
    isSyncModeEnabled,
    isNativeApp,
} from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [serverUrl, setServerUrlState] = useState(getServerUrl());

    // 初始化时检查登录状态
    useEffect(() => {
        async function checkAuth() {
            if (isAuthenticated()) {
                try {
                    const profile = await authApi.getProfile();
                    setUser(profile);
                } catch {
                    clearToken();
                    if (isNativeApp()) {
                        const localProfile = await authApi.getProfile();
                        setUser(localProfile);
                    } else {
                        setUser(null);
                    }
                }
            } else {
                if (isNativeApp()) {
                    const localProfile = await authApi.getProfile();
                    setUser(localProfile);
                } else {
                    setUser(null);
                }
            }
            setLoading(false);
        }
        checkAuth();
    }, []);

    const login = async (username, password) => {
        const data = await authApi.login(username, password);
        setUser(data.user);
        return data;
    };

    const register = async (username, password, captchaId, captchaText) => {
        const data = await authApi.register(username, password, captchaId, captchaText);
        setUser(data.user);
        return data;
    };

    const logout = () => {
        authApi.logout();
        if (isNativeApp()) {
            authApi.getProfile().then(setUser);
        } else {
            setUser(null);
        }
    };

    const saveServerAddress = async (url) => {
        if (!isNativeApp()) {
            throw new Error('Web 端不支持修改服务器地址');
        }

        if (!url?.trim()) {
            clearServerUrl();
            clearToken();
            setServerUrlState('');
            const localProfile = await authApi.getProfile();
            setUser(localProfile);
            return '';
        }

        const normalized = setServerUrl(url);
        if (!normalized) {
            throw new Error('服务器地址格式无效');
        }

        clearToken();
        setServerUrlState(normalized);
        const localProfile = await authApi.getProfile();
        setUser(localProfile);
        return normalized;
    };

    const getCaptcha = async () => {
        return captchaApi.get();
    };

    const uploadAvatar = async (file) => {
        const updatedUser = await authApi.uploadAvatar(file);
        setUser(updatedUser);
        return updatedUser;
    };

    const updateSettings = async (settings) => {
        const updatedUser = await authApi.updateSettings(settings);
        setUser(updatedUser);
        return updatedUser;
    };

    const changePassword = async (oldPassword, newPassword) => {
        return authApi.changePassword(oldPassword, newPassword);
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            register,
            logout,
            getCaptcha,
            uploadAvatar,
            updateSettings,
            changePassword,
            isAuthenticated: !!user,
            serverUrl,
            saveServerAddress,
            isRemoteConfigured: isRemoteConfigured(),
            isCloudSession: isSyncModeEnabled(),
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
