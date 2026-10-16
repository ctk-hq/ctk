import Records from "../../../Records";

const Volumes = () => {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Records
        name="volumes"
        title="Volumes"
        fields={(index: number) => [
          {
            name: `volumes[${index}].name`,
            placeholder: "Name",
            required: true,
            type: "text"
          },
          {
            name: `volumes[${index}].containerPath`,
            placeholder: "Container path",
            type: "text"
          },
          {
            name: `volumes[${index}].accessMode`,
            placeholder: "Access mode",
            type: "text"
          }
        ]}
        newValue={{
          name: "",
          containerPath: "",
          accessMode: ""
        }}
      />
    </div>
  );
};

export default Volumes;
