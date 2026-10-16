import { manifestTypes } from "../../constants";
import { SegmentedControl } from "../ui/segmented-control";
import DcLogo from "../global/dc-logo";
import K8sLogo from "../global/k8s-logo";

type ManifestType = (typeof manifestTypes)[keyof typeof manifestTypes];

interface IManifestSelectProps {
  manifest: ManifestType;
  setManifest: (manifest: ManifestType) => void;
}

const ManifestSelect = ({ manifest, setManifest }: IManifestSelectProps) => (
  <SegmentedControl
    aria-label="Manifest format"
    value={manifest}
    onValueChange={setManifest}
    options={[
      {
        value: manifestTypes.DOCKER_COMPOSE,
        label: "Compose",
        content: (
          <>
            <DcLogo />
            <span className="hidden xl:inline">Compose</span>
          </>
        )
      },
      {
        value: manifestTypes.KUBERNETES,
        label: "Kubernetes",
        content: (
          <>
            <K8sLogo />
            <span className="hidden xl:inline">Kubernetes</span>
          </>
        )
      }
    ]}
  />
);

export default ManifestSelect;
