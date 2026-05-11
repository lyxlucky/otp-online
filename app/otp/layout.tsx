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
        <div className="min-h-screen flex flex-col bg-blue-50">
            <nav className="sticky top-0 z-20 bg-white/70 backdrop-blur-sm shadow-sm">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-sm">
                                <SafetyCertificateOutlined style={{ fontSize: 18 }} />
                            </div>
                            <div className="leading-tight">
                                <div className="text-[15px] font-semibold text-blue-900">OTP 在线令牌</div>
                                <div className="text-[11px] text-blue-700/70">Time-based One-Time Password</div>
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

            <footer className="py-5 text-center text-sm text-gray-600 bg-white/50 backdrop-blur-sm">
                OTP Online © {new Date().getFullYear()} Created by Mr.liao
            </footer>
        </div>
    )
}
