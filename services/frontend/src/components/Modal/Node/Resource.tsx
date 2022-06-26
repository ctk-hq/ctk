import React from "react";


const Resource = (props: any) => {
  const { formik } = props;

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-3">
          <label htmlFor={`resource-action`} className="block text-xs font-medium text-gray-700">Action</label>
          <div key={`resource-action`}>
            <input
              type="text"
              className="input-util"
              name={`configuration.resource.action`}
              value={formik.values.configuration.resource.action || ""}
              onChange={formik.handleChange}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-3">
          <label htmlFor={`resource-manifest`} className="block text-xs font-medium text-gray-700 mt-2">Manifest</label>
          <textarea
            id="resource-manifest"
            rows={2}
            className="input-util"
            placeholder=""
            name={`configuration.resource.manifest`}
            value={formik.values.configuration.resource.manifest || ""}
            onChange={formik.handleChange}
          ></textarea>
        </div>
      </div>
    </>
  )
}
export default Resource;