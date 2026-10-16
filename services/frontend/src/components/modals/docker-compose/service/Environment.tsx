import Records from "../../../Records";

const Environment = () => {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Records
        name="environmentVariables"
        title=""
        collapsible={false}
        fields={(index: number) => [
          {
            name: `environmentVariables[${index}].key`,
            placeholder: "Key",
            required: true,
            type: "text"
          },
          {
            name: `environmentVariables[${index}].value`,
            placeholder: "Value",
            required: false,
            type: "text"
          }
        ]}
        newValue={{
          key: "",
          value: ""
        }}
      />
    </div>
  );
};

export default Environment;
