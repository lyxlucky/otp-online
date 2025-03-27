import React from 'react'
import type { Metadata } from "next";


export const metadata: Metadata = {
    title: "验证码主页",
    description: "验证码主页",
};

export default function IndexLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <div className="min-h-screen flex flex-col bg-blue-50">
                <nav className="bg-white/70 backdrop-blur-sm shadow-sm">
                    <div className="container mx-auto px-4 py-2">
                        <div className="flex items-center justify-between">
                            <div className="w-48 bg-blue-100 h-10 rounded-md flex items-center justify-center text-blue-800">
                                OTP管理系统
                            </div>
                        </div>
                    </div>
                </nav>

                <main className="flex-grow flex items-center justify-center p-4">
                    <div className="w-full max-w-7xl">
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-8 overflow-hidden">
                            <div className="flex flex-wrap gap-6 justify-center items-center">
                                {React.Children.map(children, (child) => (
                                    <div className="flex-none w-full sm:w-[calc(50%-1.5rem)] md:w-[calc(33.333%-1.5rem)] lg:w-[calc(25%-1.5rem)] bg-blue-50/50 rounded-lg p-6 border border-blue-100 overflow-hidden flex items-center justify-center">
                                        {child}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </main>

                <footer className="py-4 text-center text-sm text-gray-600 bg-white/50 backdrop-blur-sm">
                    OTP Online © {new Date().getFullYear()} Created by Mr.liao
                </footer>
            </div>
        </>
    )
}
