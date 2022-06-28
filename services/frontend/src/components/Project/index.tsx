import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { IProjectPayload } from "../../types"
import { nodes, connections, position, updateProjectName } from "../../reducers"
import Spinner from "../Spinner"
import { Canvas } from "../Canvas"
import useWindowDimensions from "../../hooks/useWindowDimensions"
import { getClientNodesAndConnections } from "../../utils"
import {
  projectHttpGet,
  projectHttpUpdate,
  projectHttpCreate
} from "../../services/project"
import { checkHttpStatus } from "../../services/helpers"
import { nodeLibraries } from "../../utils/data/libraries"

interface IProjectProps {
  dispatch: any
  state: any
}

export default function Project(props: IProjectProps) {
  const { uuid } = useParams<{ uuid?: string }>()
  const { dispatch, state } = props
  const [saving, setSaving] = useState(false)
  const [projectName, setProjectName] = useState("")
  const { height, width } = useWindowDimensions()
  const navigate = useNavigate()

  const handleNameChange = (e: any) => {
    setProjectName(e.target.value)
    dispatch(updateProjectName(e.target.value))
  }

  const updateProject = (uuid: string, payload: IProjectPayload) => {
    projectHttpUpdate(uuid, JSON.stringify(payload))
      .then(checkHttpStatus)
      .then(data => {})
      .catch(err => {})
      .finally(() => {
        setSaving(false)
      })
  }

  const createProject = (payload: IProjectPayload) => {
    projectHttpCreate(JSON.stringify(payload))
      .then(checkHttpStatus)
      .then(data => {
        navigate(`/projects/${data.uuid}`)
      })
      .catch(err => {})
      .finally(() => {
        setSaving(false)
      })
  }

  const onSave = () => {
    setSaving(true)
    const payload: IProjectPayload = {
      name: state.projectName,
      data: {
        canvas: {
          position: state.canvasPosition,
          nodes: state.nodes,
          connections: state.connections
        },
        configs: [],
        networks: [],
        secrets: [],
        services: state.nodes,
        version: 3,
        volumes: []
      }
    }

    if (uuid) {
      updateProject(uuid, payload)
    } else {
      createProject(payload)
    }
  }

  const setViewHeight = () => {
    let vh = window.innerHeight * 0.01
    document.documentElement.style.setProperty("--vh", `${vh}px`)
  }

  const { data, error, isFetching } = useProject(uuid)

  useEffect(() => {
    if (!data) {
      return
    }

    const nodesAsList = Object.keys(data.canvas.nodes).map(k => data.canvas.nodes[k])

    const clientNodeItems = getClientNodesAndConnections(
      nodesAsList,
      nodeLibraries
    )

    /* TODO: Remove these dispatch calls as we migrate other components
     * to React Query.
     */
    dispatch(updateProjectName(data.name));
    dispatch(nodes(clientNodeItems));
    dispatch(connections(data.canvas.connections));
    dispatch(position(data.canvas.position));

    return { nodesAsList, clientNodeItems }
  }, [dispatch, data])

  useEffect(() => {
    if (uuid && !isFetching && data) {
      setProjectName(data.name)
    }
  }, [uuid, isFetching, data?.name])

  useEffect(() => {
    const handler = () => {
      setViewHeight()
    }

    window.addEventListener("resize", handler)
    setViewHeight()

    () => {
      window.removeEventListener("resize", handler)
    }
  }, [])

  return (
    <>
      <div className="px-4 py-3 border-b border-gray-200">
        <form
          className="flex flex-col space-y-2 md:flex-row md:justify-between items-center"
          autoComplete="off"
        >
          <input
            className={`
              bg-gray-100
              appearance-none
              w-full
              md:w-1/2
              lg:w-1/3
              block
              text-gray-700
              border
              border-gray-100
              dark:bg-gray-900
              dark:text-white
              dark:border-gray-900
              rounded
              py-2
              px-3
              leading-tight
              focus:outline-none
              focus:border-indigo-400
              focus:ring-0
            `}
            type="text"
            placeholder="Untitled"
            autoComplete="off"
            id="name"
            name="name"
            onChange={handleNameChange}
            value={projectName}
          />

          <div className="flex flex-col space-y-2 w-full justify-end mb-4  md:flex-row md:space-y-0 md:space-x-2 md:mb-0">
            <button
              onClick={() => {
                window.location.replace("/")
              }}
              type="button"
              className="btn-util text-black bg-gray-200 hover:bg-gray-300 sm:w-auto"
            >
              <div className="flex justify-center items-center space-x-2 mx-auto">
                <span>New</span>
              </div>
            </button>

            <button
              onClick={() => onSave()}
              type="button"
              className="btn-util text-white bg-green-600 hover:bg-green-700 sm:w-auto"
            >
              <div className="flex justify-center items-center space-x-2 mx-auto">
                {saving && <Spinner className="w-4 h-4 text-green-300" />}
                <span>Save</span>
              </div>
            </button>
          </div>
        </form>
      </div>

      <div className="flex flex-grow relative flex-col md:flex-row">
        <Canvas state={state} dispatch={dispatch} height={height - 64} />
      </div>
    </>
  )
}
