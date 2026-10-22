import General from "./General";
import Networking from "./Networking";
import Environment from "./Environment";
import Data from "./Data";
import Build from "./Build";
import Deploy from "./Deploy";

export const tabs = [
  {
    value: "general",
    title: "General",
    component: General
  },
  { value: "networking", title: "Networking", component: Networking },
  {
    value: "environment",
    title: "Environment",
    component: Environment
  },
  {
    value: "data",
    title: "Data",
    component: Data
  },
  {
    value: "build",
    title: "Build",
    component: Build
  },
  {
    value: "deploy",
    title: "Deploy",
    component: Deploy
  }
];
