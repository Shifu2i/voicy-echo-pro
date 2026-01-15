import React from 'react';
import { cn } from '@/lib/utils';
import { useMultiAction, MultiActionConfig } from '@/hooks/useMultiAction';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface MultiActionButtonProps extends MultiActionConfig {
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'destructive' | 'ghost';
  tooltip?: string;
  longPressTooltip?: string;
  doubleTapTooltip?: string;
  className?: string;
}

export function MultiActionButton({
  icon,
  activeIcon,
  isActive = false,
  size = 'md',
  variant = 'default',
  tooltip,
  longPressTooltip,
  doubleTapTooltip,
  className,
  disabled,
  ...multiActionConfig
}: MultiActionButtonProps) {
  const { handlers, isLongPressing, longPressProgress } = useMultiAction({
    ...multiActionConfig,
    disabled
  });
  
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };
  
  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };
  
  const variantClasses = {
    default: 'bg-muted/50 hover:bg-muted text-foreground',
    primary: 'bg-primary/10 hover:bg-primary/20 text-primary',
    destructive: 'bg-destructive/10 hover:bg-destructive/20 text-destructive',
    ghost: 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
  };
  
  // Build tooltip content
  const tooltipLines: string[] = [];
  if (tooltip) tooltipLines.push(`Tap: ${tooltip}`);
  if (longPressTooltip) tooltipLines.push(`Hold: ${longPressTooltip}`);
  if (doubleTapTooltip) tooltipLines.push(`Double-tap: ${doubleTapTooltip}`);
  const fullTooltip = tooltipLines.join('\n');
  
  const displayIcon = isActive && activeIcon ? activeIcon : icon;
  
  const button = (
    <button
      {...handlers}
      disabled={disabled}
      className={cn(
        'relative rounded-full flex items-center justify-center transition-all duration-200',
        'active:scale-95 select-none touch-none',
        sizeClasses[size],
        variantClasses[variant],
        isActive && 'ring-2 ring-primary/50',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {/* Long press progress ring */}
      {isLongPressing && longPressProgress > 0 && (
        <svg
          className="absolute inset-0 -rotate-90"
          viewBox="0 0 36 36"
        >
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={`${longPressProgress} 100`}
            className="text-primary opacity-50"
          />
        </svg>
      )}
      
      {/* Icon container */}
      <span className={cn(
        'flex items-center justify-center transition-transform duration-200',
        iconSizeClasses[size],
        isLongPressing && 'scale-90'
      )}>
        {displayIcon}
      </span>
    </button>
  );
  
  if (fullTooltip) {
    return (
      <TooltipProvider delayDuration={700}>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent 
            side="top" 
            className="whitespace-pre-line text-xs max-w-[200px]"
          >
            {fullTooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return button;
}
