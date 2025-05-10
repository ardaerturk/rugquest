import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'default' | 'writeOwn';
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'default', ...props }) => {
  const baseStyle =
    'font-pixelated text-white py-3 px-6 border-2 border-white active:bg-gray-700 focus:outline-none';
  const defaultStyle = 'bg-gray-800 hover:bg-gray-700';
  const writeOwnStyle = 'bg-purple-600 hover:bg-purple-500 w-full mt-2'; // Style for "Write your own"

  const buttonStyle = `${baseStyle} ${variant === 'writeOwn' ? writeOwnStyle : defaultStyle}`;

  return (
    <button className={buttonStyle} {...props}>
      {children}
    </button>
  );
};

export default Button;
