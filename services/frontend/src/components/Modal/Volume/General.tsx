const General = (props: any) => {
  const { formik } = props;

  return (
    <>
      <div className="relative pb-3 flex-auto">
        <div className="grid grid-cols-6 gap-4">
          <div className="col-span-3">
            <label
              htmlFor="name"
              className="block text-xs font-medium text-gray-700"
            >
              Name
            </label>
            <div className="mt-1">
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="none"
                className="input-util"
                onChange={formik.handleChange}
                value={formik.values.name}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
export default General;
