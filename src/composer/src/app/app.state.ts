import { Project, GlobalDialog, GlobalAppConfiguration } from './core/store/models';
export interface AppState {
  project: Project;
  globalSpinnerState: boolean;
  globalError: GlobalDialog;
  globalAppConfiguration: GlobalAppConfiguration;
}
