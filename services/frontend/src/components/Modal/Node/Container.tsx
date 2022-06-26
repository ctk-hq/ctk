const Container = (props: any) => {
  const { formik } = props;

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-3">
          <label htmlFor={`container-name`} className="block text-xs font-medium text-gray-700">Name</label>
          <div key={`container-name`}>
            <input
              type="text"
              className="input-util"
              name={`configuration.container.name`}
              value={formik.values.configuration.container.name || ""}
              onChange={formik.handleChange}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-3">
          <label htmlFor={`container-image`} className="block text-xs font-medium text-gray-700 mt-2">Image</label>
          <div key={`container-image`}>
            <input
              type="text"
              className="input-util"
              name={`configuration.container.image`}
              value={formik.values.configuration.container.image || ""}
              onChange={formik.handleChange}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-3">
          <label htmlFor={`container-pull-policy`} className="block text-xs font-medium text-gray-700 mt-2">Pull policy</label>
          <div key={`container-pull-policy`}>
            <input
              type="text"
              className="input-util"
              name={`configuration.container.imagePullPolicy`}
              value={formik.values.configuration.container.imagePullPolicy || ""}
              onChange={formik.handleChange}
            />
          </div>
        </div>
      </div>
    </>
  )
}

export default Container;
