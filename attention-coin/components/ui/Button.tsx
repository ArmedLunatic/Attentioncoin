'use client';

import { forwardRef, ButtonHTMLAttributes, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  success?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const variants = {
  primary: 'bg-foreground text-background hover:bg-foreground-muted',
  secondary: 'bg-surface border border-border text-foreground-muted hover:border-border-light hover:text-foreground',
  ghost: 'text-muted hover:text-foreground hover:bg-surface',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      success = false,
      icon,
      iconPosition = 'right',
      fullWidth = false,
      disabled,
      className = '',
      onClick,
      ...props
    },
    ref
  ) => {
    const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) return;

      // Ripple effect
      const rect = e.currentTarget.getBoundingClientRect();
      setRipple({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setTimeout(() => setRipple(null), 600);

      onClick?.(e);
    };

    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        className={`
          relative overflow-hidden font-semibold rounded-lg
          transition-all duration-200 ease-out
          inline-flex items-center justify-center
          ${variants[variant]}
          ${sizes[size]}
          ${fullWidth ? 'w-full' : ''}
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${className}
        `}
        disabled={isDisabled}
        onClick={handleClick}
        whileTap={isDisabled ? {} : { scale: 0.98 }}
        {...props}
      >
        {/* Ripple effect */}
        <AnimatePresence>
          {ripple && (
            <motion.span
              className="absolute rounded-full bg-white/30 pointer-events-none"
              style={{ left: ripple.x, top: ripple.y }}
              initial={{ width: 0, height: 0, x: 0, y: 0, opacity: 0.5 }}
              animate={{ width: 300, height: 300, x: -150, y: -150, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            />
          )}
        </AnimatePresence>

        {/* Content */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.span
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading...</span>
            </motion.span>
          ) : success ? (
            <motion.span
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Success!</span>
            </motion.span>
          ) : (
            <motion.span
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              {icon && iconPosition === 'left' && icon}
              {children}
              {icon && iconPosition === 'right' && icon}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

// Premium button for special CTAs
export function GlowButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <motion.button
      className={`
        relative px-6 py-3 font-medium text-background rounded-lg
        bg-foreground overflow-hidden
        transition-all duration-200
        hover:bg-foreground-muted
        ${className}
      `}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}

// Icon button
export function IconButton({
  children,
  className = '',
  variant = 'ghost',
  size = 'md',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'ghost' | 'filled';
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const variantClasses = {
    ghost: 'text-muted hover:text-white hover:bg-surface-light',
    filled: 'bg-surface-light text-muted hover:text-white hover:bg-border',
  };

  return (
    <motion.button
      className={`
        rounded-lg transition-colors
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
