import React from "react";

const IconCard = ({ bgColor, icon, title, subtitle, date, action }) => {
  return (
    <div
      onClick={() => action()}
      className="
        flex flex-col items-center w-full cursor-pointer group
        transform transition-transform duration-200
        hover:scale-105
      "
    >
      {/* Icon Box */}
      <div
        className={`w-24 h-24 rounded-xl flex items-center justify-center text-white 
          shadow-md ${bgColor} clip-corner`}
      >
        {icon}
      </div>

      {/* Text */}
      <p className="mt-2 font-semibold text-sm text-gray-900 group-hover:text-gray-700">
        {title}
      </p>
      <p className="text-xs text-gray-500">{subtitle}</p>
      <p className="text-xs text-gray-500">{date}</p>
    </div>
  );
};


export default IconCard;
