import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  type?: 'spinner' | 'dots' | 'pulse' | 'bars';
  color?: 'primary' | 'white' | 'gray';
  text?: string;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  type = 'spinner',
  color = 'primary',
  text,
  fullScreen = false
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colorClasses = {
    primary: 'text-primary-600',
    white: 'text-white',
    gray: 'text-slate-600'
  };

  const SpinnerIcon = () => (
    <div className={`animate-spin rounded-full border-2 border-current border-t-transparent ${sizeClasses[size]} ${colorClasses[color]}`} />
  );

  const DotsIcon = () => (
    <div className={`flex space-x-1 ${sizeClasses[size]}`}>
      <div className={`w-2 h-2 bg-current rounded-full animate-bounce ${colorClasses[color]}`} style={{ animationDelay: '0ms' }} />
      <div className={`w-2 h-2 bg-current rounded-full animate-bounce ${colorClasses[color]}`} style={{ animationDelay: '150ms' }} />
      <div className={`w-2 h-2 bg-current rounded-full animate-bounce ${colorClasses[color]}`} style={{ animationDelay: '300ms' }} />
    </div>
  );

  const PulseIcon = () => (
    <div className={`animate-pulse rounded-full bg-current ${sizeClasses[size]} ${colorClasses[color]}`} />
  );

  const BarsIcon = () => (
    <div className={`flex space-x-1 ${sizeClasses[size]}`}>
      <div className={`w-1 bg-current animate-pulse ${colorClasses[color]}`} style={{ animationDelay: '0ms' }} />
      <div className={`w-1 bg-current animate-pulse ${colorClasses[color]}`} style={{ animationDelay: '150ms' }} />
      <div className={`w-1 bg-current animate-pulse ${colorClasses[color]}`} style={{ animationDelay: '300ms' }} />
    </div>
  );

  const renderIcon = () => {
    switch (type) {
      case 'dots':
        return <DotsIcon />;
      case 'pulse':
        return <PulseIcon />;
      case 'bars':
        return <BarsIcon />;
      default:
        return <SpinnerIcon />;
    }
  };

  const content = (
    <div className="flex flex-col items-center justify-center space-y-4">
      {renderIcon()}
      {text && (
        <p className={`text-sm font-medium ${color === 'white' ? 'text-white' : 'text-slate-600'}`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;
