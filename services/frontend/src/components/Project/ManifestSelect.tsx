import { manifestTypes } from "../../constants";
import { Button } from "../ui/button";
import DcLogo from "../global/dc-logo";
import K8sLogo from "../global/k8s-logo";

type ManifestType = (typeof manifestTypes)[keyof typeof manifestTypes];

interface IManifestSelectProps {
  manifest: ManifestType;
  setManifest: (manifest: ManifestType) => void;
}

const ManifestSelect = ({ manifest, setManifest }: IManifestSelectProps) => (
  <div
    className="flex items-center rounded-lg bg-slate-800 p-1"
    role="group"
    aria-label="Manifest format"
  >
    <Button
      type="button"
      size="sm"
      variant="ghost"
      aria-pressed={manifest === manifestTypes.DOCKER_COMPOSE}
      className={
        manifest === manifestTypes.DOCKER_COMPOSE
          ? "bg-slate-700 text-white hover:bg-slate-700 hover:text-white"
          : "text-slate-400 hover:bg-slate-700 hover:text-white"
      }
      onClick={() => setManifest(manifestTypes.DOCKER_COMPOSE)}
    >
      <DcLogo />
      <span className="hidden xl:inline">Compose</span>
    </Button>

    <Button
      type="button"
      size="sm"
      variant="ghost"
      aria-pressed={manifest === manifestTypes.KUBERNETES}
      className={
        manifest === manifestTypes.KUBERNETES
          ? "bg-slate-700 text-white hover:bg-slate-700 hover:text-white"
          : "text-slate-400 hover:bg-slate-700 hover:text-white"
      }
      onClick={() => setManifest(manifestTypes.KUBERNETES)}
    >
      <K8sLogo />
      <span className="hidden xl:inline">Kubernetes</span>
    </Button>
  </div>
);

export default ManifestSelect;
