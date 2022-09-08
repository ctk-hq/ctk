import { styled } from "@mui/material";
import { useCallback, useState } from "react";
import { manifestTypes } from "../../constants";
import DcLogo from "../global/dc-logo";
import K8sLogo from "../global/k8s-logo";

interface IButtonProps {
  selected: boolean;
}

const Button = styled("button", {
  shouldForwardProp: (name) => name !== "selected"
})<IButtonProps>`
  filter: grayscale(${({ selected }) => (selected ? "0%" : "100%")});
  opacity: ${({ selected }) => (selected ? "100%" : "80%")};

  &:hover {
    filter: grayscale(0%);
  }
`;

interface IManifestSelectProps {
  setManifest: any;
}

const ManifestSelect = (props: IManifestSelectProps) => {
  const { setManifest } = props;
  const [selected, setSelected] = useState(manifestTypes.DOCKER_COMPOSE);

  const handleK8s = useCallback(() => {
    setManifest(manifestTypes.KUBERNETES);
    setSelected(manifestTypes.KUBERNETES);
  }, []);

  const handleDC = useCallback(() => {
    setManifest(manifestTypes.DOCKER_COMPOSE);
    setSelected(manifestTypes.DOCKER_COMPOSE);
  }, []);

  return (
    <>
      <Button
        selected={selected === manifestTypes.KUBERNETES}
        type="button"
        onClick={handleK8s}
      >
        <K8sLogo />
      </Button>

      <Button
        selected={selected === manifestTypes.DOCKER_COMPOSE}
        type="button"
        onClick={handleDC}
      >
        <DcLogo />
      </Button>
    </>
  );
};

export default ManifestSelect;
