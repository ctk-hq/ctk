import React from "react";


const General = (props: any) => {
  const { formik } = props;

  return (
    <>
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
        <label htmlFor="about" className="block text-xs font-medium text-gray-700">Description</label>
        <div className="mt-1">
          <textarea
            id="description"
            name="configuration.description"
            onChange={formik.handleChange}
            value={formik.values.configuration.description}
            rows={2}
            className="input-util"
            placeholder=""
          ></textarea>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-2">
        <div className="col-span-3">
          <label htmlFor="templateType" className="block text-xs font-medium text-gray-700">Type</label>
          <div className="mt-1">
            <select
              id="templateType"
              name="configuration.type"
              className="max-w-lg block focus:ring-indigo-500 focus:border-indigo-500 w-full shadow-sm sm:max-w-xs sm:text-sm border-gray-300 rounded-md"
              value={formik.values.configuration.type}
              onChange={formik.handleChange}
            >
              <option value="">Select type</option>
              <option value="container">Container</option>
              <option value="resource">Resource</option>
            </select>
          </div>
        </div>
      </div>
    </>
  )
}
export default General;