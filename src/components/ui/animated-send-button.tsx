"use client";

import React from "react";
import styles from "./animated-send-button.module.css";
import { Loader2 } from "lucide-react";

interface AnimatedSendButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
}

export function AnimatedSendButton({ isLoading, disabled, className, onClick, ...props }: AnimatedSendButtonProps) {
    // Use a class "isSending" to trigger and hold the animation when isLoading is true
    const buttonStateClass = isLoading ? styles.isSending : "";
    const isDisabled = disabled || isLoading;

    return (
        <button
            className={`${styles.animatedButton} ${buttonStateClass} ${className || ""}`}
            disabled={isDisabled}
            onClick={onClick}
            {...props}
        >
            <div className={styles.outline}></div>
            <div className={`${styles.state} ${styles.stateDefault}`}>
                <div className={styles.icon}>
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        // Flipped plane horizontally for RTL (sending leftwards)
                        style={{ transform: "scaleX(-1)" }}
                    >
                        <path
                            d="M22 2L11 13"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <path
                            d="M22 2L15 22L11 13L2 9L22 2Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
                <p className="flex gap-1.5 font-bold">
                    <span style={{ "--i": 0 } as React.CSSProperties}>إتمام</span>
                    <span style={{ "--i": 1 } as React.CSSProperties}>الطلب</span>
                </p>
            </div>
            <div className={`${styles.state} ${styles.stateSent}`}>
                <div className={styles.icon}>
                    {isLoading ? (
                        <Loader2 className="animate-spin" width="24" height="24" />
                    ) : (
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M20 6L9 17L4 12"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    )}
                </div>
                <p className="flex gap-1.5 font-bold text-primary">
                    {isLoading ? (
                        <>
                            <span style={{ "--i": 5 } as React.CSSProperties}>جاري</span>
                            <span style={{ "--i": 6 } as React.CSSProperties}>الإرسال...</span>
                        </>
                    ) : (
                        <>
                            <span style={{ "--i": 5 } as React.CSSProperties}>تم</span>
                            <span style={{ "--i": 6 } as React.CSSProperties}>الإرسال</span>
                        </>
                    )}
                </p>
            </div >
        </button >
    );
}
