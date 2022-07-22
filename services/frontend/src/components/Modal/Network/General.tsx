import TextField from "../../global/FormElements/InputField";

const General = () => {
  return (
    <>
      <TextField label="Network name" name="canvasConfig.node_name" />
      <TextField label="Name" name="networkConfig.name" />
    </>
  );
};

export default General;
