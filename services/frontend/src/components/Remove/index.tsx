import React, { SyntheticEvent } from "react";
import { TrashIcon } from "@heroicons/react/solid";


export interface ICloseProps {
  id: string;
  onClose?: (id: string, source?: string, target?: string) => any;
  source?: string;
  target?: string;
}

const Close = (props: ICloseProps) => {
  const { id, onClose, source, target } = props;
  const handleClose = (event: SyntheticEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (onClose) {
      onClose(id, source, target);
    }
  }

  return (
    <div className='absolute -top-4 left-0' onClick={handleClose} title={id || 'UNKNOWN'}>
      <TrashIcon className="w-3.5 text-gray-500" />
    </div>
  );
}

export default Close
