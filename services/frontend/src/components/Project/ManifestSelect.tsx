import { styled } from "@mui/joy";
import { useCallback, useState } from "react";
import DcLogo from "../global/dc-logo";
import K8sLogo from "../global/k8s-logo";

interface IButtonProps {
  selected: boolean;
}

const Button = styled("button", {
  shouldForwardProp: (name) => name !== "selected"
}) <IButtonProps>`
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
  const [selected, setSelected] = useState(0);

  const handleK8s = useCallback(() => {
    setManifest(1);
    setSelected(1);
  }, []);

  const handleDC = useCallback(() => {
    setManifest(0);
    setSelected(0);
  }, []);

  return (
    <>
      <Button selected={selected === 1} type="button" onClick={handleK8s}>
        <K8sLogo />
      </Button>

      <Button selected={selected === 0} type="button" onClick={handleDC}>
        <DcLogo />
      </Button>
    </>
  );
};

export default ManifestSelect;