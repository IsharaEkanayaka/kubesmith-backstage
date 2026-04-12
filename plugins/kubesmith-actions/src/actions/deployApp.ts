import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { Config } from '@backstage/config';

async function getToken(baseUrl: string, username: string, password: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`kubesmith auth failed (${res.status}): ${text}`);
  }
  const data = await res.json() as { token: string };
  return data.token;
}

export function createDeployAppAction(config: Config) {
  const baseUrl = config.getString('kubesmith.baseUrl');
  const username = config.getString('kubesmith.username');
  const password = config.getString('kubesmith.password');

  return createTemplateAction({
    id: 'kubesmith:deploy',
    description: 'Deploy a Helm chart or manifest to a kubesmith cluster via AppDeployment CR',
    schema: {
      input: {
        clusterId:      z => z.string(),
        appName:        z => z.string(),
        namespace:      z => z.string(),
        deployType:     z => z.enum(['helm', 'manifest']),
        chartRepo:      z => z.string().optional(),
        chartName:      z => z.string().optional(),
        chartVersion:   z => z.string().optional(),
        valuesOverride: z => z.string().optional(),
        manifest:       z => z.string().optional(),
      },
      output: {
        dashboardUrl: z => z.string(),
        detailUrl:    z => z.string(),
      },
    },

    async handler(ctx) {
      const {
        clusterId, appName, namespace, deployType,
        chartRepo, chartName, chartVersion, valuesOverride, manifest,
      } = ctx.input;

      ctx.logger.info(`Deploying ${appName} (${deployType}) to cluster ${clusterId}/${namespace}`);

      const token = await getToken(baseUrl, username, password);

      const body: Record<string, unknown> = {
        name: appName,
        namespace,
        deploy_type: deployType,
      };

      if (deployType === 'helm') {
        body.chart_repo      = chartRepo;
        body.chart_name      = chartName;
        body.chart_version   = chartVersion ?? null;
        body.values_override = valuesOverride ?? null;
      } else {
        body.manifest = manifest;
      }

      const res = await fetch(
        `${baseUrl}/api/v1/clusters/${clusterId}/deployments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`kubesmith deploy failed (${res.status}): ${text}`);
      }

      ctx.logger.info(`AppDeployment ${appName} created successfully`);

      ctx.output('dashboardUrl', baseUrl);
      ctx.output('detailUrl',    `${baseUrl}/#deployments`);
    },
  });
}
