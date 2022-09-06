import { useState } from "react";
import DcLogo from "../global/dc-logo";
import K8sLogo from "../global/k8s-logo";

const styles = {
  default: {
    filter: "grayscale(100%)",
    opacity: "90%"
  },
  selected: {
    filter: "grayscale(0)",
    opacity: "100%"
  }
};

interface IManifestSelectProps {
  setManifest: any;
}

const ManifestSelect = (props: IManifestSelectProps) => {
  const { setManifest } = props;
  const [selected, setSelected] = useState(0);

  return (
    <>
      <button
        style={selected === 1 ? styles.selected : styles.default}
        type="button"
        onClick={() => {
          setManifest(1);
          setSelected(1);
        }}
      >
        <K8sLogo />
      </button>

      <button
        style={selected === 0 ? styles.selected : styles.default}
        type="button"
        onClick={() => {
          setManifest(0);
          setSelected(0);
        }}
      >
        <DcLogo />
      </button>
    </>
  );
};

export default ManifestSelect;
