import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { Config } from '@backstage/config';
import yaml from 'js-yaml';

interface AlertRule {
  name: string;
  expr: string;
  for: string;
  severity: 'info' | 'warning' | 'critical';
  summary: string;
}

async function getToken(baseUrl: string, username: string, password: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(`kubesmith auth failed (${res.status})`);
  const data = await res.json() as { token: string };
  return data.token;
}

export function createMonitorAction(config: Config) {
  const baseUrl = config.getString('kubesmith.baseUrl');
  const username = config.getString('kubesmith.username');
  const password = config.getString('kubesmith.password');

  return createTemplateAction({
    id: 'kubesmith:create-monitor',
    description: 'Create an AppMonitor CR to enable Prometheus scraping and alerts',
    schema: {
      input: {
        clusterId:        z => z.string(),
        appName:          z => z.string(),
        namespace:        z => z.string(),
        appDeploymentRef: z => z.string(),
        metricsPort:      z => z.string().optional(),
        metricsPath:      z => z.string().optional(),
        metricsInterval:  z => z.string().optional(),
        alerts:           z => z.string().optional(),
      },
      output: {},
    },

    async handler(ctx) {
      const {
        clusterId, appName, namespace, appDeploymentRef,
        metricsPort, metricsPath, metricsInterval, alerts,
      } = ctx.input;

      ctx.logger.info(`Creating AppMonitor ${appName} for deployment ${appDeploymentRef}`);

      const token = await getToken(baseUrl, username, password);

      let parsedAlerts: AlertRule[] | undefined;
      if (alerts) {
        try {
          parsedAlerts = yaml.load(alerts) as AlertRule[];
        } catch (e) {
          throw new Error(`Invalid alerts YAML: ${e}`);
        }
      }

      const body: Record<string, unknown> = {
        name: appName,
        namespace,
        app_deployment_ref: appDeploymentRef,
        metrics_enabled:  true,
        metrics_port:     metricsPort ?? null,
        metrics_path:     metricsPath ?? '/metrics',
        metrics_interval: metricsInterval ?? '30s',
        alerts:           parsedAlerts ?? null,
      };

      const res = await fetch(
        `${baseUrl}/api/v1/clusters/${clusterId}/monitors`,
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
        throw new Error(`kubesmith create-monitor failed (${res.status}): ${text}`);
      }

      ctx.logger.info(`AppMonitor ${appName} created successfully`);
    },
  });
}
