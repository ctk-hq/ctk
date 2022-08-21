import { styled } from "@mui/joy";
import { XIcon } from "@heroicons/react/outline";
import { CallbackFunction } from "../../../types";
import { useNavigate } from "react-router-dom";

interface IModalNewProjectProps {
  onHide: CallbackFunction;
}

const FormContainer = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
`;

const ModalNewProject = (props: IModalNewProjectProps) => {
  const { onHide } = props;
  const navigate = useNavigate();

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 outline-none focus:outline-none">
        <div
          onClick={onHide}
          className="opacity-25 fixed inset-0 z-40 bg-black"
        ></div>
        <div className="relative w-auto my-6 mx-auto max-w-5xl z-50">
          <div className="border-0 rounded-lg shadow-lg relative flex flex-col w-full bg-white outline-none focus:outline-none">
            <div className="flex items-center justify-between px-4 py-3 border-b border-solid border-blueGray-200 rounded-t">
              <h3 className="text-sm font-semibold">Project type</h3>
              <button
                className="p-1 ml-auto text-black float-right outline-none focus:outline-none"
                onClick={onHide}
              >
                <span className="block outline-none focus:outline-none">
                  <XIcon className="w-4" />
                </span>
              </button>
            </div>

            <FormContainer>
              <button
                onClick={() => {
                  navigate("/projects/docker-compose/new/");
                  onHide();
                }}
                className="btn-util text-white text-center bg-blue-600 hover:bg-blue-700 sm:w-auto"
              >
                <span className="flex space-x-1 items-center">
                  <span>Docker Compose</span>
                </span>
              </button>

              <button
                onClick={() => {
                  navigate("/projects/kubernetes/new/");
                  onHide();
                }}
                className="btn-util text-white text-center bg-blue-600 hover:bg-blue-700 sm:w-auto"
              >
                Kubernetes
              </button>
            </FormContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalNewProject;
