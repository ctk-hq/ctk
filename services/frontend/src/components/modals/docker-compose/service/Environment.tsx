import Records from "../../../Records";

const Environment = () => {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Use a reference such as <code>{"${DB_PASSWORD}"}</code> for a private
        value. Manage references and saved values with the project’s Variables
        button.
      </p>
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
