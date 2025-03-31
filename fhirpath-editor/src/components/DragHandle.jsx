import {
  ArrowsVertical,
  DotsSixVertical,
  Warning,
} from "@phosphor-icons/react";
import React from "react";

const DragHandle = ({
  attributes,
  listeners,
  valid = true,
  active = false,
}) => {
  return (
    <div
      className="absolute right-full top-1/2 -translate-y-1/2 flex items-center justify-center cursor-grab rounded mr-1 py-1 text-gray-400 focus:outline-blue-500 focus:text-gray-500 active:cursor-grabbing data-[active]:text-blue-500 data-[invalid]:text-red-500 data-[invalid=true]:scale-125"
      data-active={active || undefined}
      data-invalid={!valid || undefined}
      {...attributes}
      {...listeners}
    >
      {!valid ? (
        <Warning
          size={16}
          className="animate__animated animate__fadeInLeft animate__faster"
        />
      ) : active ? (
        <ArrowsVertical size={16} weight="fill" />
      ) : (
        <DotsSixVertical size={16} weight="bold" />
      )}
    </div>
  );
};

export default DragHandle;
