import TextField from "../../global/FormElements/InputField";

const General = () => {
  return (
    <>
      <TextField label="Service name" name="canvasConfig.node_name" />
      <TextField label="Container name" name="serviceConfig.container_name" />
    </>
  );
};

export default General;
