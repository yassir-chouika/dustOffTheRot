import type { ButtonHTMLAttributes } from 'react';
import { cva } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const styles = cva('button', {
  variants: {
    variant: { primary: 'button-primary', secondary: 'button-secondary', ghost: 'button-ghost' },
    size: { default: '', icon: 'button-icon' },
  },
  defaultVariants: { variant: 'secondary', size: 'default' },
});

export function Button({
  className,
  variant = 'secondary',
  size = 'default',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'default' | 'icon';
}) {
  return <button className={twMerge(clsx(styles({ variant, size }), className))} {...props} />;
}
