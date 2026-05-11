import React from 'react'
import type { Metadata } from "next";
import OtpHeader from './OtpHeader';
import { SafetyCertificateOutlined } from '@ant-design/icons';


export const metadata: Metadata = {
    title: "在线令牌 · OTP",
    description: "在线 TOTP 验证码",
};

export default function IndexLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative min-h-screen flex flex-col overflow-hidden">
            {/* gradient backdrop */}
            <div
                aria-hidden
                className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute -top-32 -left-32 -z-10 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute -bottom-32 -right-32 -z-10 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl"
            />

            <nav className="sticky top-0 z-20 backdrop-blur-md bg-white/60 border-b border-white/40">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-sm">
                                <SafetyCertificateOutlined style={{ fontSize: 18 }} />
                            </div>
                            <div className="leading-tight">
                                <div className="text-[15px] font-semibold text-gray-900">OTP 在线令牌</div>
                                <div className="text-[11px] text-gray-500">Time-based One-Time Password</div>
                            </div>
                        </div>
                        <OtpHeader />
                    </div>
                </div>
            </nav>

            <main className="flex-grow w-full">
                <div className="container mx-auto px-4 py-8 md:py-12">
                    {children}
                </div>
            </main>

            <footer className="py-5 text-center text-xs text-gray-500">
                <span className="opacity-70">OTP Online © {new Date().getFullYear()} · Created by Mr.liao</span>
            </footer>
        </div>
    )
}
