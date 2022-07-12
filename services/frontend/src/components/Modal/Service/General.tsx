const General = (props: any) => {
  const { formik } = props;

  return (
    <>
      <div className="relative pb-3 flex-auto">
        <div className="grid grid-cols-6 gap-4">
          <div className="col-span-3">
            <label
              htmlFor="service_name"
              className="block text-xs font-medium text-gray-700"
            >
              Service name
            </label>
            <div className="mt-1">
              <input
                id="service_name"
                name="canvasConfig.service_name"
                type="text"
                autoComplete="none"
                className="input-util"
                onChange={formik.handleChange}
                value={formik.values.canvasConfig.service_name}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="relative pb-3 flex-auto">
        <div className="grid grid-cols-6 gap-4">
          <div className="col-span-3">
            <label
              htmlFor="container_name"
              className="block text-xs font-medium text-gray-700"
            >
              Container name
            </label>
            <div className="mt-1">
              <input
                id="container_name"
                name="serviceConfig.container_name"
                type="text"
                autoComplete="none"
                className="input-util"
                onChange={formik.handleChange}
                value={formik.values.serviceConfig.container_name}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
export default General;
