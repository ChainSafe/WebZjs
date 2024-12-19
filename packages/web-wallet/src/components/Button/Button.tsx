type ButtonProps = {
  onClick: () => void;
  label: string;
};

function Button({ onClick, label }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className="min-w-[228px] px-6 py-3 bg-[#0e0e0e] rounded-3xl text-white text-base font-medium leading-normal
      cursor-pointer hover:bg-buttonBlackGradientHover"
    >
      {label}
    </button>
  );
}

export default Button;
