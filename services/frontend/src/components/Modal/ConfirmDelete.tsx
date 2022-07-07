import { XIcon, ExclamationIcon } from "@heroicons/react/outline";

interface IModalConfirmDeleteProps {
  onConfirm: any;
  onHide: any;
}

const ModalConfirmDelete = (props: IModalConfirmDeleteProps) => {
  const { onConfirm, onHide } = props;

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 outline-none focus:outline-none">
        <div onClick={onHide} className="opacity-25 fixed inset-0 z-40 bg-black"></div>
        <div className="relative w-auto my-6 mx-auto max-w-5xl z-50">
          <div className="border-0 rounded-lg shadow-lg relative flex flex-col w-full bg-white outline-none focus:outline-none">
            <div className="flex items-center justify-between px-4 py-3 border-b border-solid border-blueGray-200 rounded-t">
              <h3 className="text-sm font-semibold">Confirm delete</h3>
              <button
                className="p-1 ml-auto text-black float-right outline-none focus:outline-none"
                onClick={onHide}
              >
                <span className="block outline-none focus:outline-none">
                  <XIcon className="w-4" />
                </span>
              </button>
            </div>

            <div className="relative px-4 py-3 flex-auto">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <ExclamationIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <div className="mt-2">
                    <p className="text-sm dark:text-gray-100 text-gray-500">
                      Careful! This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end px-4 py-3 border-t border-solid border-blueGray-200 rounded-b">
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-3 py-1 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm"
                onClick={onHide}
              >
                Cancel
              </button>

              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-3 py-1 bg-red-600 text-sm font-medium text-white hover:bg-red-700 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => {
                  onHide()
                  onConfirm()
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModalConfirmDelete;
