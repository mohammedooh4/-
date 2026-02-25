import React from 'react';
import Image from 'next/image';
import styles from './sparkle-button.module.css';

interface SparkleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    ariaLabel?: string;
}

export function SparkleButton({ disabled, onClick, ariaLabel, className, ...props }: SparkleButtonProps) {
    return (
        <button
            className={`${styles.button} ${className || ''}`}
            disabled={disabled}
            onClick={onClick}
            aria-label={ariaLabel}
            {...props}
        >
            <div className={styles.dots_border}></div>
            {disabled ? (
                <span className="text-[11px] md:text-[12px] font-bold text-white relative z-10">نفذ</span>
            ) : (
                <div className={`relative z-10 flex items-center justify-center p-2`}>
                    <Image
                        src="/icons/add-cart.png"
                        alt="Add to cart"
                        width={24}
                        height={24}
                        className="object-contain drop-shadow-sm opacity-90 brightness-0 invert"
                        style={{ filter: "brightness(0) invert(1)" }}
                    />
                </div>
            )}
        </button>
    );
}
