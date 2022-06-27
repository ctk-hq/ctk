import { useFormik } from "formik";
import { XIcon } from "@heroicons/react/outline";
import { serviceInitialValues, formatName } from "../../../utils";


interface IModalServiceProps {
  onHide: any;
  onAddEndpoint: Function;
}

const ModalServiceCreate = (props: IModalServiceProps) => {
  const { onHide, onAddEndpoint } = props;
  const formik = useFormik({
    initialValues: {
      configuration: {
        ...serviceInitialValues(),
      },
      key: "service",
      type: "SERVICE",
      inputs: ["op_source"],
      outputs: [],
      config: {}
    },
    onSubmit: ((values, { setSubmitting }) => {

    })
  });

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 outline-none focus:outline-none">
        <div onClick={onHide} className="opacity-25 fixed inset-0 z-40 bg-black"></div>
        <div className="relative w-auto my-6 mx-auto max-w-5xl z-50">
          <div className="border-0 rounded-lg shadow-lg relative flex flex-col w-full bg-white outline-none focus:outline-none">
            <div className="flex items-center justify-between px-4 py-3 border-b border-solid border-blueGray-200 rounded-t">
              <h3 className="text-sm font-semibold">Add service</h3>
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
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3">
                  <label htmlFor="prettyName" className="block text-xs font-medium text-gray-700">Name</label>
                  <div className="mt-1">
                    <input
                      id="prettyName"
                      name="configuration.prettyName"
                      type="text"
                      autoComplete="none"
                      className="input-util"
                      onChange={formik.handleChange}
                      value={formik.values.configuration.prettyName}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-2">
                <div className="col-span-3">
                  <label htmlFor="template" className="block text-xs font-medium text-gray-700">Template</label>
                  <div className="mt-1">
                    <input
                      id="template"
                      name="configuration.template"
                      type="text"
                      autoComplete="none"
                      className="input-util"
                      onChange={formik.handleChange}
                      value={formik.values.configuration.template}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end px-4 py-3 border-t border-solid border-blueGray-200 rounded-b">
              <button
                className="btn-util"
                type="button"
                onClick={() => {
                  formik.values.configuration.name = formatName(formik.values.configuration.prettyName);
                  onAddEndpoint(formik.values);
                  formik.resetForm();
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModalServiceCreate
