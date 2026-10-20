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
            label: "Source volume or host path",
            placeholder: "Volume name or host path",
            required: false,
            type: "text"
          },
          {
            name: `volumes[${index}].containerPath`,
            placeholder: "Container path",
            label: "Container path",
            required: true,
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
