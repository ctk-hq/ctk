import TextField from "../../../global/FormElements/TextField";
import Records from "../../../Records";

const General = () => {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Entry name" name="entryName" required={true} />
      </div>

      <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Network name" name="networkName" required={true} />
      </div>

      <Records
        name="labels"
        title="Labels"
        fields={(index: number) => [
          {
            name: `labels[${index}].key`,
            placeholder: "Key",
            required: true,
            type: "text"
          },
          {
            name: `labels[${index}].value`,
            placeholder: "Value",
            required: false,
            type: "text"
          }
        ]}
        newValue={{ key: "", value: "" }}
      />
    </div>
  );
};

export default General;
