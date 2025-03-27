'use client'

import { authenticator } from 'otplib';
import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'antd';
import { message } from 'antd';
import {
    CopyOutlined,
    CheckOutlined
} from '@ant-design/icons';
export default function CardOtpShow({ secret, title }: { secret: string, title: string }) {

    const [messageApi, contextHolder] = message.useMessage();
    const [token, setToken] = useState('');
    const [remainingTime, setRemainingTime] = useState(0);
    // 使用 useRef 存储定时器的 ID
    const intervalRef = useRef<any>(null);
    const timeoutRef = useRef<any>(null);
    // 确保 authenticator.options.step 被正确初始化
    authenticator.options = { step: 30 }; // 显式设置时间窗口为 30 秒

    // 计算剩余有效期的函数
    const calculateRemainingTime = () => {
        const step = authenticator?.options?.step; // 获取时间窗口（默认 30 秒）
        const currentTime = Math.floor(Date.now() / 1000); // 当前时间戳（秒）
        const timeCounter = Math.floor(currentTime / step); // 当前时间计数器
        const nextWindowTime = (timeCounter + 1) * step; // 下一个时间窗口的时间戳
        const remaining = nextWindowTime - currentTime; // 剩余时间（秒）
        return remaining;
    };

    // 生成 token 并启动定时任务
    const generateTokenAndScheduleRefresh = () => {
        if (secret) {
            const newToken = authenticator.generate(secret);
            setToken(newToken);

            const remaining = calculateRemainingTime();
            setRemainingTime(remaining);

            // 启动一次性定时任务，在剩余时间归零时重新生成 token
            timeoutRef.current = setTimeout(() => {
                generateTokenAndScheduleRefresh(); // 递归调用以生成新 token
            }, remaining * 1000); // 将剩余时间转换为毫秒
        }
    };

    // 在 secret 变化时生成 token 并启动定时任务
    useEffect(() => {
        generateTokenAndScheduleRefresh();

        // 启动 setInterval 每秒更新剩余时间
        intervalRef.current = setInterval(() => {
            const remaining = calculateRemainingTime();
            setRemainingTime(remaining);
        }, 1000); // 每秒更新一次

        // 清理定时任务
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [secret]);


    const [clipResult, setClipResult] = useState(false);
    const handleTextClip = () => {
        navigator.clipboard.writeText(token);
        setClipResult(true);
        messageApi.success(`已复制到剪贴板: ${token}`);
        const timer = setTimeout(() => {
            setClipResult(false);
        }, 5000);
        return () => {
            // 在组件卸载时清除定时器
            clearTimeout(timer);
        };
    }


    return (
        <>

            {contextHolder}
            {
                <div>
                    <Card title={title} bordered={false} style={{ width: 300 }}>
                        <div className="flex items-center justify-between w-full p-4">
                            <div className="flex items-center gap-4">
                                <span className="text-gray-400">验证码</span>
                                <span className="text-black text-lg font-mono">{token}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`w-8 h-8 flex items-center justify-center rounded-full 
          ${remainingTime <= 5 ? 'bg-red-500/20 text-red-500' : 'bg-eee'}`}>
                                    {remainingTime}
                                </span>


                                {clipResult ? <CheckOutlined style={{ color: 'green' }} className="w-8 h-8 flex items-center justify-center rounded-full bg-eee transition-colors" /> : <CopyOutlined onClick={handleTextClip} className="w-8 h-8 flex items-center justify-center rounded-full bg-eee transition-colors" />}
                            </div>
                        </div>
                    </Card >
                </div >
            }
        </>
    )
}
