import { createBackendModule, coreServices } from '@backstage/backend-plugin-api';
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node';
import { createClusterAction } from './actions/createCluster';
import { createDeployAppAction } from './actions/deployApp';
import { createMonitorAction } from './actions/createMonitor';

export { createClusterAction } from './actions/createCluster';
export { createDeployAppAction } from './actions/deployApp';
export { createMonitorAction } from './actions/createMonitor';

export const kubesmithScaffolderActionsModule = createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'kubesmith-actions',
  register(reg) {
    reg.registerInit({
      deps: {
        scaffolder: scaffolderActionsExtensionPoint,
        config: coreServices.rootConfig,
      },
      async init({ scaffolder, config }) {
        scaffolder.addActions(
          createClusterAction(config),
          createDeployAppAction(config),
          createMonitorAction(config),
        );
      },
    });
  },
});

export default kubesmithScaffolderActionsModule;
