import React from "react";

const DragHandle = ({ attributes, listeners, valid = true }) => {
  return (
    <div
      className="absolute right-full top-0 bottom-0 flex items-center justify-center w-6 cursor-grab rounded p-1 text-xs text-gray-300 focus:outline-none active:cursor-grabbing data-[invalid=true]:text-red-500 data-[invalid=true]:scale-125"
      data-invalid={!valid || undefined}
      {...attributes}
      {...listeners}
    >
      <i className={`fas ${valid ? "fa-grip-vertical" : "fa-warning"}`}></i>
    </div>
  );
};

export default DragHandle;
