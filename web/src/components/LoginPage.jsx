import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
    const { login, register, getCaptcha } = useAuth()
    const [isLogin, setIsLogin] = useState(true)
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [captchaId, setCaptchaId] = useState('')
    const [captchaImage, setCaptchaImage] = useState('')
    const [captchaText, setCaptchaText] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const loadCaptcha = async () => {
        try {
            const data = await getCaptcha()
            setCaptchaId(data.id)
            setCaptchaImage(data.image)
            setCaptchaText('')
        } catch (err) {
            console.error('加载验证码失败:', err)
        }
    }

    useEffect(() => {
        if (!isLogin) {
            loadCaptcha()
        }
    }, [isLogin])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!username.trim() || !password.trim()) {
            setError('请填写用户名和密码')
            return
        }

        if (!isLogin) {
            if (password !== confirmPassword) {
                setError('两次输入的密码不一致')
                return
            }
            if (!captchaText.trim()) {
                setError('请输入验证码')
                return
            }
        }

        if (password.length < 6) {
            setError('密码长度不能少于6位')
            return
        }

        setLoading(true)
        try {
            if (isLogin) {
                await login(username, password)
            } else {
                await register(username, password, captchaId, captchaText)
            }
        } catch (err) {
            setError(err.message || '操作失败，请重试')
            if (!isLogin) {
                loadCaptcha()
            }
        } finally {
            setLoading(false)
        }
    }

    const toggleMode = () => {
        setIsLogin(!isLogin)
        setError('')
        setUsername('')
        setPassword('')
        setConfirmPassword('')
        setCaptchaText('')
    }

    return (
        <div className="login-editorial-shell min-h-screen w-full overflow-hidden px-4 py-6 sm:px-6 md:px-10 md:py-10 flex items-center justify-center font-sans">
            <div className="login-editorial-frame w-full max-w-[880px] min-h-[min(70vh,640px)] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] rounded-[32px] max-lg:max-w-[400px] max-lg:min-h-0 transition-all duration-500 hover:shadow-[0_40px_80px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_40px_80px_rgba(0,0,0,0.5)]">

                {/* 左侧说明区 */}
                <section className="relative hidden lg:flex flex-col justify-between px-12 py-12 border-r border-[#e2e8f0]/60 dark:border-white/5">
                    <div className="relative z-10 flex flex-col items-start">
                        <div className="flex items-center gap-3.5 mb-10">
                            <div>
                                <h1 className="text-[30px] font-extrabold leading-none tracking-[-0.05em] text-slate-800 dark:text-slate-200">
                                    <span className="text-[#4f7cff]">My</span>Note
                                </h1>
                                <div className="mt-2 h-0.5 w-12 bg-blue-500/55 rounded-full" />
                            </div>
                        </div>

                        <div className="max-w-[380px] mt-4">
                            <span className="inline-block px-3 py-1 mb-4 text-[11px] font-medium tracking-wider text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10 rounded-full border border-blue-100 dark:border-blue-500/20">
                                私有空间
                            </span>
                            <h2 className="text-[2.2rem] font-bold leading-[1.2] tracking-tight text-slate-900 dark:text-gray-50 mb-5">
                                记录重要的 <br/>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">所思所想</span>
                            </h2>
                            <p className="text-[14px] leading-relaxed text-slate-600 dark:text-slate-400 font-medium max-w-[24rem]">
                                用更专注的方式写下灵感、整理片段。数据完全私有，为你打造安全、流畅的个人笔记空间。
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10 grid grid-cols-3 gap-4 mt-12 w-full">
                        {[
                            { title: '简洁记录', desc: '毫无打扰' },
                            { title: '离线优先', desc: '随时可用' },
                            { title: '私有安全', desc: '数据归你' }
                        ].map((item, idx) => (
                            <div key={idx} className="bg-white/40 dark:bg-white/5 p-4 rounded-2xl border border-white/60 dark:border-white/10 hover:-translate-y-1 transition-transform duration-300">
                                <p className="text-[12px] font-bold text-slate-800 dark:text-slate-200">{item.title}</p>
                                <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 右侧表单区 */}
                <section className="relative flex items-center justify-center p-6 sm:p-8 lg:p-8">
                    <div className="w-full flex flex-col justify-center h-full relative z-10 max-w-[320px] mx-auto transition-all duration-300">
                        {/* 移动端 Logo */}
                        <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
                            <div>
                                <h1 className="text-[28px] font-extrabold leading-none tracking-[-0.05em] text-slate-800 dark:text-slate-200">
                                    <span className="text-[#4f7cff]">My</span>Note
                                </h1>
                            </div>
                        </div>

                        <div className="text-center lg:text-left mb-6">
                            <h2 className="text-[1.75rem] font-bold tracking-tight text-slate-900 dark:text-white transition-all">
                                {isLogin ? '欢迎回来' : '创建账号'}
                            </h2>
                            <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400 font-medium">
                                {isLogin
                                    ? '进入你的私人笔记空间，从上次停下的地方继续记录。'
                                    : '创建一个新的档案，用来保存笔记、摘录和灵感。'}
                            </p>
                        </div>

                        {error && (
                            <div className="mb-5 animate-pulse-once rounded-xl border border-red-200 bg-red-50/50 p-3 dark:border-red-900/50 dark:bg-red-900/20 backdrop-blur-md">
                                <p className="text-[13px] text-red-600 dark:text-red-400 text-center font-medium">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label htmlFor="login-username" className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                    用户名
                                </label>
                                <input
                                    id="login-username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="输入你的用户名"
                                    className="login-editorial-input"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="login-password" className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                    密码
                                </label>
                                <input
                                    id="login-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="login-editorial-input tracking-widest placeholder:tracking-normal"
                                />
                            </div>

                            <div className={`transition-all duration-300 overflow-hidden ${isLogin ? 'max-h-0 opacity-0' : 'max-h-[300px] opacity-100'}`}>
                                {!isLogin && (
                                    <div className="space-y-4 pt-4">
                                        <div className="space-y-1.5">
                                            <label htmlFor="login-confirm-password" className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 ml-1">
                                                确认密码
                                            </label>
                                            <input
                                                id="login-confirm-password"
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="login-editorial-input tracking-widest placeholder:tracking-normal"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between ml-1">
                                                <label htmlFor="login-captcha" className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                                                    验证码
                                                </label>
                                            </div>

                                            <div className="flex gap-2 h-[50px]">
                                                <input
                                                    id="login-captcha"
                                                    type="text"
                                                    value={captchaText}
                                                    onChange={(e) => setCaptchaText(e.target.value)}
                                                    placeholder="输入计算结果"
                                                    className="login-editorial-input uppercase w-full"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={loadCaptcha}
                                                    className="w-[148px] h-[50px] shrink-0 overflow-hidden rounded-xl border border-slate-200/50 bg-white/40 dark:border-white/10 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 transition-colors backdrop-blur-md cursor-pointer"
                                                    title="点击刷新"
                                                >
                                                    {captchaImage ? (
                                                        <img src={captchaImage} alt="captcha" className="h-full w-full object-contain px-2 mix-blend-multiply dark:mix-blend-screen opacity-90" />
                                                    ) : (
                                                        <div className="flex h-full items-center justify-center">
                                                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                        </div>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="login-editorial-submit min-h-[50px] w-full flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-[14px] font-bold text-white shadow-lg shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            处理中
                                        </span>
                                    ) : isLogin ? '进入笔记' : '创建账户'}
                                </button>
                            </div>
                        </form>

                        <div className="mt-8 text-center border-t border-slate-200/60 dark:border-white/10 pt-6">
                            <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">
                                {isLogin ? "还没有账号？" : "已经有账号了？"}{' '}
                                <button
                                    type="button"
                                    onClick={toggleMode}
                                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline underline-offset-4 cursor-pointer transition-all"
                                >
                                    {isLogin ? '切换到注册' : '返回登录'}
                                </button>
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
