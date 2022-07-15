import TextField from "../../global/FormElements/InputField";

const General = () => {
  return (
    <>
      <TextField label="Service name" name="canvasConfig.service_name" />
      <TextField label="Container name" name="serviceConfig.container_name" />
    </>
  );
};

export default General;
