import React from 'react';

interface ErrorMessageProps {
  text?: string;
}

function ErrorMessage({ text }: ErrorMessageProps): React.JSX.Element {
  return <>{text && <span className="text-sm text-red-500">{text}</span>}</>;
}

export default ErrorMessage;
